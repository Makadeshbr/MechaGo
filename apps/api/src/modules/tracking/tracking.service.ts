import { eq } from "drizzle-orm";
import { db } from "../../db";
import { serviceRequests, professionals } from "../../db/schema";
import { Errors } from "../../utils/errors";

// Status em que o tracking GPS é permitido
const TRACKABLE_STATUSES = [
  "accepted",
  "professional_enroute",
  "professional_arrived",
  "diagnosing",
  "resolved",
] as const;

export class TrackingService {
  /**
   * Validate that a professional is assigned to a service request
   * and the request is in a trackable status.
   */
  async validateTrackingAccess(
    requestId: string,
    userId: string,
  ): Promise<void> {
    const [result] = await db
      .select({
        professionalId: serviceRequests.professionalId,
        status: serviceRequests.status,
        userProfessionalId: professionals.id
      })
      .from(serviceRequests)
      .leftJoin(professionals, eq(professionals.userId, userId))
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!result) {
      throw Errors.notFound("Service request");
    }

    if (!result.userProfessionalId || result.professionalId !== result.userProfessionalId) {
      throw Errors.forbidden();
    }

    if (!TRACKABLE_STATUSES.includes(result.status as typeof TRACKABLE_STATUSES[number])) {
      throw Errors.validation(
        `Cannot track location for request in status: ${result.status}`,
      );
    }
  }

  /**
   * Validate that a client owns a service request
   * and the request is in a trackable status.
   */
  async validateClientTrackingAccess(
    requestId: string,
    clientId: string,
  ): Promise<void> {
    const [request] = await db
      .select({ clientId: serviceRequests.clientId, status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw Errors.notFound("Service request");
    }

    if (request.clientId !== clientId) {
      throw Errors.forbidden();
    }

    if (!TRACKABLE_STATUSES.includes(request.status as typeof TRACKABLE_STATUSES[number])) {
      throw Errors.validation(
        `Cannot track location for request in status: ${request.status}`,
      );
    }
  }
}

export const trackingService = new TrackingService();
