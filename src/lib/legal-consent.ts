import { LEGAL_VERSION } from "@/lib/legal-content";

export const CONSENT_KEY = "nexora_consent_v1";

export type ConsentRecord = {
  privacy: boolean;
  terms: boolean;
  age: boolean;
  ts: string;
  version?: string;
};

let sessionConsent: ConsentRecord | null = null;

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : sessionConsent;
  } catch {
    return sessionConsent;
  }
}

export function writeConsent(rec: ConsentRecord) {
  sessionConsent = rec;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(rec));
  } catch {
    // Local storage can be unavailable in private/restricted browser modes.
  }
}

export function hasValidConsent(rec: ConsentRecord | null = readConsent()) {
  return !!(rec?.privacy && rec?.terms && rec?.age && rec?.version === LEGAL_VERSION);
}
