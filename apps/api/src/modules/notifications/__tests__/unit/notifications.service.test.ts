import { beforeEach, describe, expect, it, vi } from "vitest";

const emitMock = vi.fn();
const toMock = vi.fn(() => ({ emit: emitMock }));
const socketsLeaveMock = vi.fn();
const inMock = vi.fn(() => ({ socketsLeave: socketsLeaveMock }));

vi.mock("@/socket", () => ({
  getIO: () => ({
    to: toMock,
    in: inMock,
  }),
}));

import { NotificationsService } from "../../notifications.service";

describe("NotificationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyRequestClaimed", () => {
    it("deve remover os sockets do profissional vencedor da sala de matching", async () => {
      await NotificationsService.notifyRequestClaimed("req-1", "user-prof");

      expect(inMock).toHaveBeenCalledWith("professional:user-prof");
      expect(socketsLeaveMock).toHaveBeenCalledWith("matching:req-1");
    });

    it("deve emitir request_claimed com requestId e claimedBy", async () => {
      await NotificationsService.notifyRequestClaimed("req-1", "user-prof");

      expect(toMock).toHaveBeenCalledWith("matching:req-1");
      expect(emitMock).toHaveBeenCalledWith(
        "request_claimed",
        expect.objectContaining({
          requestId: "req-1",
          claimedBy: "user-prof",
          claimedAt: expect.any(String),
        }),
      );
    });
  });
});
