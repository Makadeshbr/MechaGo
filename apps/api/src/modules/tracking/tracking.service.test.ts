import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db";
import { trackingService } from "./tracking.service";

vi.mock("../../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

function buildSelectMock(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

describe("TrackingService", () => {
  const selectMock = vi.mocked(db.select);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateTrackingAccess", () => {
    it("deve permitir acesso quando o profissional é o dono do chamado", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([
          {
            professionalId: "prof-1",
            status: "accepted",
            userProfessionalId: "prof-1",
          },
        ]) as never,
      );

      await expect(
        trackingService.validateTrackingAccess("req-1", "user-1"),
      ).resolves.not.toThrow();
    });

    it("deve rejeitar quando o usuário não é o profissional do chamado", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([
          {
            professionalId: "prof-1",
            status: "accepted",
            userProfessionalId: "prof-2",
          },
        ]) as never,
      );

      await expect(
        trackingService.validateTrackingAccess("req-1", "user-1"),
      ).rejects.toThrow("Acesso negado");
    });

    it("deve rejeitar status não rastreável", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([
          {
            professionalId: "prof-1",
            status: "completed",
            userProfessionalId: "prof-1",
          },
        ]) as never,
      );

      await expect(
        trackingService.validateTrackingAccess("req-1", "user-1"),
      ).rejects.toThrow("Cannot track location for request in status: completed");
    });
  });

  describe("validateClientTrackingAccess", () => {
    it("deve permitir acesso quando o cliente é o dono do chamado", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([{ clientId: "client-1", status: "diagnosing" }]) as never,
      );

      await expect(
        trackingService.validateClientTrackingAccess("req-1", "client-1"),
      ).resolves.not.toThrow();
    });

    it("deve rejeitar quando o cliente não é o dono do chamado", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([{ clientId: "client-1", status: "accepted" }]) as never,
      );

      await expect(
        trackingService.validateClientTrackingAccess("req-1", "client-2"),
      ).rejects.toThrow("Acesso negado");
    });

    it("deve rejeitar status não rastreável para cliente", async () => {
      selectMock.mockReturnValue(
        buildSelectMock([{ clientId: "client-1", status: "cancelled_client" }]) as never,
      );

      await expect(
        trackingService.validateClientTrackingAccess("req-1", "client-1"),
      ).rejects.toThrow(
        "Cannot track location for request in status: cancelled_client",
      );
    });
  });
});
