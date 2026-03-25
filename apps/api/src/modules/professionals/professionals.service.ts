import { AppError, Errors } from "@/utils/errors";
import { ProfessionalsRepository } from "./professionals.repository";
import type {
  RegisterProfessionalInput,
  UpdateProfessionalInput,
  GoOnlineInput,
  UpdateLocationInput,
} from "./professionals.schemas";

// Service do módulo professionals — toda lógica de negócio aqui.
// O repository é injetado implicitamente via import (testável via vi.mock).
export class ProfessionalsService {
  // Registra perfil profissional vinculado ao userId existente.
  // Um userId só pode ter um perfil profissional (UNIQUE constraint no banco).
  static async register(userId: string, input: RegisterProfessionalInput) {
    // Verifica se já existe perfil profissional para este usuário
    const existing = await ProfessionalsRepository.findByUserId(userId);
    if (existing) {
      throw new AppError(
        "PROFESSIONAL_ALREADY_EXISTS",
        "Este usuário já possui um perfil profissional",
        409,
      );
    }

    return ProfessionalsRepository.create({
      userId,
      type: input.type,
      specialties: input.specialties,
      vehicleTypesServed: input.vehicleTypesServed,
      radiusKm: input.radiusKm,
      scheduleType: input.scheduleType,
    });
  }

  // Busca perfil do profissional logado
  static async getProfile(userId: string) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }
    return professional;
  }

  // Atualização parcial do perfil
  static async updateProfile(userId: string, input: UpdateProfessionalInput) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }

    return ProfessionalsRepository.update(professional.id, input);
  }

  // Marca o profissional como online e registra localização GPS.
  // Garante que o perfil está completo antes de aceitar chamados.
  static async goOnline(userId: string, input: GoOnlineInput) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }

    // Tipo é obrigatório para ficar online — perfil incompleto não aceita chamados
    if (!professional.type) {
      throw new AppError(
        "PROFILE_INCOMPLETE",
        "Complete o cadastro antes de ficar online",
        422,
      );
    }

    return ProfessionalsRepository.update(professional.id, {
      isOnline: true,
      latitude: String(input.latitude),
      longitude: String(input.longitude),
    });
  }

  // Marca o profissional como offline
  static async goOffline(userId: string) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }

    return ProfessionalsRepository.update(professional.id, {
      isOnline: false,
    });
  }

  // Atualiza apenas a localização GPS (background, sem mudar status online)
  static async updateLocation(userId: string, input: UpdateLocationInput) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }

    return ProfessionalsRepository.update(professional.id, {
      latitude: String(input.latitude),
      longitude: String(input.longitude),
    });
  }

  // Retorna estatísticas resumidas do profissional.
  // Profissionais novos retornam zeros — sem joins desnecessários aqui.
  static async getStats(userId: string) {
    const professional = await ProfessionalsRepository.findByUserId(userId);
    if (!professional) {
      throw Errors.notFound("Perfil profissional");
    }

    return {
      totalEarnings: professional.totalEarnings,
      acceptanceRate: professional.acceptanceRate,
      cancellationsThisMonth: professional.cancellationsThisMonth,
      isOnline: professional.isOnline,
    };
  }
}
