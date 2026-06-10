import type { BookProject, SectionId } from "@/types/book";
import { loadMollyBrainMemory } from "./molly-brain-memory";
import { scoreMollyBrainContext } from "./molly-brain-score";
import type {
  MollyBrainAnalyzeInput,
  MollyBrainInsight,
  MollyQuickAction,
  MollyQuickActionId,
} from "./types";

function resolveActiveChapter(project: BookProject, activeSection: SectionId | null): {
  chapterIndex: number;
  subIndex: number | null;
  content: string;
  title: string;
} | null {
  if (!activeSection) return null;
  const chMatch = activeSection.match(/^chapter-(\d+)$/);
  if (chMatch) {
    const idx = parseInt(chMatch[1], 10);
    const ch = project.chapters[idx];
    if (!ch?.content?.trim()) return null;
    return { chapterIndex: idx, subIndex: null, content: ch.content, title: ch.title || `Capitolo ${idx + 1}` };
  }
  const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
  if (subMatch) {
    const ci = parseInt(subMatch[1], 10);
    const si = parseInt(subMatch[2], 10);
    const sub = project.chapters[ci]?.subchapters?.[si];
    if (!sub?.content?.trim()) return null;
    return { chapterIndex: ci, subIndex: si, content: sub.content, title: sub.title || `Sottocapitolo ${si + 1}` };
  }
  return null;
}

function action(id: MollyQuickActionId, label: string): MollyQuickAction {
  return { id, label };
}

function isRomanceGenre(genre: string, subcategory: string): boolean {
  const g = `${genre} ${subcategory}`.toLowerCase();
  return g.includes("romance") || g.includes("romant");
}

function isThrillerGenre(genre: string, subcategory: string): boolean {
  const g = `${genre} ${subcategory}`.toLowerCase();
  return g.includes("thriller") || g.includes("horror") || g.includes("mystery");
}

function hasEarlyConfession(text: string): boolean {
  return /\b(ti amo|I love you|sono innamorat|in love with you|non posso più farne a meno)\b/i.test(text.slice(0, 2200));
}

function hasPerfectDialogue(text: string): boolean {
  const lines = text.match(/[«""][^«""\n]{8,}[»""]/g) || [];
  if (lines.length < 2) return false;
  const tooClean = lines.filter((line) =>
    !/\.{2,}|—|…|\?|non so|forse|eh\b|uh\b|wait|aspetta/i.test(line),
  ).length;
  return tooClean / lines.length >= 0.55;
}

