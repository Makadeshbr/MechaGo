import { db } from "@/db";
import { queueEntries } from "@/db/schema/queue-entries";
import { serviceRequests } from "@/db/schema/service-requests";
import { roadwayInfo } from "@/db/schema/roadway-info";
import { users } from "@/db/schema/users";
import { professionals } from "@/db/schema/professionals";
import { eq, sql, and, isNull, count, desc, asc } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type SelectServiceRequest = InferSelectModel<typeof serviceRequests>;
export type InsertServiceRequest = InferInsertModel<typeof serviceRequests>;
export type Roadway = InferSelectModel<typeof roadwayInfo>;
export interface ServiceRequestProfessionalSummary {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  rating: string | null;
  specialties: string[];
  latitude: string | null;
  longitude: string | null;
}

export interface ServiceRequestDetails extends SelectServiceRequest {
  professional: ServiceRequestProfessionalSummary | null;
}

export interface CoordinateDistanceResult {
  distanceMeters: number;
}

export interface WaitingQueueSnapshot {
  position: number;
  estimatedWaitMinutes: number | null;
}

export class ServiceRequestsRepository {
  /**
   * Cria um novo pedido de socorro
   */
  static async create(data: InsertServiceRequest): Promise<SelectServiceRequest> {
    const [request] = await db.insert(serviceRequests).values(data).returning();
    return request;
  }

