import { waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const unsubscribe = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  frozenOAuthCallback: { hasCallback: false, error: "", code: "" },
  captureOAuthCallbackFromUrl: () => ({ hasCallback: false, error: "", code: "" }),
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
    rpc: vi.fn(async () => ({ data: 0, error: null })),
  },
}));

describe("production entry boot", () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  });

  afterAll(() => {
    document.body.innerHTML = "";
  });

  it("mounts a visible Scriptora surface instead of leaving an empty root", async () => {
    await import("./main");

    await waitFor(
      () => {
        const root = document.getElementById("root");
        expect(root).not.toBeNull();
        expect(root?.childElementCount).toBeGreaterThan(0);
        expect(root).toHaveTextContent(/Scriptora/i);
        expect(root).not.toHaveTextContent("Avvio fallito");
      },
      { timeout: 5_000 },
    );
  });
});
