import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VehicleDeletionImpact } from "@mechago/shared";

interface Vehicle {
  id: string;
  userId: string;
  type: "car" | "moto" | "suv" | "truck";
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  createdAt: string;
}

interface CreateVehicleInput {
  type: "car" | "moto" | "suv" | "truck";
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
}

// Query keys organizadas por domínio
export const vehicleKeys = {
  all: ["vehicles"] as const,
  detail: (id: string) => ["vehicles", id] as const,
  deletionImpact: (id: string) => ["vehicles", id, "deletion-impact"] as const,
};

// Hook para listar veículos do usuário logado
export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: async () => {
      const response = await api
        .get("vehicles")
        .json<{ vehicles: Vehicle[] }>();
      return response.vehicles;
    },
  });
}

// Hook para criar veículo
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      const response = await api
        .post("vehicles", { json: input })
        .json<{ vehicle: Vehicle }>();
      return response.vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

// Hook para deletar veículo
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      await api.delete(`vehicles/${vehicleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useVehicleDeletionImpact() {
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await api
        .get(`vehicles/${vehicleId}/deletion-impact`)
        .json<{ impact: VehicleDeletionImpact }>();

      return response.impact;
    },
  });
}
