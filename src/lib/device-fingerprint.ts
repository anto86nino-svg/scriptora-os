// Lightweight device fingerprint — userAgent + language + timezone + screen.
// Hashed with SHA-256, persisted in localStorage for stability across reloads.

const KEY = "scriptora_device_id";

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getDeviceId(): Promise<string> {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached) return cached;
  } catch {
    /* noop */
  }
  const parts = [
    navigator.userAgent || "",
    navigator.language || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(navigator.hardwareConcurrency || ""),
  ].join("|");
  const id = await sha256(parts);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* noop */
  }
  return id;
}
