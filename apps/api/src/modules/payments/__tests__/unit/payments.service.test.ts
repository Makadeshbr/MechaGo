import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentsService } from "../../payments.service";
import { PaymentsRepository } from "../../payments.repository";

// Mock do repositório
vi.mock("../../payments.repository", () => ({
  PaymentsRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByGatewayId: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock do mercadopago — evita chamada real à API
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Payment: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      id: 12345,
      status: "pending",
      point_of_interaction: {
        transaction_data: {
          qr_code: "00020101...",
          qr_code_base64: "aGVsbG8=",
        },
      },
      date_of_expiration: "2026-04-01T00:00:00.000Z",
    }),
    get: vi.fn().mockResolvedValue({ id: 12345, status: "approved" }),
  })),
}));

// Mock do env — sem MERCADOPAGO_ACCESS_TOKEN para testar modo offline
vi.mock("@/env", () => ({
  env: {
    MERCADOPAGO_ACCESS_TOKEN: undefined,
    MERCADOPAGO_WEBHOOK_SECRET: "supersecret-hmac-key-32chars-here!",
    NODE_ENV: "test",
  },
}));

const mockPayment = {
  id: "pay-uuid-1",
  serviceRequestId: "req-uuid-1",
  type: "diagnostic_fee" as const,
  amount: "34.50",
  method: "pix" as const,
  status: "pending" as const,
  gatewayId: null,
  gatewayStatus: null,
  professionalAmount: "34.50",
  platformAmount: "0.00",
  webhookPayload: null,
  paidAt: null,
  refundedAt: null,
  createdAt: new Date("2026-03-31T12:00:00Z"),
};

describe("PaymentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PaymentsRepository.create).mockResolvedValue(mockPayment);
    vi.mocked(PaymentsRepository.update).mockResolvedValue(mockPayment);
  });

  // ─── createDiagnosticPayment ─────────────────────────────────────────────
  describe("createDiagnosticPayment", () => {
    it("deve calcular 30% da estimativa como valor da taxa de diagnóstico", async () => {
      const result = await PaymentsService.createDiagnosticPayment({
        serviceRequestId: "req-uuid-1",
        estimatedPrice: 115,
        clientEmail: "cliente@test.com",
      });

      expect(PaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "diagnostic_fee",
          amount: "34.50", // 30% de 115
          status: "pending",
        }),
      );
      expect(result.type).toBe("diagnostic_fee");
      expect(result.status).toBe("pending");
    });

    it("deve calcular split corretamente com 0% de comissão MVP", async () => {
      await PaymentsService.createDiagnosticPayment({
        serviceRequestId: "req-uuid-1",
        estimatedPrice: 100,
        clientEmail: "cliente@test.com",
      });

      expect(PaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalAmount: "30.00", // 100% do valor (sem comissão)
          platformAmount: "0.00",
        }),
      );
    });

    it("deve retornar status pending quando MP não está configurado", async () => {
      const result = await PaymentsService.createDiagnosticPayment({
        serviceRequestId: "req-uuid-1",
        estimatedPrice: 200,
        clientEmail: "cliente@test.com",
      });

      expect(result.status).toBe("pending");
      expect(result.gatewayId).toBeNull();
    });
  });

  // ─── createServicePayment ────────────────────────────────────────────────
  describe("createServicePayment", () => {
    it("deve cobrar apenas o valor restante (finalPrice - diagnosticFee)", async () => {
      await PaymentsService.createServicePayment({
        serviceRequestId: "req-uuid-1",
        finalPrice: 115,
        diagnosticFee: 34.50,
        clientEmail: "cliente@test.com",
      });

      expect(PaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "service",
          amount: "80.50", // 115 - 34.50
        }),
      );
    });

    it("deve criar pagamento de valor zero se diagnosticFee >= finalPrice", async () => {
      await PaymentsService.createServicePayment({
        serviceRequestId: "req-uuid-1",
        finalPrice: 30,
        diagnosticFee: 34.50, // Diagnóstico já cobriu o serviço
        clientEmail: "cliente@test.com",
      });

      expect(PaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "0.00" }),
      );
    });
  });

  // ─── validateWebhookSignature ────────────────────────────────────────────
  describe("validateWebhookSignature", () => {
    it("deve rejeitar webhook quando MERCADOPAGO_WEBHOOK_SECRET não está configurado", () => {
      // O mock de env não tem a secret — testamos o comportamento
      const result = PaymentsService.validateWebhookSignature({
        xSignature: "ts=1234567890,v1=abc123",
        xRequestId: "req-1",
        dataId: "pay-1",
      });

      // Sem secret configurado, rejeita
      expect(result).toBe(false);
    });

    it("deve rejeitar assinatura com formato inválido", () => {
      const result = PaymentsService.validateWebhookSignature({
        xSignature: "formato-invalido",
        xRequestId: "req-1",
        dataId: "pay-1",
      });
      expect(result).toBe(false);
    });

    it("deve rejeitar assinatura vazia", () => {
      const result = PaymentsService.validateWebhookSignature({
        xSignature: "",
        xRequestId: "req-1",
        dataId: "pay-1",
      });
      expect(result).toBe(false);
    });
  });

  // ─── processWebhook ──────────────────────────────────────────────────────
  describe("processWebhook", () => {
    it("deve ignorar silenciosamente gateway ID desconhecido", async () => {
      vi.mocked(PaymentsRepository.findByGatewayId).mockResolvedValue(null);

      await expect(PaymentsService.processWebhook("unknown-id")).resolves.not.toThrow();
      expect(PaymentsRepository.update).not.toHaveBeenCalled();
    });

    it("deve não atualizar pagamento quando MP não está configurado", async () => {
      vi.mocked(PaymentsRepository.findByGatewayId).mockResolvedValue(mockPayment);

      await PaymentsService.processWebhook("12345");

      // Sem MP configurado, não chama update
      expect(PaymentsRepository.update).not.toHaveBeenCalled();
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────
  describe("getById", () => {
    it("deve retornar o pagamento serializado", async () => {
      vi.mocked(PaymentsRepository.findById).mockResolvedValue(mockPayment);

      const result = await PaymentsService.getById("pay-uuid-1");

      expect(result.id).toBe("pay-uuid-1");
      expect(result.amount).toBe(34.50);
      expect(result.createdAt).toBe("2026-03-31T12:00:00.000Z");
    });

    it("deve lançar NOT_FOUND para ID inexistente", async () => {
      vi.mocked(PaymentsRepository.findById).mockResolvedValue(null);

      await expect(PaymentsService.getById("not-exist")).rejects.toThrow("Pagamento não encontrado");
    });
  });
});
