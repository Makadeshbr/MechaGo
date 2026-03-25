import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../../app";
import { AuthRepository } from "../../auth.repository";
import { hashPassword } from "@/utils/crypto";

type AuthUserRecord = NonNullable<
  Awaited<ReturnType<typeof AuthRepository.findByEmail>>
>;

describe("Auth Integration", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it("POST /api/v1/auth/login - deve impedir login de CLIENT no contexto PRO", async () => {
    // Criamos um usuário cliente diretamente no banco (ou mock do repo para integração)
    const passwordHash = await hashPassword("Senha123!");
    const mockClient: AuthUserRecord = {
      id: "uuid-cliente",
      email: "cliente-integration@test.com",
      passwordHash,
      type: "client" as const,
      name: "Cliente Teste",
      phone: "11999999999",
      cpfCnpj: "12345678900",
      avatarUrl: null,
      rating: "0.00",
      totalReviews: 0,
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mockamos apenas a busca no banco para simular a integração
    vi.spyOn(AuthRepository, "findByEmail").mockResolvedValue(mockClient);

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
