import { db } from "@/db";
import { sql } from "drizzle-orm";
import { AppError } from "@/utils/errors";
import { logger } from "@/middleware/logger.middleware";
import { MATCHING_RADIUS } from "@mechago/shared";
import { ServiceRequestsRepository } from "../service-requests/service-requests.repository";
import { ProfessionalsRepository } from "../professionals/professionals.repository";
import { VehiclesRepository } from "../vehicles/vehicles.repository";

interface NearbyProfessionalRow {
  id: string;
  user_id: string;
  name: string;
  rating: string | null;
  distance_meters: number;
  [key: string]: unknown;
}

interface MatchingRequestNotificationPayload {
  id: string;
  problemType: string;
  estimatedPrice: string | null;
  clientLatitude: string;
  clientLongitude: string;
  createdAt: Date;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    type: string;
  };
}

export interface FindProfessionalsInput {
  lat: number;
  lng: number;
  radiusMeters: number;
  vehicleType: string;
}

export class MatchingService {
  static async findNearbyProfessionals({ lat, lng, radiusMeters, vehicleType }: FindProfessionalsInput): Promise<NearbyProfessionalRow[]> {
    // Retorna profissionais no raio, do tipo de veiculo correto, online
    const result = await db.execute(sql`
      SELECT p.id, p.user_id, u.name, u.rating,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_meters
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_online = true
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
        AND ${vehicleType} = ANY(p.vehicle_types_served)
      ORDER BY u.rating DESC, distance_meters ASC
      LIMIT 10
    `);

    // Drizzle execute retorna rows genéricos; mapeamos para o tipo esperado
    const rows = (Array.isArray(result) ? result : []) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name),
      rating: row.rating != null ? String(row.rating) : null,
      distance_meters: Number(row.distance_meters),
    })) satisfies NearbyProfessionalRow[];
  }

  private static buildRequestNotificationPayload(params: {
    request: Awaited<ReturnType<typeof ServiceRequestsRepository.findById>>;
    vehicle: Awaited<ReturnType<typeof VehiclesRepository.findById>>;
  }): MatchingRequestNotificationPayload {
    const { request, vehicle } = params;

    if (!request || !vehicle) {
      throw new AppError("INVALID_MATCHING_CONTEXT", "Contexto de matching inválido", 500);
    }

    return {
      id: request.id,
      problemType: request.problemType,
      estimatedPrice: request.estimatedPrice,
      clientLatitude: request.clientLatitude,
      clientLongitude: request.clientLongitude,
      createdAt: request.createdAt,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        type: vehicle.type,
      },
    };
  }

  /**
   * Retorna "notified" se profissionais foram encontrados e notificados,
   * "waiting" se nenhum foi encontrado, ou "skipped" se o request não é elegível.
   */
  static async processMatchingJob(requestId: string): Promise<"notified" | "waiting" | "skipped"> {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request || !request.vehicleId) {
      logger.warn({ requestId }, "Matching job skipped: request not found or missing vehicleId");
      return "skipped";
    }

    if (request.status !== "matching") {
      logger.info({ requestId, status: request.status }, "Matching job skipped: status is not matching");
      return "skipped";
    }

    const vehicle = await VehiclesRepository.findById(request.vehicleId);
    if (!vehicle) {
      logger.warn({ requestId, vehicleId: request.vehicleId }, "Matching job skipped: vehicle not found");
      return "skipped";
    }

    const professionals = await this.findNearbyProfessionals({
      lat: Number(request.clientLatitude),
      lng: Number(request.clientLongitude),
      radiusMeters: request.context === "highway" ? MATCHING_RADIUS.HIGHWAY : MATCHING_RADIUS.URBAN,
      vehicleType: vehicle.type,
    });

    if (professionals.length === 0) {
      await ServiceRequestsRepository.update(requestId, { status: "waiting_queue" });
      logger.info({ requestId }, "No professionals found, moved to waiting_queue");
      return "waiting";
    }

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyProfessionals(
      professionals,
      this.buildRequestNotificationPayload({ request, vehicle }),
    );

    logger.info({ requestId, count: professionals.length }, "Professionals notified via matching job");
    return "notified";
  }

  static async markAsWaiting(requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request || request.status !== "matching") return;
    
    // Ninguem aceitou no prazo
    return ServiceRequestsRepository.update(requestId, { status: "waiting_queue" });
  }

  static async acceptRequest(professionalUserId: string, requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Chamado não encontrado", 404);
    
    if (request.status !== "matching") {
      throw new AppError("INVALID_STATUS", "Chamado já foi aceito", 409);
    }

    const professional = await ProfessionalsRepository.findByUserId(professionalUserId);
    if (!professional) {
        throw new AppError("NOT_FOUND", "Profissional não encontrado", 404);
    }
    
    if (!professional.isOnline) {
      throw new AppError("OFFLINE", "Você está offline", 400);
    }

    const vehicle = await VehiclesRepository.findById(request.vehicleId);
    if (!vehicle) {
        throw new AppError("NOT_FOUND", "Veículo não encontrado", 404);
    }

    // Valida compatibilidade de tipo de veículo entre profissional e chamado
    const typesServed = Array.isArray(professional.vehicleTypesServed)
      ? professional.vehicleTypesServed
      : [];

    if (!typesServed.includes(vehicle.type)) {
      throw new AppError(
        "INCOMPATIBLE",
        "Você não atende este tipo de veículo",
        400,
      );
    }

    const updatedRequest = await ServiceRequestsRepository.update(
      requestId,
      {
        professionalId: professional.id,
        status: "accepted",
        matchedAt: new Date(),
      },
      "matching" // Garante que so atualiza se ainda estiver em matching (Atomicidade)
    );

    if (!updatedRequest) {
      throw new AppError("ALREADY_ACCEPTED", "Este chamado já foi aceito por outro profissional", 409);
    }

    const refreshedRequest = await ServiceRequestsRepository.findById(requestId);
    const { NotificationsService } = await import("../notifications/notifications.service");

    // Notifica o Cliente que o profissional aceitou
    await NotificationsService.notifyClientStatusUpdate(requestId, "accepted", {
      professionalId: professional.id,
      professional: refreshedRequest?.professional ?? null,
    });

    // Notifica os outros profissionais que o chamado foi encerrado (Limpeza de Tela)
    await NotificationsService.notifyRequestClaimed(requestId, professional.userId);

    return updatedRequest;
  }
}
