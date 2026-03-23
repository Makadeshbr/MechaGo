import { AppError } from "@/utils/errors";

/**
 * Definições de Preço Base (PRD V3)
 * Estes valores seriam idealmente buscados da tabela `price_tables`,
 * mas mantemos os defaults do MVP aqui para fallback.
 */
const BASE_PRICES = {
  tire: 55,       // Troca de pneu
  battery: 115,    // Carga de bateria (auxiliar de partida)
  electric: 130,   // Pane elétrica básica
  overheat: 145,   // Superaquecimento
  fuel: 95,        // Pane seca (socorro combustível)
  other: 180,      // Diagnóstico complexo
};

const MULTIPLIERS = {
  vehicle: {
    car: 1.0,
    moto: 0.85,
    suv: 1.15,
    truck: 2.0,
  },
  time: {
    day: 1.0,         // 06:00 - 22:00
    night: 1.25,      // 22:00 - 06:00
    holiday: 1.20,
  },
  location: {
    urban: 1.0,
    highway: 1.15,
    rural: 1.30,
  },
  distance: {
    short: 1.0,       // <= 5km
    medium: 1.10,     // 5km - 15km
    long: 1.25,       // > 15km
  }
};

interface PricingInput {
  problemType: keyof typeof BASE_PRICES;
  vehicleType: keyof typeof MULTIPLIERS.vehicle;
  locationContext: keyof typeof MULTIPLIERS.location;
  distanceKm: number;
  isNight?: boolean;
  isHoliday?: boolean;
}

export interface PricingResult {
  basePrice: number;
  estimatedPrice: number;
  diagnosticFee: number;
  multipliers: {
    vehicle: number;
    time: number;
    location: number;
    distance: number;
  };
}

export class PricingService {
  /**
   * Calcula a estimativa de preço baseada na Fórmula V3
   * Preço = Base × Veículo × Horário × Local × Distância
   * 
   * @param input Dados para o cálculo
   * @returns Resultado detalhado com todos os multiplicadores aplicados
   */
  static calculateEstimate(input: PricingInput): PricingResult {
    const basePrice = BASE_PRICES[input.problemType];
    if (!basePrice) {
      throw new AppError("INVALID_PROBLEM_TYPE", "Tipo de problema inválido para precificação", 400);
    }

    const vehicleMultiplier = MULTIPLIERS.vehicle[input.vehicleType] || 1.0;
    const locationMultiplier = MULTIPLIERS.location[input.locationContext] || 1.0;
    
    // Multiplicador de Horário
    let timeMultiplier = MULTIPLIERS.time.day;
    if (input.isNight) timeMultiplier = MULTIPLIERS.time.night;
    if (input.isHoliday) timeMultiplier = MULTIPLIERS.time.holiday;

    // Multiplicador de Distância
    let distanceMultiplier = MULTIPLIERS.distance.short;
    if (input.distanceKm > 5 && input.distanceKm <= 15) {
      distanceMultiplier = MULTIPLIERS.distance.medium;
    } else if (input.distanceKm > 15) {
      distanceMultiplier = MULTIPLIERS.distance.long;
    }

    // Cálculo Final (Fórmula V3)
    const estimatedPrice = basePrice * 
                          vehicleMultiplier * 
                          timeMultiplier * 
                          locationMultiplier * 
                          distanceMultiplier;

    // Arredondar para 2 casas ANTES de calcular a taxa de diagnóstico
    // para evitar erros de precisão IEEE 754 (ex: 373.749... em vez de 373.75)
    const roundedPrice = Math.round(estimatedPrice * 100) / 100;

    /**
     * Taxa de Diagnóstico (Pré-autorização)
     * No MVP, a taxa de diagnóstico é fixa em 30% do valor estimado,
     * com mínimo de R$ 35,00.
     */
    const diagnosticFee = Math.max(35, roundedPrice * 0.30);

    return {
      basePrice,
      estimatedPrice: roundedPrice,
      diagnosticFee: Math.round(diagnosticFee * 100) / 100,
      multipliers: {
        vehicle: vehicleMultiplier,
        time: timeMultiplier,
        location: locationMultiplier,
        distance: distanceMultiplier,
      }
    };
  }

  /**
   * Valida se o preço final definido pelo profissional está dentro da margem de ±25%
   * @param estimatedPrice Preço da estimativa inicial
   * @param finalPrice Preço final proposto pelo profissional
   * @param justification Justificativa se o preço estiver fora da margem
   */
  static validateFinalPrice(
    estimatedPrice: number, 
    finalPrice: number, 
    justification?: string
  ): void {
    const margin = estimatedPrice * 0.25;
    const isOutOffMargin = finalPrice > (estimatedPrice + margin) || 
                           finalPrice < (estimatedPrice - margin);

    if (isOutOffMargin && (!justification || justification.length < 10)) {
      throw new AppError(
        "PRICE_JUSTIFICATION_REQUIRED", 
        "Justificativa obrigatória para preço fora da margem de 25%", 
        400
      );
    }
  }
}
