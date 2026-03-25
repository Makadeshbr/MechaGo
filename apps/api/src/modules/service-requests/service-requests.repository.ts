import { db } from "@/db";
import { serviceRequests } from "@/db/schema/service-requests";
import { roadwayInfo } from "@/db/schema/roadway-info";
import { users } from "@/db/schema/users";
import { professionals } from "@/db/schema/professionals";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type SelectServiceRequest = InferSelectModel<typeof serviceRequests>;
export type InsertServiceRequest = InferInsertModel<typeof serviceRequests>;
export type Roadway = InferSelectModel<typeof roadwayInfo>;

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
  static async findById(id: string) {
    const request = await db.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, id),
    });

    if (!request) return null;

    if (!request.professionalId) {
      return { ...request, professional: null };
    }

    const professionalData = await db
      .select({
        name: users.name,
        avatarUrl: users.avatarUrl,
        rating: users.rating,
        specialties: professionals.specialties,
      })
      .from(professionals)
      .join(users, eq(professionals.userId, users.id))
      .where(eq(professionals.id, request.professionalId))
      .limit(1);

    return {
      ...request,
      professional: professionalData[0] || null,
    };
  }

  /**
   * Atualiza um pedido existente
   */
  static async update(
    id: string,
    data: Partial<InsertServiceRequest>
  ): Promise<SelectServiceRequest> {
    const [request] = await db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
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
}
