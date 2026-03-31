import { ServiceRequestsRepository } from "./service-requests.repository";
import { PricingService } from "./pricing.service";
import { VehiclesRepository } from "../vehicles/vehicles.repository";
import { CreateServiceRequestInput, EstimatePriceInput, PricingResult, DEFAULT_ESTIMATE_DISTANCE_KM, ARRIVAL_DISTANCE_THRESHOLD_METERS } from "@mechago/shared";
import { AppError } from "@/utils/errors";
import { scheduleMatchingJob } from "../matching/matching.queue";
import type { DiagnosisInput, ResolveInput, EscalateInput, ContestPriceInput, CancelInput } from "./service-requests.schemas";
import { env } from "@/env";

// MVP: permite override via env var para testes com dispositivos em locais diferentes
// Em produção, definir MAX_ARRIVAL_DISTANCE_METERS=200 (ou remover a env var)
const MAX_ARRIVAL_DISTANCE_METERS =
  env.MAX_ARRIVAL_DISTANCE_METERS ?? ARRIVAL_DISTANCE_THRESHOLD_METERS;

function parseNullableDecimal(value?: string | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function calculateDistanceInKm(params: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}): number {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(params.destinationLat - params.originLat);
  const deltaLng = toRadians(params.destinationLng - params.originLng);
  const originLat = toRadians(params.originLat);
  const destinationLat = toRadians(params.destinationLat);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(originLat) * Math.cos(destinationLat) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Number((earthRadiusKm * arc).toFixed(1));
}

function estimateArrivalMinutes(distanceKm: number): number {
  if (distanceKm <= 0.4) {
    return 1;
  }

  return Math.max(2, Math.ceil(distanceKm * 4));
}

function serializeServiceRequestSummary(params: {
  id: string;
  status: string;
  context: "urban" | "highway";
  problemType: CreateServiceRequestInput["problemType"];
  estimatedPrice: number;
  finalPrice?: string | null;
  diagnosticFee: number;
  roadwayPhone: string | null;
  roadwayName: string | null;
  address?: string | null;
  createdAt: Date;
  clientLatitude?: string | null;
  clientLongitude?: string | null;
  queuePosition?: number | null;
  estimatedArrivalMinutes?: number | null;
  distanceKm?: number | null;
  queueLabel?: string | null;
  supportPhone?: string | null;
  diagnosisPhotoUrl?: string | null;
  completionPhotoUrl?: string | null;
  priceJustification?: string | null;
  resolvedOnSite?: boolean | null;
  professionalId?: string | null;
  professionalLatitude?: number | null;
  professionalLongitude?: number | null;
  clientId?: string | null;
  professional?: {
    name: string;
    avatarUrl: string | null;
    rating: string | null;
    specialties: string[];
    userId?: string | null;
  } | null;
}) {
  return {
    id: params.id,
    status: params.status,
    context: params.context,
    problemType: params.problemType,
    estimatedPrice: params.estimatedPrice,
    finalPrice: parseNullableDecimal(params.finalPrice),
    diagnosticFee: params.diagnosticFee,
    roadwayPhone: params.roadwayPhone,
    roadwayName: params.roadwayName,
    address: params.address ?? null,
    createdAt: params.createdAt.toISOString(),
    clientLatitude: params.clientLatitude ? Number(params.clientLatitude) : null,
    clientLongitude: params.clientLongitude ? Number(params.clientLongitude) : null,
    queuePosition: params.queuePosition ?? null,
    estimatedArrivalMinutes: params.estimatedArrivalMinutes ?? null,
    distanceKm: params.distanceKm ?? null,
    queueLabel: params.queueLabel ?? null,
    supportPhone: params.supportPhone ?? null,
    diagnosisPhotoUrl: params.diagnosisPhotoUrl ?? null,
    completionPhotoUrl: params.completionPhotoUrl ?? null,
    priceJustification: params.priceJustification ?? null,
    resolvedOnSite: params.resolvedOnSite ?? null,
    professionalId: params.professionalId || null,
    professionalLatitude: params.professionalLatitude ?? null,
    professionalLongitude: params.professionalLongitude ?? null,
    clientId: params.clientId ?? null,
    professional: params.professional ? {
      ...params.professional,
      rating: params.professional.rating ? Number(params.professional.rating) : 0,
      userId: params.professional.userId ?? null,
    } : null,
  };
}

