import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../../../../app";
import { AuthRepository } from "../../auth.repository";
import { hashPassword } from "@/utils/crypto";

describe("Auth Integration", () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  it("POST /api/v1/auth/login - deve impedir login de CLIENT no contexto PRO", async () => {
    // Criamos um usuário cliente diretamente no banco (ou mock do repo para integração)
    const passwordHash = await hashPassword("Senha123!");
    const mockClient = {
      id: "uuid-cliente",
      email: "cliente-integration@test.com",
      passwordHash,
      type: "client" as const,
      name: "Cliente Teste",
      isActive: true,
    };

    // Mockamos apenas a busca no banco para simular a integração
    vi.spyOn(AuthRepository, "findByEmail").mockResolvedValue(mockClient as any);

    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "cliente-integration@test.com",
        password: "Senha123!",
        appContext: "pro",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("UNAUTHORIZED_APP_ACCESS");
  });
});
