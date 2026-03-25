import { ServiceRequestsRepository } from "./service-requests.repository";
import { PricingService, PricingResult } from "./pricing.service";
import { VehiclesRepository } from "../vehicles/vehicles.repository";
import { 
  CreateServiceRequestInput, 
  EstimatePriceInput 
} from "./service-requests.schemas";
import { AppError } from "@/utils/errors";

export class ServiceRequestsService {
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
      distanceKm: 5, // Default para estimativa inicial (TODO: Calcular real via roteamento)
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
      distanceKm: 5, // Default para estimativa inicial
      isNight,
    });

    // 5. Salvar no Banco
    const request = await ServiceRequestsRepository.create({
      clientId: userId,
      vehicleId: vehicle.id,
      problemType: input.problemType,
      complexity: "simple", // Default inicial
      context,
      status: "pending",
      clientLatitude: input.latitude.toString(),
      clientLongitude: input.longitude.toString(),
      address: input.address,
      triageAnswers: input.triageAnswers,
      estimatedPrice: estimate.estimatedPrice.toString(),
      diagnosticFee: estimate.diagnosticFee.toString(),
    });

    return {
      id: request.id,
      status: request.status,
      context,
      estimatedPrice: estimate.estimatedPrice,
      diagnosticFee: estimate.diagnosticFee,
      roadwayPhone: roadway?.emergencyPhone || null,
      roadwayName: roadway?.name || null,
      createdAt: request.createdAt.toISOString(),
    };
  }

  /**
   * Detalhes de um pedido
   */
  static async getById(id: string) {
    const request = await ServiceRequestsRepository.findById(id);
    if (!request) {
      throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);
    }
    return request;
  }
}
