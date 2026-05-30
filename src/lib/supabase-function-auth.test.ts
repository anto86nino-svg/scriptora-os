import { describe, expect, it } from "vitest";
import {
  formatEdgeFunctionFailure,
  isGenericFunctionHttpError,
  isSupabaseJwtAuthError,
  isValidJwtFormat,
  normalizeFunctionErrorMessage,
} from "./supabase-function-auth";

describe("supabase-function-auth", () => {
  it("accepts well-formed JWT strings", () => {
    const sample = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
    expect(isValidJwtFormat(sample)).toBe(true);
  });

  it("rejects malformed tokens", () => {
    expect(isValidJwtFormat("not-a-jwt")).toBe(false);
    expect(isValidJwtFormat("only.two")).toBe(false);
    expect(isValidJwtFormat("")).toBe(false);
  });

  it("detects Supabase JWT auth errors", () => {
    expect(isSupabaseJwtAuthError('{"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}')).toBe(true);
    expect(isSupabaseJwtAuthError("Invalid JWT")).toBe(true);
    expect(isSupabaseJwtAuthError("Rate limited")).toBe(false);
  });

  it("formats edge function failures with readable messages", () => {
    expect(formatEdgeFunctionFailure(500, '{"error":"DEEPSEEK_API_KEY not configured"}')).toContain("non configurato");
    expect(formatEdgeFunctionFailure(402, '{"error":"DeepSeek credits exhausted"}')).toContain("credits");
    expect(formatEdgeFunctionFailure(503, "")).toContain("temporaneamente");
  });

  it("normalizes generic non-2xx invoke errors", () => {
    expect(normalizeFunctionErrorMessage(new Error("Edge Function returned a non-2xx status code"))).toContain("server AI");
    expect(isGenericFunctionHttpError("Edge Function returned a non-2xx status code")).toBe(true);
  });
});
