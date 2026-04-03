import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CreatePaymentInput {
  serviceRequestId: string;
  estimatedPrice?: number;
  finalPrice?: number;
  diagnosticFee?: number;
  clientEmail?: string;
  method?: "pix" | "credit_card" | "debit_card";
}

export function useCreateDiagnosticPayment() {
  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const response = await api.post("payments/create-diagnostic", input);
      return response.json();
    },
  });
}

export function useCreateServicePayment() {
  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const response = await api.post("payments/create-service", input);
      return response.json();
    },
  });
}
