import { describe, expect, it, vi } from "vitest";
import {
  fetchWithGenerationAuth,
  GenerationAuthError,
  requireGenerationSession,
  type GenerationAuthClient,
  type GenerationSessionLike,
} from "./generation-auth";
import { classifyError, formatToastMessage } from "./scriptora-error";

function result(session: GenerationSessionLike | null, error: { message?: string } | null = null) {
  return { data: { session }, error };
}

function userSession(
  token: string,
  expiresAt = Math.floor(Date.now() / 1000) + 3_600,
): GenerationSessionLike {
  return {
    access_token: token,
    expires_at: expiresAt,
    user: { id: "user-123" },
  };
}

function authClient(input: {
  current?: GenerationSessionLike | null;
  refreshed?: GenerationSessionLike | null;
  refreshError?: { message: string } | null;
} = {}) {
  const getSession = vi.fn(async () => result(input.current ?? null));
  const refreshSession = vi.fn(async () => result(
    input.refreshed ?? null,
    input.refreshError ?? null,
  ));
  return {
    client: { getSession, refreshSession } satisfies GenerationAuthClient,
    getSession,
    refreshSession,
  };
}

describe("generation auth", () => {
  it("uses a valid user session without refreshing", async () => {
    const auth = authClient({ current: userSession("valid-token") });

    await expect(requireGenerationSession(auth.client, { nowSeconds: 1_000 }))
      .resolves.toMatchObject({ accessToken: "valid-token", userId: "user-123" });
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes a session that is close to expiry before the request", async () => {
    const auth = authClient({
      current: userSession("stale-token", 1_030),
      refreshed: userSession("fresh-token", 2_000),
    });

    await expect(requireGenerationSession(auth.client, { nowSeconds: 1_000 }))
      .resolves.toMatchObject({ accessToken: "fresh-token" });
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not replace a missing user session with a public API key", async () => {
    const auth = authClient({ current: null, refreshed: null });

    await expect(requireGenerationSession(auth.client, { nowSeconds: 1_000 }))
      .rejects.toBeInstanceOf(GenerationAuthError);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("refreshes and replays exactly once after a 401", async () => {
    const auth = authClient({
      current: userSession("first-token"),
      refreshed: userSession("second-token"),
    });
    const usedTokens: string[] = [];

    const fetched = await fetchWithGenerationAuth(auth.client, async (session) => {
      usedTokens.push(session.accessToken);
      return new Response(null, { status: usedTokens.length === 1 ? 401 : 200 });
    });

    expect(fetched.response.status).toBe(200);
    expect(fetched.refreshedAfterUnauthorized).toBe(true);
    expect(usedTokens).toEqual(["first-token", "second-token"]);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("throws an actionable typed error after the single 401 replay", async () => {
    const auth = authClient({
      current: userSession("first-token"),
      refreshed: userSession("second-token"),
    });
    const request = vi.fn(async () => new Response(null, { status: 401 }));

    await expect(fetchWithGenerationAuth(auth.client, request))
      .rejects.toMatchObject({
        name: "GenerationAuthError",
        code: "GENERATION_AUTH_REQUIRED",
        status: 401,
      });
    expect(request).toHaveBeenCalledTimes(2);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("is classified as auth instead of a generic generation failure", () => {
    const classified = classifyError(new GenerationAuthError());

    expect(classified.category).toBe("auth");
    expect(formatToastMessage(classified)).toContain("Accedi di nuovo");
  });
});
