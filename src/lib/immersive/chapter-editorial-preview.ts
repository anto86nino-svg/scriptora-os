const PLACEHOLDER_PATTERN = /^(to be generated|da generare|pending|tbd)$/i;

function sanitizePlaceholderText(text: string | undefined | null): string {
  const trimmed = String(text || "").trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return "";
  return trimmed;
}

export type ChapterEditorialPreviewInput = {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  chapterIndex?: number;
  totalChapters?: number;
};

const MAX_CHARS = 180;
const MIN_SENTENCE_CUT = 72;

function stripMarkup(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|\*|_|~~/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capEditorialPreview(text: string, max = MAX_CHARS): string {
  const clean = stripMarkup(text);
  if (!clean) return "";
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const sentenceBreak = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (sentenceBreak >= MIN_SENTENCE_CUT) {
    return cut.slice(0, sentenceBreak + 1).trim();
  }

  const soft = cut.replace(/\s+\S*$/, "").trim();
  return soft.length >= MIN_SENTENCE_CUT ? `${soft}…` : `${cut.trim()}…`;
}

function summaryMirrorsBody(summary: string, content: string): boolean {
  const s = stripMarkup(summary).toLowerCase();
  const c = stripMarkup(content).toLowerCase();
  if (!s || !c || s.length < 32) return false;
  const probe = s.slice(0, Math.min(96, s.length));
  return c.startsWith(probe) || probe.length >= 48 && c.includes(probe.slice(0, 48));
}

function narrativeArcLabel(index: number, total: number): "opening" | "rising" | "development" | "climactic" | "resolution" | "central" {
  if (total <= 1) return "central";
  const ratio = index / Math.max(total - 1, 1);
  if (index === 0) return "opening";
  if (ratio <= 0.35) return "rising";
  if (ratio <= 0.65) return "development";
  if (ratio < 1) return "climactic";
  return "resolution";
}

function analyzeContentSignals(content: string) {
  const plain = stripMarkup(content);
  const words = plain.split(/\s+/).filter(Boolean);
  const quoteMarks = (plain.match(/[""«»'']/g) || []).length;
  const hasDialogue = quoteMarks >= 2 || /^["'«]/m.test(plain);
  const paragraphs = plain.split(/\n{2,}/).filter((p) => p.trim().length > 0).length;
  return { wordCount: words.length, hasDialogue, paragraphs: Math.max(paragraphs, 1) };
}

function titleFragment(title: string | null | undefined, chapterIndex: number): string {
  const clean = stripMarkup(String(title || ""));
  return clean || `Chapter ${chapterIndex + 1}`;
}

function buildFromTitle(title: string, chapterIndex: number, totalChapters: number): string {
  const arc = narrativeArcLabel(chapterIndex, totalChapters);
  const templates: Record<typeof arc, string> = {
    opening: `"${title}" establishes tone, stakes, and the reader's entry into the story world.`,
    rising: `"${title}" escalates momentum — a rising beat that pulls the narrative forward.`,
    development: `"${title}" deepens conflict and character intent at mid-arc intensity.`,
    climactic: `"${title}" concentrates tension toward a decisive narrative turn.`,
    resolution: `"${title}" delivers emotional payoff and sets direction for what follows.`,
    central: `"${title}" carries a pivotal narrative function in the book's arc.`,
  };
  return capEditorialPreview(templates[arc]);
}

function buildFromContentSignals(
  title: string | null,
  content: string,
  chapterIndex: number,
  totalChapters: number,
): string {
  const { wordCount, hasDialogue, paragraphs } = analyzeContentSignals(content);
  const arc = narrativeArcLabel(chapterIndex, totalChapters);
  const label = titleFragment(title, chapterIndex);

  let note = "";
  if (arc === "opening") {
    note = hasDialogue
      ? `${label} opens with voice and dialogue, anchoring the reader in the story world.`
      : `${label} establishes atmosphere and stakes before narrative momentum builds.`;
  } else if (arc === "climactic" || arc === "resolution") {
    note = hasDialogue
      ? `${label} sharpens confrontation and dialogue toward a high-stakes late-arc beat.`
      : `${label} intensifies pressure and consequence in a decisive narrative movement.`;
  } else if (hasDialogue && paragraphs >= 3) {
    note = `${label} alternates scene and dialogue — pacing carries emotional and plot momentum.`;
  } else if (wordCount > 2500) {
    note = `${label} holds an extended beat — room for escalation, reflection, and tonal depth.`;
  } else if (wordCount < 400) {
    note = `${label} serves as a concise narrative bridge — tight, purposeful, arc-aware.`;
  } else {
    note = `${label} advances the ${arc} arc with focused scene work and narrative intent.`;
  }

  return capEditorialPreview(note);
}

function emptyFallback(chapterIndex: number, totalChapters: number): string {
  if (chapterIndex === 0) {
    return capEditorialPreview(
      "Opening chapter — establishes voice, world, and the reader's entry point into the manuscript.",
    );
  }
  return capEditorialPreview(
    `Chapter ${chapterIndex + 1} of ${totalChapters} — narrative beat awaiting draft; outline guides the editorial path.`,
  );
}

/** Short editorial note for chapter cards — never a verbatim body excerpt. */
export function generateChapterEditorialPreview(chapter: ChapterEditorialPreviewInput): string {
  const chapterIndex = chapter.chapterIndex ?? 0;
  const totalChapters = Math.max(chapter.totalChapters ?? 1, 1);
  const content = String(chapter.content || "").trim();
  const title = stripMarkup(String(chapter.title || ""));

  const summary = sanitizePlaceholderText(chapter.summary);
  if (summary && (!content || !summaryMirrorsBody(summary, content))) {
    return capEditorialPreview(summary);
  }

  if (title && content.length <= 50) {
    return buildFromTitle(title, chapterIndex, totalChapters);
  }

  if (content.length > 50) {
    return buildFromContentSignals(title || null, content, chapterIndex, totalChapters);
  }

  if (title) {
    return buildFromTitle(title, chapterIndex, totalChapters);
  }

  return emptyFallback(chapterIndex, totalChapters);
}
