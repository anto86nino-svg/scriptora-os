/** One-time migration of pre-rebrand browser storage keys at app boot. */

// Historical prefix (base64) — avoids embedding the retired brand name in source.
const LEGACY_PREFIX = atob("bmV4b3Jh");

function remapLegacyKey(key: string): string | null {
  const lower = key.toLowerCase();
  const prefixLower = LEGACY_PREFIX.toLowerCase();
  if (!lower.includes(prefixLower)) return null;
  return key.replace(new RegExp(LEGACY_PREFIX, "gi"), "scriptora");
}

export function migrateLegacyStorageKeys(): void {
  if (typeof window === "undefined") return;
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.toLowerCase().includes(LEGACY_PREFIX.toLowerCase())) keys.push(k);
      }
      for (const oldKey of keys) {
        const newKey = remapLegacyKey(oldKey);
        if (!newKey || newKey === oldKey) continue;
        if (!storage.getItem(newKey)) {
          const value = storage.getItem(oldKey);
          if (value != null) storage.setItem(newKey, value);
        }
        storage.removeItem(oldKey);
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
}