// SLA máximo para o profissional chegar (em ms) — 30 minutos
const PROFESSIONAL_ARRIVAL_SLA_MS = 30 * 60 * 1000;

// Janela de cancelamento gratuito (Cenário 1) — 2 minutos
const FREE_CANCEL_WINDOW_MS = 2 * 60 * 1000;

export interface CancellationResult {
  status: "cancelled_client" | "cancelled_professional";
  refundPercent: number;
  scenario: 1 | 2 | 3 | 4 | 5 | 6;
  autoRematch: boolean;
  cancelledBy: "client" | "professional";
}

export class ServiceRequestsService {
  /**
   * Cancela um pedido de socorro aplicando os 6 cenários do PRD V3.
   *
   * Cenário 1: Cliente cancela ≤2min da criação → 100% reembolso
   * Cenário 2: Cliente cancela >2min (profissional aceitou) → 70% reembolso
   * Cenário 3: Cliente cancela com profissional a caminho → 0% reembolso
   * Cenário 4: Profissional cancela → auto-rematch + penalidade
   * Cenário 5: Profissional não chegou no SLA (30min) → 100% reembolso + penalidade
   * Cenário 6: Ninguém aceita em 5min → fila de espera, sem cobrança
   */
  static async cancel(userId: string, requestId: string, input?: CancelInput): Promise<CancellationResult> {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    const cancelledBy = input?.cancelledBy ?? "client";
    const reason = input?.reason;
    const now = new Date();

    // ── Cenário 4: Profissional cancela ──────────────────────────────────
    if (cancelledBy === "professional") {
      const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
      const professional = await ProfessionalsRepository.findByUserId(userId);

      if (!professional || request.professionalId !== professional.id) {
        throw new AppError("FORBIDDEN", "Você não é o profissional deste chamado", 403);
      }

      const cancellableStatuses = ["accepted", "professional_enroute"];
      if (!cancellableStatuses.includes(request.status)) {
        throw new AppError("INVALID_STATUS", "Chamado não pode ser cancelado neste status", 409);
      }

      await ServiceRequestsRepository.update(requestId, {
        status: "cancelled_professional",
        cancellationReason: reason,
        cancelledBy: "professional",
        cancelledAt: now,
        professionalId: null, // libera o profissional do chamado
      });

      const { NotificationsService } = await import("../notifications/notifications.service");
      await NotificationsService.notifyClientStatusUpdate(requestId, "cancelled_professional" as never);

      // Auto-rematch: coloca de volta na fila de matching
      await scheduleMatchingJob(requestId);

      return { status: "cancelled_professional", refundPercent: 100, scenario: 4, autoRematch: true, cancelledBy: "professional" };
    }

    // ── Cancelamento pelo cliente ─────────────────────────────────────────
    if (request.clientId !== userId) {
      throw new AppError("FORBIDDEN", "Você não tem permissão para cancelar este pedido", 403);
    }

    const cancellableByClient = [
      "pending", "matching", "waiting_queue", "accepted", "professional_enroute",
    ];
    if (!cancellableByClient.includes(request.status)) {
      throw new AppError(
        "INVALID_STATUS",
        "Não é possível cancelar um chamado neste status",
        409,
      );
    }

    const elapsedMs = now.getTime() - request.createdAt.getTime();

    let scenario: CancellationResult["scenario"];
    let refundPercent: number;

    if (request.status === "professional_enroute") {
      // Cenário 3: profissional já está a caminho → sem reembolso
      scenario = 3;
      refundPercent = 0;
    } else if (elapsedMs <= FREE_CANCEL_WINDOW_MS || !request.professionalId) {
      // Cenário 1: dentro de 2min ou sem profissional (cenário 6 — fila)
      scenario = request.professionalId ? 1 : 6;
      refundPercent = 100;
    } else {
      // Cenário 2: após 2min com profissional aceito
      scenario = 2;
      refundPercent = 70;
    }

    await ServiceRequestsRepository.update(requestId, {
      status: "cancelled_client",
      cancellationReason: reason,
      cancelledBy: "client",
      cancelledAt: now,
    });

    if (request.professionalId) {
      const { NotificationsService } = await import("../notifications/notifications.service");
      await NotificationsService.notifyProfessionalCancelled(requestId, request.professionalId);
    }

    return { status: "cancelled_client", refundPercent, scenario, autoRematch: false, cancelledBy: "client" };
  }

