/** In-memory auth context for sync billing/dev checks (updated by AuthProvider). */

export interface AuthSessionSnapshot {
  id: string;
  email: string | null;
}

let activeSession: AuthSessionSnapshot | null = null;

export function setAuthSessionContext(user: AuthSessionSnapshot | null): void {
  activeSession = user;
}

export function clearAuthSessionContext(): void {
  activeSession = null;
}

export function getAuthSessionContext(): AuthSessionSnapshot | null {
  return activeSession;
}

export function getAuthUserId(): string | null {
  return activeSession?.id ?? null;
}

export function getAuthSessionEmail(): string | null {
  return activeSession?.email ?? null;
}

/** Wallet scope key suffix — persists per Supabase user across logout/relogin. */
export function getWalletScopeUserId(): string {
  return activeSession?.id ?? "anonymous";
}
