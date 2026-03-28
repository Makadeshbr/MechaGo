import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "@/middleware/logger.middleware";
import { verifyAccessToken } from "@/utils/crypto";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "@/lib/redis";
import { registerTrackingGateway } from "@/modules/tracking/tracking.gateway";

let io: SocketIOServer;

export const initSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || ["http://localhost:8081"],
    },
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error: No token provided"));
      
      const payload = await verifyAccessToken(token);
      socket.data.user = payload;
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      
      // Profissionais entram na sala individual para receber chamados via push
      if (payload.role === "professional") {
        socket.join(`professional:${payload.userId}`);
      }
      next();
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "Socket.IO auth failed",
      );
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Register tracking gateway for real-time GPS tracking
  registerTrackingGateway(io);

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user.userId }, "User connected via Socket.IO");

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "User disconnected from Socket.IO");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initSocketIO first.");
  }
  return io;
};
