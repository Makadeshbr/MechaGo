/**
 * Helper de navegação tipado para o fluxo de serviço do cliente.
 *
 * Centraliza todos os casts `(router as any)` em um único lugar,
 * expondo uma API fortemente tipada para os componentes.
 * Componentes nunca devem importar `router` diretamente para navegação de fluxo.
 */
import { router } from "expo-router";

export type ServiceFlowRatingParams = {
  requestId: string;
  professionalUserId: string;
  professionalName: string;
  finalPrice: string;
};

export type ServiceFlowCompletedParams = {
  requestId: string;
  finalPrice?: string;
};

export type ServiceFlowPaymentParams = {
  paymentId: string;
  requestId: string;
  nextScreen: "searching" | "rating" | "completed";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = router as any;

export const nav = {
  /** Tela de pagamento Pix */
  toPayment: (params: ServiceFlowPaymentParams) =>
    r.replace({ pathname: "/(service-flow)/payment", params }),

  /** Cliente avalia o profissional */
  toRating: (params: ServiceFlowRatingParams) =>
    r.replace({ pathname: "/(service-flow)/rating", params }),

  /** Tela de encerramento após avaliação */
  toCompleted: (params: ServiceFlowCompletedParams) =>
    r.replace({ pathname: "/(service-flow)/completed", params }),

  /** Aprovação de preço final */
  toPriceApproval: (requestId: string) =>
    r.replace({ pathname: "/(service-flow)/price-approval", params: { requestId } }),

  /** Acompanhamento em mapa */
  toTracking: (requestId: string) =>
    r.replace({ pathname: "/(service-flow)/tracking", params: { requestId } }),

  /** Home do cliente */
  toHome: () => router.replace("/(tabs)"),
};