  /**
   * Verifica se o profissional ultrapassou o SLA de chegada (30min).
   * Chamado por job agendado — aplica Cenário 5 automaticamente.
   */
  static async checkArrivalSla(requestId: string): Promise<void> {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) return;

    const isWaitingArrival = ["accepted", "professional_enroute"].includes(request.status);
    if (!isWaitingArrival || !request.matchedAt) return;

    const elapsedMs = Date.now() - request.matchedAt.getTime();
    if (elapsedMs < PROFESSIONAL_ARRIVAL_SLA_MS) return;

    // Cenário 5: SLA expirado — 100% reembolso + penalidade
    await ServiceRequestsRepository.update(requestId, {
      status: "cancelled_professional",
      cancellationReason: "SLA de chegada expirado — profissional não chegou em 30 minutos",
      cancelledBy: "system",
      cancelledAt: new Date(),
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "cancelled_professional" as never);

    const { logger } = await import("@/middleware/logger.middleware");
    logger.warn({
      msg: "sla_arrival_expired",
      requestId,
      professionalId: request.professionalId,
      elapsedMs,
    });
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
      problemType: request.problemType,
      estimatedPrice: estimate.estimatedPrice,
      diagnosticFee: estimate.diagnosticFee,
      roadwayPhone: roadway?.emergencyPhone || null,
      roadwayName: roadway?.name || null,
      address: request.address,
      createdAt: request.createdAt,
      clientLatitude: request.clientLatitude,
      clientLongitude: request.clientLongitude,
      supportPhone: roadway?.emergencyPhone || null,
      professionalId: null,
      clientId: userId,
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
    const professionalLatitude = request.professional?.latitude
      ? Number(request.professional.latitude)
      : null;
    const professionalLongitude = request.professional?.longitude
      ? Number(request.professional.longitude)
      : null;

    const distanceKm =
      professionalLatitude !== null &&
      professionalLongitude !== null &&
      request.clientLatitude &&
      request.clientLongitude
        ? calculateDistanceInKm({
            originLat: professionalLatitude,
            originLng: professionalLongitude,
            destinationLat: Number(request.clientLatitude),
            destinationLng: Number(request.clientLongitude),
          })
        : null;

    const estimatedArrivalMinutes =
      distanceKm !== null &&
      ["accepted", "professional_enroute"].includes(request.status)
        ? estimateArrivalMinutes(distanceKm)
        : request.status === "professional_arrived"
          ? 0
          : null;

    return serializeServiceRequestSummary({
      id: request.id,
      status: request.status,
      context: request.context,
      problemType: request.problemType,
      estimatedPrice,
      finalPrice: request.finalPrice,
      diagnosticFee,
      roadwayPhone: null,
      roadwayName: null,
      address: request.address,
      createdAt: request.createdAt,
      clientLatitude: request.clientLatitude,
      clientLongitude: request.clientLongitude,
      professionalLatitude,
      professionalLongitude,
      queuePosition: null,
      estimatedArrivalMinutes,
      distanceKm,
      queueLabel: request.status === "waiting_queue" ? "Aguardando profissional" : null,
      supportPhone: request.roadwayPhone ?? null,
      diagnosisPhotoUrl: request.diagnosisPhotoUrl,
      completionPhotoUrl: request.completionPhotoUrl,
      priceJustification: request.priceJustification,
      resolvedOnSite: request.resolvedOnSite,
      professionalId: request.professionalId,
      clientId: request.clientId,
      professional: request.professional
        ? {
            name: request.professional.name,
            avatarUrl: request.professional.avatarUrl,
            rating: request.professional.rating,
            specialties: request.professional.specialties,
            userId: request.professional.userId,
          }
        : null,
    });
  }

