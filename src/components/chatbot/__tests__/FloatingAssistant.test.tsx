import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import FloatingAssistant from "../../common/FloatingAssistant";
import { shouldShowFloatingAssistant } from "@/utils/config";

const mockFetchWithTokenRefresh = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    session_id: "test-session-uuid",
    response: "Live Copilot response",
    ui_cards: [],
    suggested_actions: [],
  }),
});

vi.mock("@/utils/authService", () => ({
  fetchWithTokenRefresh: (...args: any[]) => mockFetchWithTokenRefresh(...args),
}));

describe("FloatingAssistant visibility and interaction across roles", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
    mockFetchWithTokenRefresh.mockClear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("enables SHOW_FLOATING_ASSISTANT globally", () => {
    expect(shouldShowFloatingAssistant()).toBe(true);
  });

  it.each(["student", "teacher", "hod", "admin"])(
    "renders floating button, opens chat window, and calls /api/copilot/chat/ for %s",
    async (role) => {
      sessionStorage.setItem("role", role);
      await act(async () => {
        root.render(
          <MemoryRouter>
            <FloatingAssistant />
          </MemoryRouter>
        );
      });

      const launcher = container.querySelector('button[aria-label="Open Stalight Intelligence"]') as HTMLButtonElement | null;
      expect(launcher).not.toBeNull();
      expect(launcher?.parentElement?.className).toContain("z-[9990]");
      expect(launcher?.parentElement?.className).toContain("fixed");

      await act(async () => {
        launcher!.click();
      });

      expect(container.textContent).toContain("Intelligence");

      const input = container.querySelector('input[placeholder*="Ask Stalight"], textarea[placeholder*="Ask Stalight"]') as HTMLInputElement | null;
      expect(input).not.toBeNull();

      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
        setter.call(input, "Show my summary");
        input!.dispatchEvent(new Event("input", { bubbles: true }));
      });

      await act(async () => {
        input!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(mockFetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/copilot\/chat\/$/),
        expect.objectContaining({ method: "POST" })
      );
    }
  );
});
