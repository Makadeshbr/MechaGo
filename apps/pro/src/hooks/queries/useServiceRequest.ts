import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ServiceRequestSummary } from "@mechago/shared";

export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  detail: (id: string) => ["service-requests", id] as const,
};

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

export function useArrivedServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, latitude, longitude }: { requestId: string; latitude: number; longitude: number }) => {
      const response = await api.post(`service-requests/${requestId}/arrived`, { 
        json: { latitude, longitude } 
      });
      return response.json<{ success: boolean }>();
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(requestId) });
    },
  });
}

export function useDiagnosisServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      diagnosisNotes, 
      diagnosisPhotoUrl, 
      canResolveOnSite 
    }: { 
      requestId: string; 
      diagnosisNotes: string; 
      diagnosisPhotoUrl: string; 
      canResolveOnSite: boolean 
    }) => {
      const response = await api.post(`service-requests/${requestId}/diagnosis`, { 
        json: { diagnosisNotes, diagnosisPhotoUrl, canResolveOnSite } 
      });
      return response.json<{ success: boolean }>();
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(requestId) });
    },
  });
}

export function useResolveServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      finalPrice, 
      completionPhotoUrl, 
      priceJustification 
    }: { 
      requestId: string; 
      finalPrice: number; 
      completionPhotoUrl: string; 
      priceJustification?: string 
    }) => {
      const response = await api.post(`service-requests/${requestId}/resolve`, { 
        json: { finalPrice, completionPhotoUrl, priceJustification } 
      });
      return response.json<{ success: boolean }>();
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(requestId) });
    },
  });
}

export function useEscalateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      escalationReason, 
      needsTow,
      photoUrl,
      diagnosisNotes,
    }: { 
      requestId: string; 
      escalationReason: string; 
      needsTow: boolean;
      photoUrl?: string;
      diagnosisNotes?: string;
    }) => {
      const response = await api.post(`service-requests/${requestId}/escalate`, { 
        json: { escalationReason, needsTow, photoUrl, diagnosisNotes } 
      });
      return response.json<{ success: boolean }>();
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(requestId) });
    },
  });
}