  /**
   * Profissional chegou no local
   */
  static async arrived(
    professionalUserId: string,
    requestId: string,
    coordinates?: { latitude: number; longitude: number },
  ) {
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

    const professionalLatitude = coordinates?.latitude ?? (professional?.latitude ? Number(professional.latitude) : null);
    const professionalLongitude = coordinates?.longitude ?? (professional?.longitude ? Number(professional.longitude) : null);

    if (professionalLatitude === null || professionalLongitude === null) {
      throw new AppError(
        "LOCATION_REQUIRED",
        "Localização do profissional é obrigatória para confirmar chegada",
        422,
      );
    }

    const distance = await ServiceRequestsRepository.calculateDistanceToRequest({
      requestId,
      latitude: professionalLatitude,
      longitude: professionalLongitude,
    });

    if (!distance || distance.distanceMeters > MAX_ARRIVAL_DISTANCE_METERS) {
      throw new AppError(
        "ARRIVAL_DISTANCE_INVALID",
        `Você precisa estar a menos de ${MAX_ARRIVAL_DISTANCE_METERS >= 1000 ? `${MAX_ARRIVAL_DISTANCE_METERS / 1000}km` : `${MAX_ARRIVAL_DISTANCE_METERS}m`} do cliente para confirmar chegada`,
        409,
      );
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "professional_arrived",
      arrivedAt: new Date(),
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "professional_arrived");

    return updated;
  }

