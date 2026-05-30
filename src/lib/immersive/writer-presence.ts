import type { AuthorIdentity, BookProject } from "@/types/book";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { loadAtmosphereProfile } from "@/lib/atmosphere-engine/storage";
import { countWords } from "@/lib/book-progress";
import { isProjectComplete } from "@/lib/project-status";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

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
  "nature-calm": [
    "Il silenzio è il primo collaboratore di ogni capitolo.",
    "Scrivi con la calma di chi non ha fretta di finire.",
  ],
  "booktok-romance": [
    "Il desiderio si scrive nel sottotesto, non nell'esplicito.",
    "Fai innamorare il lettore della tensione, non solo del lieto fine.",
  ],
  "thriller-investigation": [
    "Ogni indizio deve costare qualcosa al protagonista.",
    "La verità arriva sempre un capitolo prima di quanto il lettore sia pronto.",
  ],
  "space-scifi": [
    "La precisione è la forma più elegante dell'immaginazione.",
    "Ogni variabile narrativa deve avere una conseguenza.",
  ],
  "horror-gothic": [
    "L'ombra più profonda nasce da ciò che non dici.",
    "La tensione si costruisce nel respiro tra le frasi.",
  ],
};

const FEMININE_HINT = /^(livia|lua|sara|anna|maria|emma|noir|galli|emerson)/i;

export function resolveWriterDisplayName(identity: AuthorIdentity | null): string {
  if (!identity) return "Autore";
  const raw = (identity.realName || identity.penName || identity.name || "").trim();
  if (!raw) return "Autore";
  return raw.split(/\s+/)[0] || raw;
}

export function resolveAuthorPenName(identity: AuthorIdentity | null): string | null {
  if (!identity) return null;
  return (identity.penName || identity.name || "").trim() || null;
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
  progressPercent: number;
} {
  if (!project) {
    return { state: "exploring", labelKey: "writer_state_exploring", progressLabel: "", progressPercent: 0 };
  }
  const chapters = project.chapters ?? [];
  const total = chapters.length;
  const withContent = chapters.filter((c) => (c.content?.trim().length ?? 0) > 120).length;
  const pct = total > 0 ? Math.round((withContent / total) * 100) : 0;
  const progressLabel = total > 0 ? `${withContent}/${total} · ${pct}%` : "";

  if (isProjectComplete(project)) {
    return { state: "complete", labelKey: "writer_state_complete", progressLabel, progressPercent: 100 };
  }
  if (withContent === 0) {
    return { state: "exploring", labelKey: "writer_state_exploring", progressLabel, progressPercent: pct };
  }
  if (pct >= 75) {
    return { state: "refining", labelKey: "writer_state_refining", progressLabel, progressPercent: pct };
  }
  return { state: "drafting", labelKey: "writer_state_drafting", progressLabel, progressPercent: pct };
}

export function resolveProjectWordCount(project: BookProject | null | undefined): number {
  if (!project) return 0;
  let total = 0;
  if (project.blueprint?.overview) total += countWords(project.blueprint.overview);
  for (const ch of project.chapters ?? []) {
    total += countWords(ch.content);
    for (const sub of ch.subchapters ?? []) {
      total += countWords(sub.content);
    }
  }
  return total;
}

export function resolveCurrentChapterLabel(project: BookProject | null | undefined): string | null {
  if (!project?.chapters?.length) return null;
  const chapters = project.chapters;
  const activeIdx = chapters.findIndex((c) => (c.content?.trim().length ?? 0) < 120);
  const idx = activeIdx >= 0 ? activeIdx : Math.max(0, chapters.length - 1);
  const ch = chapters[idx];
  if (!ch) return null;
  return formatChapterDisplayTitle(idx, ch.title, { config: project.config });
}

export function resolveLastSessionIso(project: BookProject | null | undefined): string | null {
  if (!project?.updatedAt) return null;
  return project.updatedAt;
}

export function getWriterPresenceSnapshot(project?: BookProject | null) {
  const identity = getSelectedAuthorIdentity();
  const profileId = loadAtmosphereProfile();
  const creative = resolveCreativeState(project ?? null);
  return {
    greeting: resolveWriterGreeting(identity),
    authorPenName: resolveAuthorPenName(identity),
    quote: pickInspirationalQuote(profileId),
    creative,
    bookTitle: project?.config?.title?.trim() || null,
    wordCount: resolveProjectWordCount(project),
    currentChapter: resolveCurrentChapterLabel(project),
    lastSessionIso: resolveLastSessionIso(project),
    projectPhase: project?.phase ?? null,
  };
}
