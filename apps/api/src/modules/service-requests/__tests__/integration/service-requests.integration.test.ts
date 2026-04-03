import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: async (
    c: { set: (key: string, value: string) => void },
    next: () => Promise<void>,
  ) => {
    c.set("userId", "client-user-id");
    c.set("userType", "client");
    await next();
  },
  requireType: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import { createApp } from "../../../../app";
import { ServiceRequestsService } from "../../service-requests.service";
import { MatchingService } from "../../../matching/matching.service";
import { serviceRequestSummarySchema } from "@mechago/shared";

type ServiceRequestSummary = Awaited<ReturnType<typeof ServiceRequestsService.getById>>;

describe("Service Requests Integration", () => {
  let app: ReturnType<typeof createApp>;
  const enrichedSummary: ServiceRequestSummary = {
    id: "11111111-1111-4111-8111-111111111111",
    status: "waiting_queue",
    context: "urban",
    problemType: "battery",
    estimatedPrice: 115,
    finalPrice: null,
    diagnosticFee: 35,
    roadwayPhone: null,
    roadwayName: null,
    address: "Rua das Flores, 123",
    createdAt: new Date().toISOString(),
    clientLatitude: -23.5505,
    clientLongitude: -46.6333,
    queuePosition: 2,
    queueLabel: "2º da fila",
    estimatedArrivalMinutes: 8,
    distanceKm: null,
    supportPhone: "0800-123-456",
    diagnosisPhotoUrl: null,
    completionPhotoUrl: null,
    priceJustification: null,
    resolvedOnSite: null,
    professionalId: null,
    professionalLatitude: null,
    professionalLongitude: null,
    clientId: "22222222-2222-4222-8222-222222222222",
    professional: null,
    arrivedAt: null,
    completedAt: null,
  };

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/v1/service-requests/:id - deve retornar contrato enriquecido válido", async () => {
    vi.spyOn(ServiceRequestsService, "getById").mockResolvedValue(enrichedSummary);

    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111",
      { method: "GET" },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => serviceRequestSummarySchema.parse(enrichedSummary)).not.toThrow();
    expect(() => serviceRequestSummarySchema.parse(body)).not.toThrow();
    expect(body.queueLabel).toBe("2º da fila");
    expect(body.supportPhone).toBe("0800-123-456");
  });

  it("POST /api/v1/service-requests/:id/accept - deve aceitar chamado", async () => {
    vi.spyOn(MatchingService, "acceptRequest").mockResolvedValue({
      id: "req-1",
      status: "accepted",
    } as never);

    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111/accept",
      { method: "POST" },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(MatchingService.acceptRequest).toHaveBeenCalledWith(
      "client-user-id",
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("POST /api/v1/service-requests/:id/arrived - deve validar body e confirmar chegada", async () => {
    const arrivedSpy = vi.spyOn(ServiceRequestsService, "arrived").mockResolvedValue({
      id: "req-1",
      status: "professional_arrived",
    } as never);

    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111/arrived",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: -23.55052,
          longitude: -46.63331,
        }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(arrivedSpy).toHaveBeenCalledWith(
      "client-user-id",
      "11111111-1111-4111-8111-111111111111",
      {
        latitude: -23.55052,
        longitude: -46.63331,
      },
    );
  });

  it("POST /api/v1/service-requests/:id/arrived - deve rejeitar payload inválido", async () => {
    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111/arrived",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 999,
          longitude: -46.63331,
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it("POST /api/v1/service-requests/:id/diagnosis - deve rejeitar payload inválido", async () => {
    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111/diagnosis",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisNotes: "curto",
          canResolveOnSite: true,
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it("POST /api/v1/service-requests/:id/resolve - deve rejeitar payload sem foto", async () => {
    const response = await app.request(
      "/api/v1/service-requests/11111111-1111-4111-8111-111111111111/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPrice: 120,
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});
