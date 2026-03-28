/**
 * Raio de busca para matching de profissionais
 */
export const MATCHING_RADIUS = {
  URBAN: 10000,   // 10km
  HIGHWAY: 30000, // 30km
} as const;

/**
 * Tempo máximo para o profissional aceitar um chamado (3 minutos)
 */
export const ACCEPT_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Distância máxima para confirmar chegada (200 metros)
 */
export const ARRIVAL_DISTANCE_THRESHOLD_METERS = 200;

/**
 * Distância padrão para estimativa inicial se não informada (5km)
 */
export const DEFAULT_ESTIMATE_DISTANCE_KM = 5;
