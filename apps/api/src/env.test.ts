import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const baseEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL: "https://example.com/database",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "12345678901234567890123456789012",
  JWT_REFRESH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  JWT_ACCESS_EXPIRY: "15m",
  JWT_REFRESH_EXPIRY: "7d",
  API_CORS_ORIGIN: "http://localhost:8081",
  SOCKET_CORS_ORIGIN: "http://localhost:8081",
} satisfies NodeJS.ProcessEnv;

describe("parseEnv", () => {
  it("deve normalizar aliases do R2 usados no Railway", () => {
    const parsed = parseEnv({
      ...baseEnv,
      R2_ACCOUNT_ID: "account-123",
      R2_ACCESS_KEY: "legacy-access-key",
      R2_SECRET_KEY: "legacy-secret-key",
      R2_BUCKET_NAME: "mechago-uploads",
      R2_PUBLIC_URL: "https://uploads.mechago.com.br",
    });

    expect(parsed.R2_ENDPOINT).toBe(
      "https://account-123.r2.cloudflarestorage.com",
    );
    expect(parsed.R2_ACCESS_KEY_ID).toBe("legacy-access-key");
    expect(parsed.R2_SECRET_ACCESS_KEY).toBe("legacy-secret-key");
    expect(parsed.R2_BUCKET).toBe("mechago-uploads");
  });

  it("deve preservar valores canônicos quando eles já existem", () => {
    const parsed = parseEnv({
      ...baseEnv,
      R2_ACCOUNT_ID: "account-123",
      R2_ENDPOINT: "https://custom-endpoint.example.com",
      R2_ACCESS_KEY_ID: "canonical-access-key",
      R2_SECRET_ACCESS_KEY: "canonical-secret-key",
      R2_BUCKET: "mechago-uploads",
      R2_PUBLIC_URL: "https://uploads.mechago.com.br",
    });

    expect(parsed.R2_ENDPOINT).toBe("https://custom-endpoint.example.com");
    expect(parsed.R2_ACCESS_KEY_ID).toBe("canonical-access-key");
    expect(parsed.R2_SECRET_ACCESS_KEY).toBe("canonical-secret-key");
    expect(parsed.R2_BUCKET).toBe("mechago-uploads");
  });
});
