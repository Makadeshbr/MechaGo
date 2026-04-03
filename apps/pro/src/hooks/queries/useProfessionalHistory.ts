import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface HistoryItem {
  id: string;
  problemType: string;
  status: string;
  finalPrice: number;
  diagnosticFee: number;
  clientName: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Earnings {
  today: number;
  week: number;
  month: number;
  total: number;
}

interface ProfessionalHistoryResponse {
  history: HistoryItem[];
  earnings: Earnings;
}

export const professionalHistoryKeys = {
  all: ["professional-history"] as const,
};

export function useProfessionalHistory() {
  return useQuery({
    queryKey: professionalHistoryKeys.all,
    queryFn: async () => {
      const response = await api.get("service-requests/professional/history");
      return response.json<ProfessionalHistoryResponse>();
    },
  });
}