  /**
   * Busca um pedido pelo ID com dados do profissional
   */
  static async findById(id: string): Promise<ServiceRequestDetails | null> {
    const request = await db.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, id),
    });

    if (!request) return null;

    if (!request.professionalId) {
      return { ...request, professional: null };
    }

    const professionalData = await db
      .select({
        id: professionals.id,
        userId: professionals.userId,
        name: users.name,
        avatarUrl: users.avatarUrl,
        rating: users.rating,
        specialties: professionals.specialties,
        latitude: professionals.latitude,
        longitude: professionals.longitude,
      })
      .from(professionals)
      .innerJoin(users, eq(professionals.userId, users.id))
      .where(eq(professionals.id, request.professionalId))
      .limit(1);

    return {
      ...request,
      professional: professionalData[0] || null,
    };
  }

  /**
   * Atualiza um pedido existente com condição opcional de status (Controle de Concorrência)
   */
  static async update(
    id: string,
    data: Partial<InsertServiceRequest>,
    whereStatus?: SelectServiceRequest["status"]
  ): Promise<SelectServiceRequest | null> {
    const whereCondition = whereStatus
      ? and(eq(serviceRequests.id, id), eq(serviceRequests.status, whereStatus))
      : eq(serviceRequests.id, id);

    const [request] = await db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(whereCondition)
      .returning();
    
    return request || null;
  }

  /**
   * Geofencing: Verifica se a coordenada está em uma rodovia
   * No MVP, usamos o bounding box da tabela roadway_info.
   * Se houver polígonos reais, a query ST_Contains seria ideal.
   */
  static async findRoadwayByCoords(
    lat: number,
    lng: number
  ): Promise<Roadway | null> {
    // Considera o ponto dentro da area da rodovia OU ate 500m do bounding box.
    const [roadway] = await db
      .select()
      .from(roadwayInfo)
      .where(
        sql`
          ST_DWithin(
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ST_SetSRID(
              ST_MakePoint(
                LEAST(GREATEST(${lng}, bounds_min_lng), bounds_max_lng),
                LEAST(GREATEST(${lat}, bounds_min_lat), bounds_max_lat)
              ),
              4326
            )::geography,
            500
          )
        `
      )
      .orderBy(
        sql`
          ST_Distance(
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ST_SetSRID(
              ST_MakePoint(
                LEAST(GREATEST(${lng}, bounds_min_lng), bounds_max_lng),
                LEAST(GREATEST(${lat}, bounds_min_lat), bounds_max_lat)
              ),
              4326
            )::geography
          )
        `,
      )
      .limit(1);

    return roadway || null;
  }

  /**
   * Busca requests por status — usado para re-matching quando um profissional fica online
   */
  static async findByStatus(status: SelectServiceRequest["status"]): Promise<SelectServiceRequest[]> {
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.status, status));
  }

  /**
   * Histórico de atendimentos concluídos de um profissional.
   * Retorna ordenado do mais recente para o mais antigo, com o nome do cliente.
   */
  static async findCompletedByProfessionalId(professionalId: string): Promise<(SelectServiceRequest & { clientName: string })[]> {
    const results = await db
      .select({
        request: serviceRequests,
        clientName: users.name,
      })
      .from(serviceRequests)
      .innerJoin(users, eq(serviceRequests.clientId, users.id))
      .where(
        and(
          eq(serviceRequests.professionalId, professionalId),
          eq(serviceRequests.status, "completed"),
        ),
      )
      .orderBy(desc(serviceRequests.completedAt));

    return results.map((r) => ({
      ...r.request,
      clientName: r.clientName,
    }));
  }

  static async findHistoryByClientId(clientId: string): Promise<
    (SelectServiceRequest & { professionalName: string | null })[]
  > {
    const results = await db
      .select({
        request: serviceRequests,
        professionalName: users.name,
      })
      .from(serviceRequests)
      .leftJoin(professionals, eq(serviceRequests.professionalId, professionals.id))
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(eq(serviceRequests.clientId, clientId))
      .orderBy(desc(serviceRequests.createdAt));

    return results.map((row) => ({
      ...row.request,
      professionalName: row.professionalName ?? null,
    }));
  }

  /**
   * Busca o chamado ativo (em andamento) de um usuário (cliente ou profissional).
   * Considera status não finalizados e 'completed' sem avaliação do solicitante.
   */
  static async findActiveByUserId(
    userId: string,
    role: "client" | "professional",
  ): Promise<SelectServiceRequest | null> {
    const activeStatuses = [
      "pending",
      "matching",
      "waiting_queue",
      "accepted",
      "professional_enroute",
      "professional_arrived",
      "diagnosing",
      "resolved",
      "tow_requested",
      "escalated",
      "completed", // Incluímos completed para checar se já foi avaliado
    ];

    let whereClause;
    if (role === "client") {
      whereClause = and(
        eq(serviceRequests.clientId, userId),
        sql`${serviceRequests.status} IN ${activeStatuses}`,
      );
    } else {
      // Para profissional, buscamos primeiro o registro de profissional dele
      const [prof] = await db
        .select({ id: professionals.id })
        .from(professionals)
        .where(eq(professionals.userId, userId))
        .limit(1);

      if (!prof) return null;

      whereClause = and(
        eq(serviceRequests.professionalId, prof.id),
        sql`${serviceRequests.status} IN ${activeStatuses}`,
      );
    }

    // Busca o chamado mais recente que se encaixa no status
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(whereClause)
      .orderBy(sql`${serviceRequests.createdAt} DESC`)
      .limit(1);

    return request ?? null;
  }

  static async calculateDistanceToRequest(params: {
    requestId: string;
    latitude: number;
    longitude: number;
  }): Promise<CoordinateDistanceResult | null> {
    const result = await db.execute(sql`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(sr.client_longitude, sr.client_latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${params.longitude}, ${params.latitude}), 4326)::geography
      ) AS distance_meters
      FROM service_requests sr
      WHERE sr.id = ${params.requestId}
      LIMIT 1
    `);

    const row = result[0] as { distance_meters: number | string } | undefined;
    if (!row) {
      return null;
    }

    return {
      distanceMeters: Number(row.distance_meters),
    };
  }

  static async getWaitingQueueSnapshot(
    serviceRequestId: string,
  ): Promise<WaitingQueueSnapshot | null> {
    const [entry] = await db
      .select({
        position: queueEntries.position,
        estimatedWaitMinutes: queueEntries.estimatedWaitMinutes,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.serviceRequestId, serviceRequestId),
          isNull(queueEntries.resolvedAt),
        ),
      )
      .orderBy(asc(queueEntries.position))
      .limit(1);

    return entry
      ? {
          position: entry.position,
          estimatedWaitMinutes: entry.estimatedWaitMinutes ?? null,
        }
      : null;
  }

  static async ensureWaitingQueueEntry(
    serviceRequestId: string,
  ): Promise<WaitingQueueSnapshot> {
    const existing = await this.getWaitingQueueSnapshot(serviceRequestId);
    if (existing) {
      return existing;
    }

    const [aggregate] = await db
      .select({ total: count(queueEntries.id) })
      .from(queueEntries)
      .where(isNull(queueEntries.resolvedAt));

    const nextPosition = Number(aggregate?.total ?? 0) + 1;
    const estimatedWaitMinutes = Math.max(10, nextPosition * 8);

    const [entry] = await db
      .insert(queueEntries)
      .values({
        serviceRequestId,
        position: nextPosition,
        estimatedWaitMinutes,
      })
      .returning({
        position: queueEntries.position,
        estimatedWaitMinutes: queueEntries.estimatedWaitMinutes,
      });

    return {
      position: entry.position,
      estimatedWaitMinutes: entry.estimatedWaitMinutes ?? null,
    };
  }

  static async resolveWaitingQueueEntry(serviceRequestId: string): Promise<void> {
    await db
      .update(queueEntries)
      .set({ resolvedAt: new Date() })
      .where(
        and(
          eq(queueEntries.serviceRequestId, serviceRequestId),
          isNull(queueEntries.resolvedAt),
        ),
      );
  }
}