  /**
   * Profissional registra diagnóstico do serviço
   * Status: professional_arrived → diagnosing
   */
  static async diagnosis(
    professionalUserId: string,
    requestId: string,
    input: DiagnosisInput,
  ) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.status !== "professional_arrived") {
      throw new AppError(
        "INVALID_STATUS",
        "Chamado não está no status de chegada",
        409,
      );
    }

    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findByUserId(professionalUserId);
    if (request.professionalId !== professional?.id) {
      throw new AppError("FORBIDDEN", "Você não é o profissional deste chamado", 403);
    }

    if (!input.diagnosisPhotoUrl) {
      throw new AppError(
        "PHOTO_REQUIRED",
        "Foto do diagnóstico é obrigatória",
        422,
      );
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "diagnosing",
      diagnosis: input.diagnosisNotes,
      diagnosisPhotoUrl: input.diagnosisPhotoUrl,
      resolvedOnSite: input.canResolveOnSite,
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "diagnosing");

    return updated;
  }

  /**
   * Profissional marca serviço como resolvido no local
   * Status: diagnosing → resolved
   * Validação: preço ±25% da estimativa original ou justificativa obrigatória
   */
  static async resolve(
    professionalUserId: string,
    requestId: string,
    input: ResolveInput,
  ) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.status !== "diagnosing") {
      throw new AppError(
        "INVALID_STATUS",
        "Chamado não está em diagnóstico",
        409,
      );
    }

    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findByUserId(professionalUserId);
    if (request.professionalId !== professional?.id) {
      throw new AppError("FORBIDDEN", "Você não é o profissional deste chamado", 403);
    }

    if (!input.completionPhotoUrl) {
      throw new AppError(
        "PHOTO_REQUIRED",
        "Foto de conclusão é obrigatória para finalizar o serviço",
        422,
      );
    }

    // Validação ±25% da estimativa original
    const estimatedPrice = Number(request.estimatedPrice);
    const margin = estimatedPrice * 0.25;
    const minPrice = estimatedPrice - margin;
    const maxPrice = estimatedPrice + margin;

    // Se fora da margem, justificativa é obrigatória
    if ((input.finalPrice < minPrice || input.finalPrice > maxPrice) && !input.priceJustification) {
      throw new AppError(
        "PRICE_JUSTIFICATION_REQUIRED",
        `O preço final (R$ ${input.finalPrice.toFixed(2)}) está fora da margem de 25%. Justificativa é obrigatória.`,
        422,
      );
    }

    // Calcula desvio percentual do preço
    const priceDeviation = estimatedPrice > 0
      ? Math.abs(input.finalPrice - estimatedPrice) / estimatedPrice
      : 0;

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "resolved",
      completionPhotoUrl: input.completionPhotoUrl,
      finalPrice: input.finalPrice.toString(),
      priceJustification: input.priceJustification,
      resolvedOnSite: true,
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "resolved", {
      finalPrice: input.finalPrice,
      priceDeviation,
    });

    return updated;
  }

  /**
   * Profissional escala caso para guincho/oficina
   * Status: diagnosing → escalated
   */
  static async escalate(
    professionalUserId: string,
    requestId: string,
    input: EscalateInput,
  ) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.status !== "diagnosing") {
      throw new AppError(
        "INVALID_STATUS",
        "Chamado não está em diagnóstico",
        409,
      );
    }

    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findByUserId(professionalUserId);
    if (request.professionalId !== professional?.id) {
      throw new AppError("FORBIDDEN", "Você não é o profissional deste chamado", 403);
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: input.needsTow ? "tow_requested" : "escalated",
      diagnosis: input.escalationReason,
      diagnosisPhotoUrl: input.photoUrl,
      resolvedOnSite: false,
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, input.needsTow ? "tow_requested" : "escalated");

    return updated;
  }

  /**
   * Cliente aprova o preço do serviço
   * Status: resolved → completed
   * Regra de negócio: serviço NUNCA pode ser encerrado sem foto de conclusão
   */
  static async approvePrice(clientUserId: string, requestId: string) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.clientId !== clientUserId) {
      throw new AppError("FORBIDDEN", "Você não tem permissão para aprovar este pedido", 403);
    }

    if (request.status !== "resolved") {
      throw new AppError(
        "INVALID_STATUS",
        "Chamado não está aguardando aprovação de preço",
        409,
      );
    }

    // Invariante de negócio: foto obrigatória para encerrar serviço
    if (!request.completionPhotoUrl) {
      throw new AppError(
        "PHOTO_REQUIRED",
        "Foto de conclusão é obrigatória para finalizar o serviço",
        422,
      );
    }

    const updated = await ServiceRequestsRepository.update(requestId, {
      status: "completed",
      completedAt: new Date(),
    });

    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "completed");
    if (request.professionalId) {
      await NotificationsService.notifyProfessionalStatusUpdate(requestId, request.professionalId, "completed");
    }

    return updated;
  }

  /**
   * Cliente contesta o preço do serviço
   * Gera disputa (status: resolved → price_contested)
   */
  static async contestPrice(
    clientUserId: string,
    requestId: string,
    input: ContestPriceInput,
  ) {
    const request = await ServiceRequestsRepository.findById(requestId);
    if (!request) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);

    if (request.clientId !== clientUserId) {
      throw new AppError("FORBIDDEN", "Você não tem permissão para contestar este pedido", 403);
    }

    if (request.status !== "resolved") {
      throw new AppError(
        "INVALID_STATUS",
        "Chamado não está aguardando aprovação de preço",
        409,
      );
    }

    // MVP: Contestação é notificada via Socket.IO para ambos os lados.
    // Não sobrescreve priceJustification (que pertence ao profissional).
    // Quando houver coluna contestReason no schema, armazenar lá.
    const { NotificationsService } = await import("../notifications/notifications.service");
    await NotificationsService.notifyClientStatusUpdate(requestId, "resolved", { contestReason: input.reason });
    if (request.professionalId) {
      await NotificationsService.notifyProfessionalStatusUpdate(requestId, request.professionalId, "resolved", { contestReason: input.reason });
    }

    return request;
  }

}
