import { describe, it, expect } from "vitest";
import { PricingService } from "../../pricing.service";

describe("PricingService", () => {
  describe("calculateEstimate (Fórmula V3)", () => {
    it("deve calcular preço base para carro urbano diurno (cenário controle)", () => {
      // Base bateria: R$115 × carro ×1.0 × dia ×1.0 × urbano ×1.0 × ≤5km ×1.0
      const result = PricingService.calculateEstimate({
        problemType: "battery",
        vehicleType: "car",
        locationContext: "urban",
        distanceKm: 3,
      });

      expect(result.estimatedPrice).toBe(115);
      expect(result.diagnosticFee).toBe(35); // 30% de 115 é 34.5, mínimo é 35
    });

    it("deve aplicar multiplicador noturno de 1.25", () => {
      // Base bateria: R$115 × 1.25 (noturno) = 143.75
      const result = PricingService.calculateEstimate({
        problemType: "battery",
        vehicleType: "car",
        locationContext: "urban",
        distanceKm: 3,
        isNight: true,
      });

      expect(result.estimatedPrice).toBe(143.75);
      expect(result.multipliers.time).toBe(1.25);
    });

    it("deve aplicar multiplicador de rodovia (1.15) e veículo SUV (1.15)", () => {
      // Base pneu: R$55 × SUV ×1.15 × Rodovia ×1.15 = 72.74
      const result = PricingService.calculateEstimate({
        problemType: "tire",
        vehicleType: "suv",
        locationContext: "highway",
        distanceKm: 4,
      });

      expect(result.estimatedPrice).toBe(72.74);
      expect(result.multipliers.location).toBe(1.15);
      expect(result.multipliers.vehicle).toBe(1.15);
    });

    it("deve aplicar multiplicador de distância longa (>15km)", () => {
      // Base combustível: R$95 × Longa (1.25) = 118.75
      const result = PricingService.calculateEstimate({
        problemType: "fuel",
        vehicleType: "car",
        locationContext: "urban",
        distanceKm: 20,
      });

      expect(result.estimatedPrice).toBe(118.75);
      expect(result.multipliers.distance).toBe(1.25);
    });

    it("deve acumular múltiplos multiplicadores (Caminhão em Rodovia à Noite)", () => {
      // Base elétrica: R$130 × Caminhão ×2.0 × Noturno ×1.25 × Rodovia ×1.15 = 373.75
      const result = PricingService.calculateEstimate({
        problemType: "electric",
        vehicleType: "truck",
        locationContext: "highway",
        distanceKm: 5,
        isNight: true,
      });

      expect(result.estimatedPrice).toBe(373.75);
      expect(result.diagnosticFee).toBe(112.13); // 30% de 373.75 = 112.125 -> 112.13
    });
  });

  describe("validateFinalPrice", () => {
    it("deve aceitar preço dentro da margem de 25%", () => {
      // Est: 100, Final: 120 (dentro dos 125)
      expect(() => 
        PricingService.validateFinalPrice(100, 120)
      ).not.toThrow();
    });

    it("deve rejeitar preço acima da margem sem justificativa", () => {
      expect(() => 
        PricingService.validateFinalPrice(100, 130)
      ).toThrow("Justificativa obrigatória para preço fora da margem de 25%");
    });

    it("deve aceitar preço fora da margem COM justificativa válida", () => {
      expect(() => 
        PricingService.validateFinalPrice(100, 130, "Troca de cabo de bateria extra")
      ).not.toThrow();
    });
  });
});
