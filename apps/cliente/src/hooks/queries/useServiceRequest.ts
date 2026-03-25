import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CreateServiceRequestInput,
  EstimatePriceInput,
  PricingResult,
  ServiceRequestSummary,
} from "@mechago/shared";

export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  detail: (id: string) => ["service-requests", id] as const,
  estimate: (params: EstimatePriceInput | null) => ["service-requests", "estimate", params] as const,
};

export function useEstimatePrice(params: EstimatePriceInput | null) {
  return useQuery({
    queryKey: serviceRequestKeys.estimate(params),
    queryFn: async () => {
      if (!params) {
        throw new Error("Parametros invalidos para estimativa");
      }

      const response = await api.post("service-requests/estimate", { json: params });
      return response.json<PricingResult>();
    },
    enabled: !!params?.vehicleId && !!params?.problemType,
  });
}

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: async (data: CreateServiceRequestInput) => {
      const response = await api.post("service-requests", { json: data });
      return response.json<ServiceRequestSummary>();
    },
  });
}

export function useServiceRequest(id: string, refetchInterval?: number) {
  return useQuery({
    queryKey: serviceRequestKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(`service-requests/${id}`);
      return response.json<ServiceRequestSummary>();
    },
    enabled: !!id,
    refetchInterval,
  });
}

export function useCancelServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.patch(`service-requests/${requestId}/cancel`);
      return response.json<{ success: boolean }>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.all });
    },
  });
}
