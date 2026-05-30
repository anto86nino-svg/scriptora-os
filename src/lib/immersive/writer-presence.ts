import type { AuthorIdentity, BookProject } from "@/types/book";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { loadAtmosphereProfile } from "@/lib/atmosphere-engine/storage";
import { isProjectComplete } from "@/lib/project-status";

const QUOTES: Record<string, string[]> = {
  default: [
    "Ogni pagina è una porta verso un mondo che solo tu puoi aprire.",
    "La voce autentica non urla — sussurra con precisione.",
    "Scrivi come se nessuno ti guardasse. Edita come se tutti ti leggessero.",
  ],
  "fantasy-realm": [
    "I regni nascono dove l'immaginazione osa restare.",
    "La magia è coerenza emotiva, pagina dopo pagina.",
  ],
  "dark-luxury": [
    "L'eleganza della prosa inizia dalla calma della mente.",
    "Scrivi con intenzione. Ogni parola ha un prezzo e un peso.",
  ],
  "booktok-romance": [
    "Il desiderio si scrive nel sottotesto, non nell'esplicito.",
    "Fai innamorare il lettore della tensione, non solo del lieto fine.",
  ],
  "thriller-investigation": [
    "Ogni indizio deve costare qualcosa al protagonista.",
    "La verità arriva sempre un capitolo prima di quanto il lettore sia pronto.",
  ],
};

const FEMININE_HINT = /^(livia|lua|sara|anna|maria|emma|noir|galli|emerson)/i;

export function resolveWriterDisplayName(identity: AuthorIdentity | null): string {
  if (!identity) return "Autore";
  const raw = (identity.realName || identity.penName || identity.name || "").trim();
  if (!raw) return "Autore";
  return raw.split(/\s+/)[0] || raw;
}

export function resolveWriterGreeting(identity: AuthorIdentity | null): string {
  const name = resolveWriterDisplayName(identity);
  const feminine =
    identity?.id.includes("romance") ||
    identity?.id.includes("livia") ||
    FEMININE_HINT.test(name);
  return feminine ? `Benvenuta, ${name}` : `Benvenuto, ${name}`;
}

export function pickInspirationalQuote(profileId?: string): string {
  const key = profileId && QUOTES[profileId] ? profileId : "default";
  const pool = QUOTES[key] ?? QUOTES.default;
  const dayIndex = new Date().getDate() % pool.length;
  return pool[dayIndex];
}

export type CreativeState = "exploring" | "drafting" | "refining" | "complete";

export function resolveCreativeState(project: BookProject | null | undefined): {
  state: CreativeState;
  labelKey: string;
  progressLabel: string;
} {
  if (!project) {
    return { state: "exploring", labelKey: "writer_state_exploring", progressLabel: "" };
  }
  const chapters = project.chapters ?? [];
  const total = chapters.length;
  const withContent = chapters.filter((c) => (c.content?.trim().length ?? 0) > 120).length;
  const pct = total > 0 ? Math.round((withContent / total) * 100) : 0;
  const progressLabel = total > 0 ? `${withContent}/${total} · ${pct}%` : "";

  if (isProjectComplete(project)) {
    return { state: "complete", labelKey: "writer_state_complete", progressLabel };
  }
  if (withContent === 0) {
    return { state: "exploring", labelKey: "writer_state_exploring", progressLabel };
  }
  if (pct >= 75) {
    return { state: "refining", labelKey: "writer_state_refining", progressLabel };
  }
  return { state: "drafting", labelKey: "writer_state_drafting", progressLabel };
}

export function getWriterPresenceSnapshot(project?: BookProject | null) {
  const identity = getSelectedAuthorIdentity();
  const profileId = loadAtmosphereProfile();
  return {
    greeting: resolveWriterGreeting(identity),
    quote: pickInspirationalQuote(profileId),
    creative: resolveCreativeState(project ?? null),
    bookTitle: project?.config?.title?.trim() || null,
  };
}
