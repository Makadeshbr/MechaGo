import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "@/middleware/logger.middleware";
import { verifyAccessToken } from "@/utils/crypto";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "@/lib/redis";

let io: SocketIOServer;

export const initSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
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
      
      // Join self room
      socket.join(`professional:${payload.userId}`);
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user.userId }, "User connected via Socket.IO");

    socket.on("join_request", ({ requestId }) => {
      logger.info({ socketId: socket.id, requestId }, "Joined request room");
      socket.join(`request:${requestId}`);
    });

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
