import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: async (c: { set: (key: string, value: string) => void }, next: () => Promise<void>) => {
    c.set("userId", "user-uuid-123");
    c.set("userType", "client");
    await next();
  },
  requireType: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import { createApp } from "../../../../app";
import { VehiclesService } from "../../vehicles.service";

describe("Vehicles Integration", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it("GET /api/v1/vehicles/:id/deletion-impact - deve retornar impacto de exclusao", async () => {
    vi.spyOn(VehiclesService, "getDeletionImpact").mockResolvedValue({
      canDelete: true,
      willCancelPendingRequests: true,
      pendingRequestCount: 1,
      blockingRequestCount: 0,
      message:
        "Ao remover este veiculo, suas solicitacoes pendentes serao canceladas automaticamente.",
    });

    const res = await app.request(
      "/api/v1/vehicles/7840fe4f-1bd0-4030-9162-ac1c2adf426a/deletion-impact",
      {
        method: "GET",
      },
    );

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.impact.canDelete).toBe(true);
    expect(body.impact.willCancelPendingRequests).toBe(true);
  });
});
