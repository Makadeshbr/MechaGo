import { logger } from "@/middleware/logger.middleware";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ProfessionalNotificationTarget {
  id: string;
  user_id: string;
  distance_meters: number;
}

interface NewRequestNotificationPayload {
  id: string;
  problemType: string;
  estimatedPrice: string | null;
  clientLatitude: string;
  clientLongitude: string;
  createdAt: Date;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    type: string;
  };
}

/**
 * Busca o Expo Push Token de um usuário pelo userId.
 * O campo fcmToken armazena o Expo Push Token (ExponentPushToken[...]).
 * Retorna null se o usuário não tiver token registrado.
 */
async function getExpoPushToken(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { fcmToken: true },
  });
  return user?.fcmToken ?? null;
}

/**
 * Verifica se é um token válido do Expo Push Service.
 * Tokens válidos começam com "ExponentPushToken[" ou "ExpoPushToken[".
 */
function isValidExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

/**
 * Envia uma notificação push via Expo Push API para um usuário específico.
 * Opera em modo fire-and-forget: falhas de push NÃO abortam o fluxo principal.
 *
 * Usa a Expo Push API (https://exp.host/--/api/v2/push/send) que aceita
 * ExponentPushTokens gerados pelo SDK do Expo nos apps mobile.
 *
 * @param userId - ID do destinatário
 * @param title - Título da notificação
 * @param body - Corpo da notificação
 * @param data - Payload de dados extras (key-value string)
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  const token = await getExpoPushToken(userId);
  if (!token) {
    logger.debug({ userId, title }, "Usuário sem push token registrado, push ignorado");
    return;
  }

  if (!isValidExpoPushToken(token)) {
    logger.debug({ userId, title, token: token.slice(0, 20) }, "Token não é Expo Push Token, push ignorado");
    return;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: "default",
        channelId: "mechago_default",
        priority: "high",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ userId, title, status: response.status, error: errorText }, "Expo Push API retornou erro");
      return;
    }

    const result = await response.json() as { data?: { status: string; message?: string } };
    const ticketStatus = result?.data?.status;

    if (ticketStatus === "error") {
      logger.warn({ userId, title, ticket: result?.data }, "Expo Push ticket com erro");
    } else {
      logger.info({ userId, title, ticketStatus }, "Expo Push enviado com sucesso");
    }
  } catch (err) {
    // Push falhou mas NÃO deve quebrar a transação principal
    logger.warn({ userId, title, error: err }, "Falha ao enviar Expo Push");
  }
}

export class NotificationsService {
  /**
   * Envia notificação push + Socket.IO para profissionais sobre um novo chamado
   */
  static async notifyProfessionals(
    professionals: ProfessionalNotificationTarget[],
    request: NewRequestNotificationPayload,
  ) {
    logger.info({ request_id: request.id }, "Notificando profissionais do novo chamado");

    // Push FCM real + Socket.IO real-time para cada profissional elegível
    for (const p of professionals) {
      await sendPushToUser(
        p.user_id,
        "🔧 Novo chamado próximo!",
        `${request.vehicle.brand} ${request.vehicle.model} — ${request.problemType}`,
        {
          type: "new_request",
          requestId: request.id,
          distanceMeters: String(p.distance_meters),
        },
      );
    }

    // Socket.IO para profissionais com app aberto (complementar ao push)
    const { getIO } = await import("@/socket");
    const io = getIO();

    professionals.forEach((p) => {
      io.to(`professional:${p.user_id}`).emit("new_request", {
        requestId: request.id,
        problemType: request.problemType,
        clientLatitude: request.clientLatitude,
        clientLongitude: request.clientLongitude,
        distanceMeters: p.distance_meters,
        estimatedPrice: request.estimatedPrice,
        createdAt: request.createdAt,
        vehicle: request.vehicle,
      });
    });
  }

  /**
   * Notifica cliente via Socket.IO sobre atualização de status.
   * Também envia push FCM se o app estiver em background.
   */
  static async notifyClientStatusUpdate(
    requestId: string,
    status: string,
    payload?: Record<string, unknown>,
  ) {
    const { getIO } = await import("@/socket");
    const io = getIO();

    io.to(`request:${requestId}`).emit("status_update", {
      status,
      ...payload,
    });
  }

  static async notifyRequestClaimed(requestId: string, claimedBy: string) {
    const { getIO } = await import("@/socket");
    const io = getIO();
    const claimedAt = new Date().toISOString();

    io.in(`professional:${claimedBy}`).socketsLeave(`matching:${requestId}`);

    // O frontend ignora o evento quando claimedBy === usuario logado,
    // evitando auto-notificacao em cenarios com multiplos sockets/dispositivos.
    io.to(`matching:${requestId}`).emit("request_claimed", {
      requestId,
      claimedBy,
      claimedAt,
    });
    logger.info(
      { requestId, claimedBy, claimedAt },
      "Notified matching room that request was claimed",
    );
  }

  static async notifyQueueUpdate(requestId: string, payload: Record<string, string | number | boolean | null>) {
    const { getIO } = await import("@/socket");
    const io = getIO();

    io.to(`request:${requestId}`).emit("queue_update", payload);
  }

  static async notifyProfessionalCancelled(requestId: string, professionalId: string) {
    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findById(professionalId);
    if (!professional) return;

    const { getIO } = await import("@/socket");
    const io = getIO();

    io.to(`professional:${professional.userId}`).emit("request_cancelled", { requestId });

    // Push FCM — usuário pode estar com app fechado
    await sendPushToUser(
      professional.userId,
      "❌ Chamado cancelado",
      "O cliente cancelou este chamado.",
      { type: "request_cancelled", requestId },
    );

    logger.info({ requestId, professionalId }, "Notified professional about cancellation");
  }

  static async notifyProfessionalStatusUpdate(
    requestId: string,
    professionalId: string,
    status: string,
    payload?: Record<string, unknown>,
  ) {
    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findById(professionalId);
    if (!professional) return;

    const { getIO } = await import("@/socket");
    const io = getIO();

    io.to(`professional:${professional.userId}`).emit("status_update", {
      requestId,
      status,
      ...payload,
    });
    logger.info({ requestId, professionalId, status }, "Notified professional about status update");
  }
}

