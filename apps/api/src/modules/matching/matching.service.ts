import { db } from "@/db";
import { sql } from "drizzle-orm";
import { AppError } from "@/utils/errors";
import { logger } from "@/middleware/logger.middleware";
import { ServiceRequestsRepository } from "../service-requests/service-requests.repository";
import { ProfessionalsRepository } from "../professionals/professionals.repository";
import { VehiclesRepository } from "../vehicles/vehicles.repository";
import { getIO } from "@/socket";

export interface FindProfessionalsInput {
  lat: number;
  lng: number;
  radiusMeters: number;
  vehicleType: string;
}

export class MatchingService {
  static async findNearbyProfessionals({ lat, lng, radiusMeters, vehicleType }: FindProfessionalsInput) {
    // Retorna profissionais no raio, do tipo de veiculo correto, online
    const nearby = await db.execute(sql`
      SELECT p.*, u.name, u.rating,
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

    return nearby;
  }

  static async processMatchingJob(requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request || !request.vehicleId) return;

    if (request.status !== "matching") return;

    const vehicle = await VehiclesRepository.findById(request.vehicleId);
    if (!vehicle) return;

    const professionals = await this.findNearbyProfessionals({
      lat: Number(request.clientLatitude),
      lng: Number(request.clientLongitude),
      radiusMeters: request.context === "highway" ? 30000 : 10000,
      vehicleType: vehicle.type as any,
    });

    if (professionals.length === 0) {
      return ServiceRequestsRepository.update(requestId, { status: "waiting_queue" });
    }

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyProfessionals(professionals, {
        id: request.id,
        problemType: request.problemType,
        estimatedPrice: request.estimatedPrice,
        clientLatitude: request.clientLatitude,
        clientLongitude: request.clientLongitude,
        createdAt: request.createdAt,
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          type: vehicle.type,
        }
    });

    logger.info({ requestId, count: professionals.length }, "Professionals notified via matching job");
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

    // Convert string[] para types. 
    // Como Drizzle retorna string[] na tipagem pra json/array as vezes, assumiremos que vehicleTypesServed e string[]
    if (!(professional.vehicleTypesServed as string[]).includes(vehicle.type)) {
      throw new AppError(
        "INCOMPATIBLE",
        "Você não atende este tipo de veículo",
        400,
      );
    }

    return ServiceRequestsRepository.update(requestId, {
      professionalId: professional.id,
      status: "accepted",
      matchedAt: new Date(),
    });
  }
}
