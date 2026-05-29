import type { AuthorIdentity, Language } from "@/types/book";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { authorEcosystemMemorySnapshot } from "./ecosystem";
import {
  dampPassiveToneByConsistency,
  PASSIVE_CONSISTENCY_SOFT,
  signalConsistencyScore,
  stripOverfitBrandLanguage,
} from "./hardening";
import { hasAuthorVoiceMemory, normalizeAuthorPresence, normalizeReaderEmotionalGoals } from "./voice-memory";

/** Max passive influence — under-influence when uncertain */
export const PASSIVE_INFLUENCE_CAP = 0.15;

export interface PassiveAuthorTone {
  hasSignal: boolean;
  warmth: "neutral" | "warm" | "cool";
  clarity: "neutral" | "sharp" | "soft";
  depth: "neutral" | "introspective" | "light";
  energy: "neutral" | "inspirational" | "atmospheric";
  /** Human-readable hint for prompts — never dominant */
  directive: string;
}

const CLICHE_PATTERNS = [
  /\bbestselling author\b/gi,
  /\bworld[- ]class\b/gi,
  /\bgame[- ]changer\b/gi,
  /\bunleash your potential\b/gi,
  /\bjourney of a lifetime\b/gi,
  /\bpassionate storyteller\b/gi,
  /\bAI[- ]enhanced\b/gi,
  /\bpremium identity\b/gi,
  /\btransformative journeys?\b/gi,
  /\bunlock your\b/gi,
];

function trim(value?: string): string {
  return String(value || "").trim();
}

function presenceSet(identity: AuthorIdentity | null): Set<string> {
  return new Set(normalizeAuthorPresence(identity?.authorPresence));
}

function goalSet(identity: AuthorIdentity | null): Set<string> {
  return new Set(normalizeReaderEmotionalGoals(identity?.readerEmotionalGoals));
}

function countSignals(p: Set<string>, g: Set<string>, message: string): number {
  return p.size + g.size + (message ? 1 : 0);
}

/** Resolve subtle tone axes — falls back to neutral on weak/contradictory signal */
export function resolvePassiveAuthorTone(identity: AuthorIdentity | null | undefined): PassiveAuthorTone {
  const normalized = normalizeAuthorIdentity(identity);
  const message = trim(normalized?.authorMessage);
  const p = presenceSet(normalized);
  const g = goalSet(normalized);

  if (!normalized || !hasAuthorVoiceMemory(normalized) || countSignals(p, g, message) < 1) {
    return { hasSignal: false, warmth: "neutral", clarity: "neutral", depth: "neutral", energy: "neutral", directive: "" };
  }

  const warmHits = ["emotional", "warm", "poetic", "spiritual", "inspirational"].filter((id) => p.has(id)).length;
  const coolHits = ["professional", "minimalist", "premium", "direct", "intellectual"].filter((id) => p.has(id)).length;
  const deepHits = ["psychological", "dark", "intense", "intellectual", "poetic"].filter((id) => p.has(id)).length;
  const lightHits = ["direct", "warm", "inspirational"].filter((id) => p.has(id)).length;
  const sharpHits = ["direct", "professional", "premium", "minimalist"].filter((id) => p.has(id)).length;
  const softHits = ["emotional", "poetic", "warm", "spiritual"].filter((id) => p.has(id)).length;
  const inspirationalHits = ["inspirational", "spiritual"].filter((id) => p.has(id)).length + (g.has("inspiration") || g.has("empowerment") ? 1 : 0);
  const atmosphericHits = ["dark", "intense", "psychological", "poetic"].filter((id) => p.has(id)).length + (g.has("mystery") || g.has("tension") ? 1 : 0);

  let warmth: PassiveAuthorTone["warmth"] = "neutral";
  if (warmHits >= 2 && warmHits > coolHits) warmth = "warm";
  else if (coolHits >= 2 && coolHits > warmHits) warmth = "cool";

  let clarity: PassiveAuthorTone["clarity"] = "neutral";
  if (sharpHits >= 2 && sharpHits > softHits) clarity = "sharp";
  else if (softHits >= 2 && softHits > sharpHits) clarity = "soft";

  let depth: PassiveAuthorTone["depth"] = "neutral";
  if (deepHits >= 2 && deepHits > lightHits) depth = "introspective";
  else if (lightHits >= 2 && lightHits > deepHits) depth = "light";

  let energy: PassiveAuthorTone["energy"] = "neutral";
  if (inspirationalHits >= 2) energy = "inspirational";
  else if (atmosphericHits >= 2) energy = "atmospheric";

  const parts: string[] = [];
  if (warmth === "warm") parts.push("slightly warmer, human cadence");
  if (warmth === "cool") parts.push("clean, restrained professionalism");
  if (clarity === "sharp") parts.push("clear structure, no filler");
  if (clarity === "soft") parts.push("gentle flow, never saccharine");
  if (depth === "introspective") parts.push("subtle psychological depth");
  if (depth === "light") parts.push("accessible clarity");
  if (energy === "inspirational") parts.push("quiet empowerment, not hype");
  if (energy === "atmospheric") parts.push("slightly atmospheric, never melodramatic");
  if (message) parts.push(`honor this reader intent (do not quote verbatim): "${message.slice(0, 160)}"`);

  const presenceList = [...p].slice(0, 4).join(", ");
  const goalList = [...g].slice(0, 3).join(", ");

  const directive = parts.length
    ? `PASSIVE AUTHOR BRAND (≤15% influence — subtle only, never caricature): Presence: ${presenceList || "n/a"}. Reader goals: ${goalList || "n/a"}. Tone nudge: ${parts.join("; ")}. No clichés, no exaggeration, no marketing hype. If uncertain, stay neutral and professional.`
    : "";

  const rawTone: PassiveAuthorTone = {
    hasSignal: Boolean(directive),
    warmth,
    clarity,
    depth,
    energy,
    directive,
  };

  return dampPassiveToneByConsistency(rawTone, signalConsistencyScore(normalized));
}

