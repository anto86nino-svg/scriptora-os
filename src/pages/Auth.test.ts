import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Google OAuth PKCE architecture", () => {
  it("lets the Supabase client own the PKCE callback", () => {
    const source = readSource("src/integrations/supabase/client.ts");

    expect(source).toContain("detectSessionInUrl: true");
    expect(source).toContain('flowType: "pkce"');
    expect(source).toContain("persistSession: true");
    expect(source).toContain("autoRefreshToken: true");
  });

  it("does not manually exchange the OAuth code", () => {
    const source = readSource("src/pages/Auth.tsx");

    expect(source).not.toContain("exchangeCodeForSession");
    expect(source).not.toContain("tryEstablishSessionFromOAuthCallback");
  });

  it("does not automatically restart the Google OAuth flow", () => {
    const source = readSource("src/pages/Auth.tsx");

    expect(source).not.toContain("OAUTH_AUTO_RETRY_KEY");
    expect(source).not.toContain("OAUTH_CALLBACK_HANDLED_KEY");
    expect(source).not.toContain("shouldRetryOAuthCallbackInFreshFlow");
    expect(source).not.toContain("shouldRetryOAuthTimeoutInFreshFlow");
    expect(source).not.toContain("shouldWaitForLateOAuthSession");
  });

  it("starts Google OAuth only from the explicit login handler", () => {
    const source = readSource("src/pages/Auth.tsx");

    const calls = source.match(/signInWithOAuth\s*\(/g) ?? [];

    expect(calls).toHaveLength(1);
    expect(source).toContain('provider: "google"');
    expect(source).toContain("redirectTo: getAuthRedirectUrl()");
  });
});
