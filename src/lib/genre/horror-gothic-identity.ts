export type HorrorGothicIdentityParts = {
  genre?: string;
  subcategory?: string;
  subgenre?: string;
  idea?: string;
  bookFormat?: string;
  setting?: string;
  centralDynamic?: string;
};

export function normalizeHorrorGothicText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildHorrorGothicIdentityString(parts: HorrorGothicIdentityParts): string {
  return normalizeHorrorGothicText(
    [parts.genre, parts.subcategory, parts.subgenre, parts.idea, parts.bookFormat, parts.setting, parts.centralDynamic]
      .filter(Boolean)
      .join(" "),
  );
}

export function isGothicHorrorSubgenre(identity: string): boolean {
  const id = normalizeHorrorGothicText(identity);
  return /horror gotico|gothic horror|folk horror|gotico.*horror|horror.*gotico/.test(id);
}

export function isHorrorGothicIdentity(identity: string): boolean {
  const id = normalizeHorrorGothicText(identity);
  if (/dark\s*romance|romance oscuro|romance.*gotico|gotico.*romance/.test(id)) return false;
  if (isGothicHorrorSubgenre(id)) return true;
  if (/\b(gotico|gothic|folk horror)\b/.test(id) && /\b(horror|paura|inquietudine|maniero|presen|decadenza|soprannatur|ombra|villa|segret)\b/.test(id)) {
    return true;
  }
  if (/\bhorror\b/.test(id) && /\b(gotico|gothic|folk|maniero|villa|decadenza|presen)\b/.test(id)) return true;
  return false;
}

export const META_COMMERCIAL_SUBCATEGORIES = [
  "narrativa commerciale",
  "literary fiction",
  "narrativa letteraria",
  "general fiction",
  "general-fiction",
];

export function isMetaCommercialSubcategory(value: unknown): boolean {
  const normalized = normalizeHorrorGothicText(value);
  if (!normalized) return false;
  return META_COMMERCIAL_SUBCATEGORIES.some(
    (meta) => normalized === meta || normalized.includes(meta),
  );
}

export function resolveHorrorGothicNormalizedGenre(
  parts: HorrorGothicIdentityParts,
): { genre: string; subgenre: string; isGothic: boolean } | null {
  const identity = buildHorrorGothicIdentityString(parts);
  if (!isHorrorGothicIdentity(identity)) return null;
  const isGothic =
    isGothicHorrorSubgenre(identity) ||
    /\b(gotico|gothic|folk)\b/.test(identity);
  return {
    genre: "horror",
    subgenre: isGothic ? "Horror gotico" : "Horror",
    isGothic,
  };
}

export function resolveHorrorGothicDominanceGenreKey(
  parts: HorrorGothicIdentityParts,
): "gothic-horror" | "horror" | null {
  const identity = buildHorrorGothicIdentityString(parts);
  if (!isHorrorGothicIdentity(identity)) return null;
  return isGothicHorrorSubgenre(identity) || /\b(gotico|gothic|folk)\b/.test(identity)
    ? "gothic-horror"
    : "horror";
}

const ROMANCE_CONTAMINATION_PATTERN =
  /\b(attrazione crescente|dinamica romantica|slow burn|desiderio proibito|payoff emotivo|enemies to lovers|tensione romantica)\b/gi;

export function stripRomanceContaminationForHorror(text: string): string {
  return text
    .replace(ROMANCE_CONTAMINATION_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildHorrorGothicFallbackTitle(parts: HorrorGothicIdentityParts): string | null {
  if (!isHorrorGothicIdentity(buildHorrorGothicIdentityString(parts))) return null;
  const seed = buildHorrorGothicIdentityString(parts) || `${Date.now()}`;
  const setting = String(parts.idea || "").match(/maniero|villa|casa|palazzo|isola|abbazia/i)?.[0] || "";
  const variants = setting
    ? [`Il segreto del ${setting.charAt(0).toUpperCase()}${setting.slice(1)}`, "Le stanze del buio", "Dove dormono le ombre"]
    : ["La casa che ricorda", "Le stanze del buio", "Il respiro delle mura", "Dove dormono le ombre"];
  return variants[Math.abs(seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % variants.length];
}

export function buildHorrorGothicFallbackPromise(parts: HorrorGothicIdentityParts): string {
  const anchor =
    String(parts.idea || parts.setting || "")
      .match(/maniero|villa|casa|palazzo|isola|abbazia/i)?.[0] || "Un luogo malato";
  const place = anchor.charAt(0).toUpperCase() + anchor.slice(1);
  return `${place} porta in superficie atmosfera, inquietudine e una paura che non resta sepolta.`;
}
