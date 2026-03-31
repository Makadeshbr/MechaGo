import { db } from "@/db";
import { serviceRequests } from "@/db/schema/service-requests";
import { roadwayInfo } from "@/db/schema/roadway-info";
import { users } from "@/db/schema/users";
import { professionals } from "@/db/schema/professionals";
import { eq, sql, and } from "drizzle-orm";
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
  roadwayPhone?: string | null;
  professional: ServiceRequestProfessionalSummary | null;
}

export interface CoordinateDistanceResult {
  distanceMeters: number;
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
    // Busca rodovia cujo bounding box contém o ponto
    const [roadway] = await db
      .select()
      .from(roadwayInfo)
      .where(
        sql`
          ${lat} >= bounds_min_lat AND 
          ${lat} <= bounds_max_lat AND 
          ${lng} >= bounds_min_lng AND 
          ${lng} <= bounds_max_lng
        `
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
   * Retorna ordenado do mais recente para o mais antigo.
   */
  static async findCompletedByProfessionalId(professionalId: string): Promise<SelectServiceRequest[]> {
    const { desc } = await import("drizzle-orm");
    return db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.professionalId, professionalId),
          eq(serviceRequests.status, "completed"),
        ),
      )
      .orderBy(desc(serviceRequests.completedAt));
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
}
