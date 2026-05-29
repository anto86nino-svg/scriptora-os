import type { AutoBestsellerHandoffPack } from "./types";
import { AUTO_BESTSELLER_PACK_KEY, SETUP_ORIGIN_KEY } from "./types";

export function persistAutoBestsellerHandoff(pack: AutoBestsellerHandoffPack): void {
  sessionStorage.setItem(AUTO_BESTSELLER_PACK_KEY, JSON.stringify(pack));
  sessionStorage.setItem(SETUP_ORIGIN_KEY, "auto-bestseller");
}

export function peekAutoBestsellerHandoffPack(): AutoBestsellerHandoffPack | null {
  try {
    const raw = sessionStorage.getItem(AUTO_BESTSELLER_PACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutoBestsellerHandoffPack;
    if (parsed?.version !== 1 || parsed.origin !== "auto-bestseller") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function consumeAutoBestsellerHandoffPack(): AutoBestsellerHandoffPack | null {
  const pack = peekAutoBestsellerHandoffPack();
  if (!pack) return null;
  sessionStorage.removeItem(AUTO_BESTSELLER_PACK_KEY);
  return pack;
}

export function clearAutoBestsellerHandoffPack(): void {
  sessionStorage.removeItem(AUTO_BESTSELLER_PACK_KEY);
}
