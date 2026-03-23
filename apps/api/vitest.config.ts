import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://mechago:mechago_dev_2026@localhost:5433/mechago",
      REDIS_URL: "redis://localhost:6379",
      JWT_SECRET: "mechago-dev-jwt-secret-change-in-production-2026",
      JWT_REFRESH_SECRET: "mechago-dev-refresh-secret-change-in-production-2026",
      JWT_ACCESS_EXPIRY: "15m",
      JWT_REFRESH_EXPIRY: "7d",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