export function analyzeMollyBrain(input: MollyBrainAnalyzeInput): MollyBrainInsight | null {
  const memory = loadMollyBrainMemory();
  const active = resolveActiveChapter(input.project, input.activeSection);

  if (input.appContext === "study" && input.studyText?.trim()) {
    const text = input.studyText.trim();
    if (text.length < 120) return null;
    return {
      id: `study-${Date.now()}`,
      trigger: "study_explanation",
      comic: "Questo passaggio potrebbe essere più chiaro per lo studio.",
      actions: [
        action("more_clarity", "✓ Spiegamelo meglio"),
        action("more_engaging", "✓ Più coinvolgente"),
      ],
      priority: "medium",
      mood: "writing",
      score: scoreMollyBrainContext({ content: text, project: input.project, chapterIndex: 0 }),
    };
  }

  if (!active || active.content.length < 180) return null;

  const score = scoreMollyBrainContext({
    content: active.content,
    project: input.project,
    chapterIndex: active.chapterIndex,
  });

  const genre = input.project.config.genre || "";
  const subcategory = input.project.config.subcategory || "";

  if (score.repetitionRisk >= 58) {
    return {
      id: `rep-${active.chapterIndex}-${Date.now()}`,
      trigger: "repetition_detected",
      comic: "Ho trovato molte emozioni o frasi ripetute.\nVuoi che le sistemi?",
      actions: [action("reduce_repetition", "✓ Correggi"), action("more_natural", "✓ Più naturale")],
      priority: "high",
      mood: "worried",
      score,
    };
  }

  if (score.readerDropRisk >= 68) {
    return {
      id: `drop-${active.chapterIndex}-${Date.now()}`,
      trigger: "reader_drop_risk",
      comic: "Il lettore potrebbe abbandonare qui.\nVuoi rafforzare l'hook?",
      actions: [action("strengthen_hook", "✓ Rafforza"), action("more_bingeability", "✓ Più bingeability")],
      priority: "high",
      mood: "worried",
      score,
    };
  }

  if (hasPerfectDialogue(active.content) || score.humanAuthenticity < 58) {
    const memoryLine = memory.prefersRealisticDialogue ? "\n(Ho notato che ami dialoghi realistici.)" : "";
    return {
      id: `dialogue-${active.chapterIndex}-${Date.now()}`,
      trigger: "dialogue_too_perfect",
      comic: `Questo dialogo sembra un po' troppo perfetto.\nVuoi renderlo più umano?${memoryLine}`,
      actions: [
        action("more_human", "✓ Più umano"),
        action("more_friction", "✓ Più attrito"),
        action("more_subtext", "✓ Più sottotesto"),
      ],
      priority: "medium",
      mood: "writing",
      score,
    };
  }

  if (isRomanceGenre(genre, subcategory) && (hasEarlyConfession(active.content) || score.emotionalRealism < 55)) {
    return {
      id: `romance-${active.chapterIndex}-${Date.now()}`,
      trigger: "romance_fast_payoff",
      comic: "Credo che si stiano aprendo troppo presto.\nVuoi più slow burn?",
      actions: [
        action("slow_burn", "✓ Aumenta tensione"),
        action("more_desire_held", "✓ Più desiderio trattenuto"),
        action("reduce_confessions", "✓ Riduci confessioni"),
      ],
      priority: "medium",
      mood: "writing",
      score,
    };
  }

  if (isThrillerGenre(genre, subcategory) && (score.immersion < 58 || score.commercialStrength < 55)) {
    return {
      id: `thriller-${active.chapterIndex}-${Date.now()}`,
      trigger: "thriller_low_suspense",
      comic: "Qui il lettore respira troppo.\nVuoi aumentare suspense?",
      actions: [
        action("more_tension", "✓ Più tensione"),
        action("cliffhanger", "✓ Cliffhanger"),
        action("more_danger", "✓ Più pericolo"),
      ],
      priority: "medium",
      mood: "writing",
      score,
    };
  }

  if (input.project.config.category?.toLowerCase().includes("non") || genre.includes("self-help")) {
    if (score.narrativeQuality < 62) {
      return {
        id: `nf-${active.chapterIndex}-${Date.now()}`,
        trigger: "nonfiction_clarity",
        comic: "Questo punto potrebbe essere più chiaro per il lettore.\nVuoi semplificarlo?",
        actions: [
          action("more_clarity", "✓ Più semplice"),
          action("more_authoritative", "✓ Più autorevole"),
          action("more_engaging", "✓ Più coinvolgente"),
        ],
        priority: "low",
        mood: "observing",
        score,
      };
    }
  }

  if (input.appContext === "voice" && input.voiceFeedback) {
    return {
      id: `voice-${Date.now()}`,
      trigger: "voice_artificial",
      comic: "Ascoltando, alcune frasi suonano artificiali.\nVuoi renderle più naturali?",
      actions: [action("more_natural", "✓ Suona naturale"), action("reduce_ai_feeling", "✓ Meno robotico")],
      priority: "medium",
      mood: "analyzing",
      score,
    };
  }

  if (score.composite < 64) {
    return {
      id: `polish-${active.chapterIndex}-${Date.now()}`,
      trigger: "general_polish",
      comic: "Posso migliorare ritmo e qualità con una patch chirurgica.",
      actions: [
        action("more_commercial", "✓ Più commerciale"),
        action("more_immersion", "✓ Più immersione"),
        action("reduce_ai_feeling", "✓ Meno AI feeling"),
      ],
      priority: "low",
      mood: "observing",
      score,
    };
  }

  return null;
}
