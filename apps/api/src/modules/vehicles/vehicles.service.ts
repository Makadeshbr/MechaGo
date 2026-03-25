import { VehiclesRepository } from "./vehicles.repository";
import {
  CreateVehicleInput,
  VehicleDeletionImpact,
  UpdateVehicleInput,
  Vehicle,
} from "./vehicles.schemas";
import { AppError } from "@/utils/errors";
import { vehicles } from "@/db/schema";

// Limite de veículos por cliente para evitar abuse de cadastro
// e manter a tabela enxuta para queries de matching
const MAX_VEHICLES_PER_USER = 5;

// Tipo inferido do Drizzle — se uma coluna for renomeada no schema,
// o TypeScript vai apontar o erro aqui em compile time
type VehicleRow = typeof vehicles.$inferSelect;

function serializeVehicle(vehicle: VehicleRow): Vehicle {
  return {
    id: vehicle.id,
    userId: vehicle.userId,
    type: vehicle.type,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color ?? null,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

function buildDeletionImpact(params: {
  pendingRequestCount: number;
  blockingRequestCount: number;
}): VehicleDeletionImpact {
  if (params.blockingRequestCount > 0) {
    return {
      canDelete: false,
      willCancelPendingRequests: false,
      pendingRequestCount: params.pendingRequestCount,
      blockingRequestCount: params.blockingRequestCount,
      message:
        "Nao e possivel remover veiculo com atendimento em andamento.",
    };
  }

  if (params.pendingRequestCount > 0) {
    return {
      canDelete: true,
      willCancelPendingRequests: true,
      pendingRequestCount: params.pendingRequestCount,
      blockingRequestCount: 0,
      message:
        "Ao remover este veiculo, suas solicitacoes pendentes serao canceladas automaticamente.",
    };
  }

  return {
    canDelete: true,
    willCancelPendingRequests: false,
    pendingRequestCount: 0,
    blockingRequestCount: 0,
    message: "Este veiculo pode ser removido com seguranca.",
  };
}

export class VehiclesService {
  // ==================== CREATE ====================
  static async create(
    userId: string,
    input: CreateVehicleInput,
  ): Promise<Vehicle> {
    // Verificar limite de veículos por usuário
    const vehicleCount = await VehiclesRepository.countByUserId(userId);
    if (vehicleCount >= MAX_VEHICLES_PER_USER) {
      throw new AppError(
        "VEHICLE_LIMIT",
        `Limite de ${MAX_VEHICLES_PER_USER} veículos atingido`,
        400,
      );
    }

    // Verificar se a placa já existe no sistema
    const existingPlate = await VehiclesRepository.findByPlate(input.plate);
    if (existingPlate) {
      throw new AppError(
        "PLATE_EXISTS",
        "Esta placa já está cadastrada no sistema",
        409,
      );
    }

    const vehicle = await VehiclesRepository.create({
      userId,
      type: input.type,
      plate: input.plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
      color: input.color,
    });

    return serializeVehicle(vehicle);
  }

  // ==================== LIST ====================
  static async listByUser(userId: string): Promise<Vehicle[]> {
    const vehicles = await VehiclesRepository.findByUserId(userId);
    return vehicles.map(serializeVehicle);
  }

  // ==================== UPDATE ====================
  static async update(
    userId: string,
    vehicleId: string,
    input: UpdateVehicleInput,
  ): Promise<Vehicle> {
    const vehicle = await VehiclesRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError("NOT_FOUND", "Veículo não encontrado", 404);
    }

    // Verificar se o veículo pertence ao usuário (autorização)
    if (vehicle.userId !== userId) {
      throw new AppError("FORBIDDEN", "Acesso negado", 403);
    }

    // Tipo alinhado com o repository — Drizzle valida os campos em compile time
    const updateData: Partial<Pick<typeof vehicles.$inferInsert, "type" | "brand" | "model" | "year" | "color">> = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.year !== undefined) updateData.year = input.year;
    if (input.color !== undefined) updateData.color = input.color;

    if (Object.keys(updateData).length === 0) {
      return serializeVehicle(vehicle);
    }

    const updated = await VehiclesRepository.update(vehicleId, updateData);
    return serializeVehicle(updated);
  }

  // ==================== DELETE ====================
  static async delete(userId: string, vehicleId: string): Promise<void> {
    const vehicle = await VehiclesRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError("NOT_FOUND", "Veículo não encontrado", 404);
    }

    // Verificar se o veículo pertence ao usuário (autorização)
    if (vehicle.userId !== userId) {
      throw new AppError("FORBIDDEN", "Acesso negado", 403);
    }

    // Verificar se o veículo está vinculado a alguma solicitação ativa
    // (pending, matching, accepted, professional_enroute, etc.)
    // Impede remoção durante atendimento em andamento
    const hasBlocking =
      await VehiclesRepository.hasBlockingServiceRequests(vehicleId);
    if (hasBlocking) {
      throw new AppError(
        "VEHICLE_IN_USE",
        "Não é possível remover veículo com solicitação ativa",
        409,
      );
    }

    await VehiclesRepository.cancelPreMatchServiceRequests(vehicleId);
    await VehiclesRepository.delete(vehicleId);
  }

  static async getDeletionImpact(
    userId: string,
    vehicleId: string,
  ): Promise<VehicleDeletionImpact> {
    const vehicle = await VehiclesRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError("NOT_FOUND", "Veiculo nao encontrado", 404);
    }

    if (vehicle.userId !== userId) {
      throw new AppError("FORBIDDEN", "Acesso negado", 403);
    }

    const counts = await VehiclesRepository.getDeletionImpactCounts(vehicleId);
    return buildDeletionImpact(counts);
  }
}
