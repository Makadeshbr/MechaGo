import { VehiclesRepository } from "./vehicles.repository";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
} from "./vehicles.schemas";
import { AppError } from "@/utils/errors";

// Limite de veículos por cliente para evitar abuse de cadastro
// e manter a tabela enxuta para queries de matching
const MAX_VEHICLES_PER_USER = 5;

function serializeVehicle(vehicle: Record<string, unknown>): Vehicle {
  return {
    id: vehicle.id as string,
    userId: vehicle.userId as string,
    type: vehicle.type as Vehicle["type"],
    plate: vehicle.plate as string,
    brand: vehicle.brand as string,
    model: vehicle.model as string,
    year: vehicle.year as number,
    color: (vehicle.color as string) ?? null,
    createdAt: (vehicle.createdAt as Date).toISOString(),
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

    // Filtra campos undefined
    const updateData: Record<string, unknown> = {};
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

    await VehiclesRepository.delete(vehicleId);
  }
}