export function stripAuthorBrainCliches(text: string): string {
  let out = stripOverfitBrandLanguage(text);
  for (const pattern of CLICHE_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .trim();
}

/** Subtle pen-name join for About the Author — preserves bio body */
export function applyAboutAuthorCadence(bio: string, penName: string, tone: PassiveAuthorTone): string {
  const cleaned = stripAuthorBrainCliches(bio.trim());
  if (!cleaned) return cleaned;
  if (!tone.hasSignal || !penName) return cleaned;

  const penLower = penName.toLowerCase();
  if (cleaned.toLowerCase().startsWith(penLower)) return cleaned;

  if (tone.warmth === "warm" || tone.clarity === "soft") {
    return `${penName} — ${cleaned}`;
  }
  return `${penName}. ${cleaned}`;
}

function langKey(language?: Language | string): "it" | "en" | "es" | "fr" | "de" {
  const lang = String(language || "English").toLowerCase();
  if (lang.startsWith("it")) return "it";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("de")) return "de";
  return "en";
}

/** Micro-personalized Other Books heading */
export function buildPassiveOtherBooksHeading(penName: string, language?: Language | string, tone?: PassiveAuthorTone): string {
  const l = langKey(language);
  const t = tone?.hasSignal ? tone : { warmth: "neutral", energy: "neutral" } as PassiveAuthorTone;

  if (l === "it") {
    if (t.warmth === "warm") return `Continua il viaggio con ${penName}`;
    if (t.energy === "inspirational") return `Scopri altri libri di ${penName}`;
    if (t.clarity === "sharp") return `Altri libri di ${penName}`;
    return `Altri libri di ${penName}`;
  }

  if (t.warmth === "warm") return `Continue the journey with ${penName}`;
  if (t.energy === "inspirational") return `Explore more from ${penName}`;
  if (t.clarity === "sharp" || t.warmth === "cool") return `More books by ${penName}`;
  return `Other Books by ${penName}`;
}

/** Micro-personalized Follow heading */
export function buildPassiveFollowHeading(penName: string, language?: Language | string, tone?: PassiveAuthorTone): string {
  const l = langKey(language);
  const t = tone?.hasSignal ? tone : { warmth: "neutral", energy: "neutral" } as PassiveAuthorTone;

  if (l === "it") {
    if (t.energy === "inspirational") return `Resta connesso con ${penName}`;
    if (t.warmth === "warm") return `Segui il percorso di ${penName}`;
    return `Segui ${penName}`;
  }

  if (t.energy === "inspirational") return `Stay connected with ${penName}`;
  if (t.warmth === "warm") return `Follow ${penName}'s journey`;
  return `Follow ${penName}`;
}

/** Soft KDP / market copy tone — one clause max, truth preserved */
export function applyPassiveMarketCopyTone(text: string, identity: AuthorIdentity | null | undefined): string {
  const base = stripAuthorBrainCliches(trim(text));
  if (!base) return base;

  const tone = resolvePassiveAuthorTone(identity);
  const consistency = signalConsistencyScore(identity);
  if (!tone.hasSignal || consistency < PASSIVE_CONSISTENCY_SOFT) return base;

  if (tone.depth === "introspective" && !/introspect|interior|psychological/i.test(base)) {
    return `${base} Copy may lean slightly introspective to match author brand — keep claims factual.`;
  }
  if ((tone.clarity === "sharp" || tone.warmth === "cool") && tone.energy !== "inspirational") {
    return `${base} Positioning language can stay crisp and premium — avoid hype.`;
  }
  if (tone.energy === "inspirational") {
    return `${base} Tone may feel quietly empowering — never exaggerated.`;
  }
  return base;
}

export function buildExpandBioPassiveContext(identity: AuthorIdentity | null | undefined): {
  authorPresence: string[];
  readerEmotionalGoals: string[];
  authorMessage: string;
  toneDirective: string;
} {
  const normalized = normalizeAuthorIdentity(identity);
  const snapshot = authorEcosystemMemorySnapshot({
    authorPresence: normalized?.authorPresence,
    readerEmotionalGoals: normalized?.readerEmotionalGoals,
    authorMessage: normalized?.authorMessage,
  });
  const tone = resolvePassiveAuthorTone(normalized);
  return {
    authorPresence: snapshot.authorPresence,
    readerEmotionalGoals: snapshot.readerEmotionalGoals,
    authorMessage: snapshot.authorMessage,
    toneDirective: tone.directive,
  };
}

export function hasPassiveAuthorIntelligence(identity: AuthorIdentity | null | undefined): boolean {
  return resolvePassiveAuthorTone(normalizeAuthorIdentity(identity)).hasSignal;
}
