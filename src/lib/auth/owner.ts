/** Owner/dev accounts allowed to use Dev Mode wallet and simulated purchases (non-prod only). */

const DEFAULT_OWNER_EMAILS = ["natasharomanoff1990anto@gmail.com"] as const;

function parseOwnerEmailsFromEnv(): string[] {
  const raw = import.meta.env.VITE_SCRIPTORA_OWNER_EMAILS as string | undefined;
  if (!raw?.trim()) return [...DEFAULT_OWNER_EMAILS];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

let cachedOwnerEmails: string[] | null = null;

export function getOwnerEmails(): readonly string[] {
  if (!cachedOwnerEmails) {
    cachedOwnerEmails = parseOwnerEmailsFromEnv();
  }
  return cachedOwnerEmails;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getOwnerEmails().includes(email.trim().toLowerCase());
}
