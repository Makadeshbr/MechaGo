/**
 * Helper de navegação tipado para o fluxo de serviço do profissional.
 *
 * Centraliza todos os casts `(router as any)` em um único lugar,
 * expondo uma API fortemente tipada para os componentes.
 */
import { router } from "expo-router";

export type ProServiceCompletedParams = {
  requestId: string;
  clientUserId: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = router as any;

export const nav = {
  /** Profissional avalia o cliente */
  toServiceCompleted: (params: ProServiceCompletedParams) =>
    r.replace({ pathname: "/(service-flow)/service-completed", params }),

  /** Dashboard principal do profissional */
  toHome: () => router.replace("/(tabs)"),

  /** Acompanhamento de mapa (indo até o cliente) */
  toMapTracking: (requestId: string) =>
    r.replace({ pathname: "/(service-flow)/map-tracking", params: { requestId } }),

  /** Tela de diagnóstico no local */
  toDiagnosis: (requestId: string) =>
    r.replace({ pathname: "/(service-flow)/diagnosis", params: { requestId } }),

  /** Tela de envio de preço final/resolvido */
  toServiceResolved: (requestId: string) =>
    r.replace({ pathname: "/(service-flow)/service-resolved", params: { requestId } }),
};
