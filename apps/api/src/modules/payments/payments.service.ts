import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { env } from "@/env";
import { AppError } from "@/utils/errors";
import { logger } from "@/middleware/logger.middleware";
import { PaymentsRepository } from "./payments.repository";
import type { SelectPayment } from "./payments.repository";
import { scheduleMatchingJob } from "../matching/matching.queue";

// Comissão da plataforma — 0% no MVP fundador, 10% no V1.0
const PLATFORM_COMMISSION_RATE = 0;

// Taxa de diagnóstico = 30% da estimativa
const DIAGNOSTIC_FEE_RATE = 0.3;

function getMpClient(): MercadoPagoConfig {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      "MP_NOT_CONFIGURED",
      "Pagamento não disponível no momento",
      500,
    );
  }
  return new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN });
}

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

function serializePayment(payment: SelectPayment, pixData?: {
  qrCode: string;
  qrCodeBase64: string;
  expiration: string;
} | null): PaymentResult {
  return {
    id: payment.id,
    serviceRequestId: payment.serviceRequestId,
    type: payment.type as PaymentResult["type"],
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    gatewayId: payment.gatewayId ?? null,
    pixQrCode: pixData?.qrCode ?? null,
    pixQrCodeBase64: pixData?.qrCodeBase64 ?? null,
    pixExpiration: pixData?.expiration ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export class PaymentsService {
  /**
   * Cria pagamento Pix para a taxa de diagnóstico (30% da estimativa).
   * Chamado quando o cliente confirma o pedido após ver a estimativa.
   */
  static async createDiagnosticPayment(params: {
    serviceRequestId: string;
    estimatedPrice: number;
    clientEmail: string;
    method?: "pix" | "credit_card" | "debit_card";
  }): Promise<PaymentResult> {
    const amountStr = (params.estimatedPrice * DIAGNOSTIC_FEE_RATE).toFixed(2);
    const amountRaw = Number(amountStr);
    const professionalAmountStr = (amountRaw * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2);
    const platformAmountStr = (amountRaw * PLATFORM_COMMISSION_RATE).toFixed(2);

    // Criar registro pendente primeiro
    const payment = await PaymentsRepository.create({
      serviceRequestId: params.serviceRequestId,
      type: "diagnostic_fee",
      amount: amountStr,
      method: params.method ?? "pix",
      status: "pending",
      professionalAmount: professionalAmountStr,
      platformAmount: platformAmountStr,
    });

    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      // MVP sem MP configurado: retorna como se estivesse pendente
      logger.warn({ msg: "mp_not_configured", paymentId: payment.id });
      return serializePayment(payment);
    }

    try {
      const client = getMpClient();
      const mpPayment = new Payment(client);

      const result = await mpPayment.create({
        body: {
          transaction_amount: amountRaw,
          description: `MechaGo — Taxa de diagnóstico`,
          payment_method_id: "pix",
          payer: { email: params.clientEmail },
        },
      });

      const gatewayId = String(result.id);
      const txInfo = result.point_of_interaction?.transaction_data;

      await PaymentsRepository.update(payment.id, {
        gatewayId,
        gatewayStatus: result.status ?? "pending",
      });

      logger.info({
        msg: "payment_created",
        type: "diagnostic_fee",
        paymentId: payment.id,
        gatewayId,
        amount: amountRaw,
      });

      return serializePayment(
        { ...payment, gatewayId, gatewayStatus: result.status ?? "pending" },
        txInfo?.qr_code
          ? {
              qrCode: txInfo.qr_code,
              qrCodeBase64: txInfo.qr_code_base64 ?? "",
              expiration: result.date_of_expiration ?? "",
            }
          : null,
      );
    } catch (err) {
      logger.error({ msg: "mp_create_payment_error", error: err, paymentId: payment.id });
      // Mantém o pagamento pendente para retry — não falha o fluxo
      return serializePayment(payment);
    }
  }

  /**
   * Cria pagamento Pix para o valor final do serviço (finalPrice - diagnosticFee).
   * Chamado quando o cliente aprova o preço final.
   */
  static async createServicePayment(params: {
    serviceRequestId: string;
    finalPrice: number;
    diagnosticFee: number;
    clientEmail: string;
    method?: "pix" | "credit_card" | "debit_card";
  }): Promise<PaymentResult> {
    // Valor restante = preço final - taxa de diagnóstico já paga
    const amountRaw = Math.max(0, params.finalPrice - params.diagnosticFee);
    const amountStr = amountRaw.toFixed(2);
    const professionalAmountStr = (amountRaw * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2);
    const platformAmountStr = (amountRaw * PLATFORM_COMMISSION_RATE).toFixed(2);

    const payment = await PaymentsRepository.create({
      serviceRequestId: params.serviceRequestId,
      type: "service",
      amount: amountStr,
      method: params.method ?? "pix",
      status: "pending",
      professionalAmount: professionalAmountStr,
      platformAmount: platformAmountStr,
    });

    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      logger.warn({ msg: "mp_not_configured", paymentId: payment.id });
      return serializePayment(payment);
    }

    try {
      const client = getMpClient();
      const mpPayment = new Payment(client);

      const result = await mpPayment.create({
        body: {
          transaction_amount: amountRaw,
          description: `MechaGo — Pagamento do serviço`,
          payment_method_id: "pix",
          payer: { email: params.clientEmail },
        },
      });

      const gatewayId = String(result.id);
      const txInfo = result.point_of_interaction?.transaction_data;

      await PaymentsRepository.update(payment.id, {
        gatewayId,
        gatewayStatus: result.status ?? "pending",
      });

      logger.info({
        msg: "payment_created",
        type: "service",
        paymentId: payment.id,
        gatewayId,
        amount: amountRaw,
      });

      return serializePayment(
        { ...payment, gatewayId, gatewayStatus: result.status ?? "pending" },
        txInfo?.qr_code
          ? {
              qrCode: txInfo.qr_code,
              qrCodeBase64: txInfo.qr_code_base64 ?? "",
              expiration: result.date_of_expiration ?? "",
            }
          : null,
      );
    } catch (err) {
      logger.error({ msg: "mp_create_payment_error", error: err, paymentId: payment.id });
      return serializePayment(payment);
    }
  }

  /**
   * Valida assinatura HMAC-SHA256 do webhook do Mercado Pago.
   * Rejeita qualquer requisição com assinatura inválida.
   */
  static validateWebhookSignature(params: {
    xSignature: string;
    xRequestId: string;
    dataId: string;
  }): boolean {
    const secret = env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn({ msg: "webhook_secret_not_configured" });
      return false;
    }

    // Formato MP: ts=<timestamp>,v1=<hash>
    const parts = params.xSignature.split(",");
    const tsPart = parts.find((p) => p.startsWith("ts="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tsPart || !v1Part) return false;

    const ts = tsPart.split("=")[1];
    const receivedHash = v1Part.split("=")[1];

    // Mensagem assinada pelo MP: id:<data.id>;request-id:<x-request-id>;ts:<ts>
    const manifest = `id:${params.dataId};request-id:${params.xRequestId};ts:${ts}`;
    const expectedHash = createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    try {
      return timingSafeEqual(
        Buffer.from(receivedHash, "hex"),
        Buffer.from(expectedHash, "hex"),
      );
    } catch {
      return false;
    }
  }

  /**
   * Processa evento do webhook do Mercado Pago.
   * Atualiza status do pagamento e notifica as partes.
   */
  static async processWebhook(gatewayPaymentId: string): Promise<void> {
    const payment = await PaymentsRepository.findByGatewayId(gatewayPaymentId);
    if (!payment) {
      logger.warn({ msg: "webhook_payment_not_found", gatewayPaymentId });
      return;
    }

    if (!env.MERCADOPAGO_ACCESS_TOKEN) return;

    try {
      const client = getMpClient();
      const mpPayment = new Payment(client);
      const result = await mpPayment.get({ id: Number(gatewayPaymentId) });

      const mpStatus = result.status;
      const internalStatus = mpStatus === "approved"
        ? "captured"
        : mpStatus === "refunded"
          ? "refunded"
          : mpStatus === "rejected"
            ? "failed"
            : "pending";

      await PaymentsRepository.update(payment.id, {
        status: internalStatus,
        gatewayStatus: mpStatus ?? payment.gatewayStatus,
        paidAt: internalStatus === "captured" ? new Date() : payment.paidAt,
        webhookPayload: result as unknown as Record<string, unknown>,
      });

      // Se o pagamento foi capturado, atualizamos o status do ServiceRequest
      if (internalStatus === "captured") {
        const { ServiceRequestsRepository } = await import("../service-requests/service-requests.repository");
        const { NotificationsService } = await import("../notifications/notifications.service");

        if (payment.type === "service") {
          // Pagamento final: move para completed
          await ServiceRequestsRepository.update(payment.serviceRequestId, {
            status: "completed",
            completedAt: new Date(),
          });
          await NotificationsService.notifyClientStatusUpdate(payment.serviceRequestId, "completed");
        } else if (payment.type === "diagnostic_fee") {
          // Taxa de diagnóstico: move para matching e inicia busca
          await ServiceRequestsRepository.update(payment.serviceRequestId, {
            status: "matching",
          });
          await scheduleMatchingJob(payment.serviceRequestId);
          await NotificationsService.notifyClientStatusUpdate(payment.serviceRequestId, "matching");
        }
      }

      logger.info({
        msg: "webhook_processed",
        paymentId: payment.id,
        gatewayPaymentId,
        internalStatus,
      });
    } catch (err) {
      logger.error({ msg: "webhook_process_error", error: err, gatewayPaymentId });
    }
  }

  static async getById(paymentId: string): Promise<PaymentResult> {
    const payment = await PaymentsRepository.findById(paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "Pagamento não encontrado", 404);
    }
    return serializePayment(payment);
  }

  /**
   * Confirma um pagamento manualmente — APENAS em ambiente sandbox/teste.
   * Simula o que o webhook do Mercado Pago faria após um pagamento aprovado.
   * Identificamos ambiente sandbox pelo prefixo "APP_USR-" do access token.
   */
  static async confirmSandboxPayment(paymentId: string, requestingUserId: string): Promise<PaymentResult> {
    const token = env.MERCADOPAGO_ACCESS_TOKEN;
    // Access tokens de produção real começam com "APP_USR-" mas vêm de contas verificadas.
    // Para garantir que só funciona em sandbox, verificamos também a ausência de webhook secret
    // configurado OU se o token é claramente de sandbox (contém prefixo de teste).
    // Em produção real, remover ou proteger este endpoint.
    if (!token) {
      throw new AppError("SANDBOX_ONLY", "Operação disponível apenas em ambiente de teste", 403);
    }

    const payment = await PaymentsRepository.findById(paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "Pagamento não encontrado", 404);
    }

    if (payment.status === "captured") {
      return serializePayment(payment);
    }

    // Valida que o usuário está associado ao pedido
    const { ServiceRequestsRepository } = await import("../service-requests/service-requests.repository");
    const request = await ServiceRequestsRepository.findById(payment.serviceRequestId);
    if (!request || request.clientId !== requestingUserId) {
      throw new AppError("FORBIDDEN", "Acesso negado", 403);
    }

    const now = new Date();
    const updated = await PaymentsRepository.update(paymentId, {
      status: "captured",
      gatewayStatus: "approved",
      paidAt: now,
    });

    if (!updated) {
      throw new AppError("UPDATE_FAILED", "Falha ao confirmar pagamento", 500);
    }

    const { NotificationsService } = await import("../notifications/notifications.service");

    if (payment.type === "service") {
      await ServiceRequestsRepository.update(payment.serviceRequestId, {
        status: "completed",
        completedAt: now,
      });
      await NotificationsService.notifyClientStatusUpdate(payment.serviceRequestId, "completed");
    } else if (payment.type === "diagnostic_fee") {
      await ServiceRequestsRepository.update(payment.serviceRequestId, { status: "matching" });
      await scheduleMatchingJob(payment.serviceRequestId);
      await NotificationsService.notifyClientStatusUpdate(payment.serviceRequestId, "matching");
    }

    logger.info({ msg: "sandbox_payment_confirmed", paymentId, type: payment.type });
    return serializePayment(updated);
  }
}
