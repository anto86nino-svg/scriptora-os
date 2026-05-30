import type { User } from "@supabase/supabase-js";

export type AuthProfile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isGoogle: boolean;
  initials: string;
};

export function isGoogleUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers as string[] | undefined;
  if (providers?.includes("google")) return true;
  if (user.app_metadata?.provider === "google") return true;
  return user.identities?.some((identity) => identity.provider === "google") ?? false;
}

export function getAuthProfile(user: User | null | undefined): AuthProfile | null {
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    String(meta.full_name || meta.name || user.email?.split("@")[0] || "").trim() || "Account";
  const email = user.email || "";
  const avatarUrl = String(meta.avatar_url || meta.picture || "").trim() || null;
  const initials =
    displayName
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return {
    displayName,
    email,
    avatarUrl,
    isGoogle: isGoogleUser(user),
    initials,
  };
}
