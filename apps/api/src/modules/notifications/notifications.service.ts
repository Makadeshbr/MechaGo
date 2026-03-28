import { logger } from "@/middleware/logger.middleware";

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

export class NotificationsService {
  /**
   * Envia notificacao para o profissional sobre um novo chamado
   */
  static async notifyProfessionals(
    professionals: ProfessionalNotificationTarget[],
    request: NewRequestNotificationPayload,
  ) {
    logger.info({ request_id: request.id }, "Notificando profissionais do novo chamado via Push");

    // Simulação do envio de Push pelo Firebase Admin SDK (V1.0 MVP usa logger)
    for (const p of professionals) {
      logger.info({ professional_id: p.id, user_id: p.user_id }, "FCM Push enviado");
    }

    // O Socket.IO evento new_request vai cuidar do real-time do app aberto
    const { getIO } = await import("@/socket");
    const io = getIO();
    
    professionals.forEach(p => {
      io.to(`professional:${p.user_id}`).emit("new_request", {
        requestId: request.id,
        problemType: request.problemType,
        clientLatitude: request.clientLatitude,
        clientLongitude: request.clientLongitude,
        distanceMeters: p.distance_meters,
        estimatedPrice: request.estimatedPrice,
        createdAt: request.createdAt,
        vehicle: request.vehicle
      });
    });
  }

  static async notifyClientStatusUpdate(
    requestId: string,
    status: string,
    payload?: Record<string, unknown>,
  ) {
    const { getIO } = await import("@/socket");
    const io = getIO();
    
    io.to(`request:${requestId}`).emit("status_update", {
      status,
      ...payload
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
