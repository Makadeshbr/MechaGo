import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/middleware/logger.middleware";
import { trackingService } from "./tracking.service";

// Validação Zod para payloads Socket.IO — segurança contra dados malformados
const joinRequestSchema = z.object({
  requestId: z.string().uuid(),
});

const locationSchema = z.object({
  requestId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Socket.IO gateway for real-time GPS tracking.
 *
 * Rooms:
 *   - request:{requestId}  → client + professional join this room
 *   - matching:{requestId} → professionals watching a matching request
 *
 * Events (inbound):
 *   - join_matching   { requestId }           → professional joins matching room
 *   - leave_matching  { requestId }           → professional leaves matching room
 *   - join_request    { requestId }           → client/professional joins tracking room
 *   - update_location { requestId, lat, lng } → professional broadcasts GPS to room
 *   - leave_request   { requestId }           → leave tracking room
 *
 * Events (outbound):
 *   - professional_location { lat, lng, updatedAt } → to client in room
 *   - tracking_error { message }                     → on validation failure
 */
export function registerTrackingGateway(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    const role = socket.data.role as string | undefined;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // ── Professional joins a matching room (só profissionais) ──────
    socket.on("join_matching", (payload: unknown) => {
      const parsed = joinRequestSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("tracking_error", { message: "Invalid payload: requestId must be a valid UUID" });
        return;
      }

      if (role !== "professional") {
        socket.emit("tracking_error", { message: "Only professionals can join matching rooms" });
        return;
      }

      const { requestId } = parsed.data;
      socket.join(`matching:${requestId}`);
      socket.emit("joined_matching", { requestId });
    });

    // ── Professional leaves a matching room ─────────────────────────
    socket.on("leave_matching", (payload: unknown) => {
      const parsed = joinRequestSchema.safeParse(payload);
      if (!parsed.success) return;

      const { requestId } = parsed.data;
      socket.leave(`matching:${requestId}`);
    });

    // ── Client or Professional joins a request room ────────────────
    socket.on("join_request", async (payload: unknown) => {
      try {
        const parsed = joinRequestSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit("tracking_error", { message: "Invalid payload: requestId must be a valid UUID" });
          return;
        }

        const { requestId } = parsed.data;

        if (role === "professional") {
          await trackingService.validateTrackingAccess(requestId, userId);
        } else if (role === "client") {
          await trackingService.validateClientTrackingAccess(requestId, userId);
        } else {
          socket.emit("tracking_error", { message: "Invalid role" });
          return;
        }

        const room = `request:${requestId}`;
        socket.join(room);
        socket.emit("joined_request", { requestId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join request room";
        socket.emit("tracking_error", { message });
      }
    });

    // ── Professional sends GPS update ──────────────────────────────
    socket.on("update_location", async (payload: unknown) => {
      try {
        if (role !== "professional") {
          socket.emit("tracking_error", {
            message: "Only professionals can update location",
          });
          return;
        }

        const parsed = locationSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit("tracking_error", { message: "Invalid coordinates or requestId" });
          return;
        }

        const { requestId, lat, lng } = parsed.data;

        await trackingService.validateTrackingAccess(requestId, userId);

        const room = `request:${requestId}`;
        io.to(room).emit("professional_location", {
          lat,
          lng,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update location";
        socket.emit("tracking_error", { message });
      }
    });

    // ── Leave room ─────────────────────────────────────────────────
    socket.on("leave_request", (payload: unknown) => {
      const parsed = joinRequestSchema.safeParse(payload);
      if (!parsed.success) return;

      const { requestId } = parsed.data;
      socket.leave(`request:${requestId}`);
    });

    // ── Cleanup ao desconectar ─────────────────────────────────────
    socket.on("disconnect", (reason) => {
      logger.debug({ userId, role, reason }, "Socket disconnected, rooms auto-cleaned");
    });
  });
}
