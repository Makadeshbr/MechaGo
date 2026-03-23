import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  CreateServiceRequestInput, 
  ServiceRequestResponse 
} from "@/../../api/src/modules/service-requests/service-requests.schemas";

export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  detail: (id: string) => ["service-requests", id] as const,
};

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: async (data: CreateServiceRequestInput) => {
      const response = await api.post("service-requests", { json: data });
      return response.json<ServiceRequestResponse>();
    },
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: serviceRequestKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(`service-requests/${id}`);
      return response.json<ServiceRequestResponse>();
    },
    enabled: !!id,
  });
}
