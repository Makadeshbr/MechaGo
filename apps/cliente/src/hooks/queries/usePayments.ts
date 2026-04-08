import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PaymentResult {
  id: string;
  serviceRequestId: string;
  type: "diagnostic_fee" | "service" | "tow";
  amount: number;
  method: "pix" | "credit_card" | "debit_card";
  status: "pending" | "authorized" | "captured" | "refunded" | "failed";
  gatewayId: string | null;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  pixExpiration: string | null;
  createdAt: string;
}

interface CreateDiagnosticPaymentInput {
  serviceRequestId: string;
  method?: "pix" | "credit_card" | "debit_card";
}

interface CreateServicePaymentInput {
  serviceRequestId: string;
  method?: "pix" | "credit_card" | "debit_card";
}

export const paymentKeys = {
  detail: (id: string) => ["payments", id] as const,
};

export function usePayment(paymentId: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId ?? ""),
    queryFn: async (): Promise<PaymentResult> => {
      const response = await api.get(`payments/${paymentId}`);
      return response.json<PaymentResult>();
    },
    enabled: !!paymentId,
    // Para quando capturado, stop polling
    refetchInterval: (query) =>
      query.state.data?.status === "captured" ? false : 5000,
  });
}

export function useCreateDiagnosticPayment() {
  return useMutation({
    mutationFn: async (input: CreateDiagnosticPaymentInput): Promise<PaymentResult> => {
      // CRÍTICO: { json: input } é obrigatório para o Ky enviar o body corretamente
      const response = await api.post("payments/create-diagnostic", { json: input });
      return response.json<PaymentResult>();
    },
  });
}

export function useCreateServicePayment() {
  return useMutation({
    mutationFn: async (input: CreateServicePaymentInput): Promise<PaymentResult> => {
      const response = await api.post("payments/create-service", { json: input });
      return response.json<PaymentResult>();
    },
  });
}

export function useConfirmSandboxPayment(paymentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post(`payments/${paymentId}/confirm-sandbox`);
    },
    onSuccess: () => {
      // Força revalidação do status do pagamento após confirmação sandbox
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(paymentId ?? "") });
    },
    // Não faz retry automático — confirm-sandbox é idempotente e erros devem aparecer imediatamente
    retry: false,
  });
}
