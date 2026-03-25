import { ServiceRequestsRepository } from "./service-requests.repository";
import { PricingService } from "./pricing.service";
import { VehiclesRepository } from "../vehicles/vehicles.repository";
import { CreateServiceRequestInput, EstimatePriceInput, PricingResult } from "@mechago/shared";
import { AppError } from "@/utils/errors";
import { scheduleMatchingJob } from "../matching/matching.queue";

const DEFAULT_ESTIMATE_DISTANCE_KM = 5;

function serializeServiceRequestSummary(params: {
  id: string;
  status: string;
  context: "urban" | "highway";
  estimatedPrice: number;
  diagnosticFee: number;
  roadwayPhone: string | null;
  roadwayName: string | null;
  createdAt: Date;
  professionalId?: string | null;
  professional?: {
    name: string;
    avatarUrl: string | null;
    rating: string | null;
    specialties: string[];
  } | null;
}) {
  return {
    id: params.id,
    status: params.status,
    context: params.context,
    estimatedPrice: params.estimatedPrice,
    diagnosticFee: params.diagnosticFee,
    roadwayPhone: params.roadwayPhone,
    roadwayName: params.roadwayName,
    createdAt: params.createdAt.toISOString(),
    professionalId: params.professionalId || null,
    professional: params.professional ? {
      ...params.professional,
      rating: params.professional.rating ? Number(params.professional.rating) : 0,
    } : null,
  };
}

export class ServiceRequestsService {
  /**
   * Cancela um pedido de socorro (Cliente)
   */
  static async cancel(userId: string, requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.clientId !== userId) {
      throw new AppError("FORBIDDEN", "Você não tem permissão para cancelar este pedido", 403);
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "cancelled_client",
      cancelledAt: new Date(),
      cancelledBy: "client",
    });

    // Notificar profissional se existir
    if (request.professionalId) {
       const { NotificationsService } = await import("../notifications/notifications.service");
       await NotificationsService.notifyProfessionalCancelled(requestId, request.professionalId);
    }

    return updated;
  }
  /**
   * Calcula apenas a estimativa sem criar o registro.
   * Utilizado para exibir o preço real no frontend.
   */
  static async estimate(input: EstimatePriceInput): Promise<PricingResult> {
    const vehicle = await VehiclesRepository.findById(input.vehicleId);
    if (!vehicle) {
      throw new AppError("VEHICLE_NOT_FOUND", "Veículo não encontrado", 404);
    }

    // Geofencing: Detectar se está em Rodovia (Usa coordenadas fixas se enviadas)
    let context: "urban" | "highway" = "urban";
    if (input.latitude && input.longitude) {
      const roadway = await ServiceRequestsRepository.findRoadwayByCoords(
        input.latitude,
        input.longitude
      );
      context = roadway ? "highway" : "urban";
    }

    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;

    return PricingService.calculateEstimate({
      problemType: input.problemType,
      vehicleType: vehicle.type,
      locationContext: context,
      distanceKm: DEFAULT_ESTIMATE_DISTANCE_KM,
      isNight,
    });
  }

  /**
   * Cria um novo pedido de socorro
   * Orquestra: Localização -> Preço -> Banco
   */
  static async create(userId: string, input: CreateServiceRequestInput) {
    // 1. Validar veículo
    const vehicle = await VehiclesRepository.findById(input.vehicleId);
    if (!vehicle) {
      throw new AppError("VEHICLE_NOT_FOUND", "Veículo não encontrado", 404);
    }
    if (vehicle.userId !== userId) {
      throw new AppError("FORBIDDEN", "Acesso negado", 403);
    }

    // 2. Geofencing: Detectar se está em Rodovia
    const roadway = await ServiceRequestsRepository.findRoadwayByCoords(
      input.latitude,
      input.longitude
    );
    const context = roadway ? "highway" : "urban";

    // 3. Horário e Calendário (MVP: Simples)
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    
    // 4. Calcular Preço (Fórmula V3)
    // No MVP a distância é calculada pelo frontend ou 5km default se não vier
    const estimate = PricingService.calculateEstimate({
      problemType: input.problemType,
      vehicleType: vehicle.type,
      locationContext: context,
      distanceKm: DEFAULT_ESTIMATE_DISTANCE_KM,
      isNight,
    });

    // 5. Salvar no Banco
    const request = await ServiceRequestsRepository.create({
      clientId: userId,
      vehicleId: vehicle.id,
      problemType: input.problemType,
      complexity: "simple", // Default inicial
      context,
      status: "matching", // Passa direto para matching
      clientLatitude: input.latitude.toString(),
      clientLongitude: input.longitude.toString(),
      address: input.address,
      triageAnswers: input.triageAnswers,
      estimatedPrice: estimate.estimatedPrice.toString(),
      diagnosticFee: estimate.diagnosticFee.toString(),
    });

    // 6. Agendar Job de Matching
    await scheduleMatchingJob(request.id);

    return serializeServiceRequestSummary({
      id: request.id,
      status: request.status,
      context,
      estimatedPrice: estimate.estimatedPrice,
      diagnosticFee: estimate.diagnosticFee,
      roadwayPhone: roadway?.emergencyPhone || null,
      roadwayName: roadway?.name || null,
      createdAt: request.createdAt,
      professionalId: null,
    });
  }

  /**
   * Detalhes de um pedido
   */
  static async getById(id: string) {
    const request = await ServiceRequestsRepository.findById(id);
    if (!request) {
      throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);
    }

    const estimatedPrice = request.estimatedPrice ? Number(request.estimatedPrice) : 0;
    const diagnosticFee = Number(request.diagnosticFee);

    return serializeServiceRequestSummary({
      id: request.id,
      status: request.status,
      context: request.context,
      estimatedPrice,
      diagnosticFee,
      roadwayPhone: null,
      roadwayName: null,
      createdAt: request.createdAt,
      professionalId: request.professionalId,
      professional: (request as any).professional,
    });
  }

  /**
   * Profissional chegou no local
   */
  static async arrived(professionalUserId: string, requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    // O status pós accept é accepted. E depois o professional clica que está a caminho (enroute)? 
    // O PRD V3 diz matching -> accepted -> professional_enroute -> professional_arrived.
    // Mas no request de matching ele muda pra accepted. Entao o arrived pode aceitar de accepted tb pro MVP 
    if (request.status !== "professional_enroute" && request.status !== "accepted") {
      throw new AppError("INVALID_STATUS", "Chamado não está a caminho", 409);
    }

    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findByUserId(professionalUserId);
    if (request.professionalId !== professional?.id) {
      throw new AppError("FORBIDDEN", "Você não é o profissional deste chamado", 403);
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "professional_arrived",
      arrivedAt: new Date(),
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "professional_arrived");

    return updated;
  }
}
