import { describe, expect, it } from "vitest";
import {
  shouldRetryOAuthCallbackInFreshFlow,
  shouldRetryOAuthTimeoutInFreshFlow,
  shouldWaitForLateOAuthSession,
} from "./Auth";

describe("Google OAuth callback recovery", () => {
  it("restarts Google flow once for recoverable PKCE callbacks without a session", () => {
    expect(shouldRetryOAuthCallbackInFreshFlow({
      hasCode: true,
      hasSession: false,
      recoverable: true,
      alreadyRetried: false,
    })).toBe(true);
  });

  it("does not retry when a session exists or retry was already attempted", () => {
    expect(shouldRetryOAuthCallbackInFreshFlow({
      hasCode: true,
      hasSession: true,
      recoverable: true,
      alreadyRetried: false,
    })).toBe(false);

    expect(shouldRetryOAuthCallbackInFreshFlow({
      hasCode: true,
      hasSession: false,
      recoverable: true,
      alreadyRetried: true,
    })).toBe(false);
  });

  it("waits for a late session instead of hard-failing after the automatic retry", () => {
    expect(shouldWaitForLateOAuthSession({
      hasCode: true,
      hasSession: false,
      alreadyRetried: true,
    })).toBe(true);

    expect(shouldWaitForLateOAuthSession({
      hasCode: true,
      hasSession: true,
      alreadyRetried: true,
    })).toBe(false);
  });

  it("restarts Google once when the callback timeout has a code but no session", () => {
    expect(shouldRetryOAuthTimeoutInFreshFlow({
      hasCode: true,
      hasSession: false,
      alreadyRetried: false,
    })).toBe(true);

    expect(shouldRetryOAuthTimeoutInFreshFlow({
      hasCode: true,
      hasSession: false,
      alreadyRetried: true,
    })).toBe(false);

    expect(shouldRetryOAuthTimeoutInFreshFlow({
      hasCode: false,
      hasSession: false,
      alreadyRetried: false,
    })).toBe(false);
  });
});
