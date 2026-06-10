import { applyTensionEngine } from "@/lib/TensionEngine";
import { applyHumanImperfectionLayer } from "@/lib/HumanImperfectionLayer";
import { humanizeNarrativeText, estimateHumanizerChangePercent } from "@/lib/HumanizerLayer";
import type { BookProject } from "@/types/book";
import type { MollyBrainActionContext, MollyBrainActionResult, MollyQuickActionId } from "./types";

function languageKey(config?: BookProject["config"]): "it" | "en" | "default" {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

function changeMeta(original: string, next: string, memoryNote?: string): MollyBrainActionResult {
  const changePercent = estimateHumanizerChangePercent(original, next);
  return {
    text: next,
    changed: next.trim() !== original.trim(),
    changePercent,
    memoryNote,
  };
}

function humanizerContext(ctx: MollyBrainActionContext) {
  const chapters = ctx.project.chapters || [];
  const previousChapters = chapters
    .slice(0, ctx.chapterIndex)
    .map((ch) => ({ title: ch.title, content: ch.content }));
  return {
    config: ctx.project.config,
    previousChapters,
    chapterIndex: ctx.chapterIndex,
    outlineSummary: ctx.project.blueprint?.chapterOutlines?.[ctx.chapterIndex]?.summary,
    intensity: "balanced" as const,
    genreBrainEnabled: true,
    humanImperfectionEnabled: true,
    storyBibleLockEnabled: true,
  };
}

function softenConfessions(text: string, lang: "it" | "en" | "default"): string {
  const pairs: Array<[RegExp, string]> =
    lang === "it"
      ? [
          [/\bti amo\b/gi, "non so ancora cosa dirti"],
          [/\bti amo da morire\b/gi, "mi fai paura, nel bene"],
          [/\bnon posso più farne a meno\b/gi, "forse sto andando troppo in fretta"],
          [/\bsei tutto per me\b/gi, "sei diventato importante troppo presto"],
        ]
      : lang === "en"
        ? [
            [/\bI love you\b/gi, "I don't know what to say yet"],
            [/\bI can't live without you\b/gi, "maybe this is moving too fast"],
            [/\byou're everything to me\b/gi, "you matter more than I expected"],
          ]
        : [
            [/\bI love you\b/gi, "I don't know what to say yet"],
            [/\bti amo\b/gi, "non so ancora cosa dirti"],
          ];
  return pairs.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), text);
}

function reduceRepeatedPhrases(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const seen = new Map<string, number>();
  return paragraphs
    .map((paragraph) => {
      const sentences = paragraph.split(/(?<=[.!?…])\s+/);
      return sentences
        .map((sentence) => {
          const key = sentence.toLowerCase().replace(/\s+/g, " ").trim();
          if (key.length < 24) return sentence;
          const count = seen.get(key) || 0;
          seen.set(key, count + 1);
          if (count === 0) return sentence;
          if (count === 1) return sentence.replace(/\.$/, " — di nuovo, ma con un tono diverso.");
          return "";
        })
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join("\n\n");
}

function strengthenOpeningHook(text: string, lang: "it" | "en" | "default"): string {
  const paragraphs = text.split(/\n{2,}/);
  if (!paragraphs[0]) return text;
  const opener =
    lang === "it"
      ? "Qualcosa non torna — "
      : lang === "en"
        ? "Something is off — "
        : "Something shifts — ";
  const first = paragraphs[0].trim();
  if (/^(qualcosa|something|il |the |una |a )/i.test(first)) return text;
  paragraphs[0] = `${opener}${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  return paragraphs.join("\n\n");
}

function appendCliffhanger(text: string, lang: "it" | "en" | "default"): string {
  if (/\?$/.test(text.trim()) || /(ma poi|but then|e allora|and then)/i.test(text.slice(-280))) {
    return text;
  }
  const beat =
    lang === "it"
      ? "\n\nMa il rumore dietro quella porta non era finito."
      : lang === "en"
        ? "\n\nBut the sound behind that door wasn't over."
        : "\n\nBut the sound behind that door wasn't over.";
  return `${text.trim()}${beat}`;
}

function simplifyNonfiction(text: string): string {
  return text
    .replace(/\b(in altre parole|detto in modo semplice|put simply|in essence)\b/gi, "")
    .replace(/\b(è fondamentale comprendere che|it is essential to understand that)\b/gi, "In pratica:")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addSuspenseBeats(text: string, ctx: MollyBrainActionContext): string {
  let next = applyTensionEngine(text, humanizerContext(ctx));
  next = applyHumanImperfectionLayer(next, humanizerContext(ctx));
  return appendCliffhanger(next, languageKey(ctx.project.config));
}

export function executeMollyQuickAction(
  actionId: MollyQuickActionId,
  ctx: MollyBrainActionContext,
): MollyBrainActionResult {
  const original = String(ctx.text || "").trim();
  if (!original) {
    return { text: original, changed: false, changePercent: 0 };
  }

  const lang = languageKey(ctx.project.config);
  const baseCtx = humanizerContext(ctx);

  switch (actionId) {
    case "more_human":
    case "more_natural":
    case "reduce_ai_feeling": {
      const next = humanizeNarrativeText(original, baseCtx);
      return changeMeta(original, next, "Ho reso il testo più umano senza stravolgerlo.");
    }
    case "more_friction":
    case "more_subtext": {
      let next = humanizeNarrativeText(original, baseCtx);
      next = applyHumanImperfectionLayer(next, baseCtx);
      return changeMeta(original, next, "Ho aggiunto attrito e sottotesto.");
    }
    case "more_tension":
    case "more_suspense":
    case "more_danger": {
      const next = addSuspenseBeats(original, ctx);
      return changeMeta(original, next, "Ho aumentato tensione e pericolo percepito.");
    }
    case "cliffhanger":
    case "more_bingeability": {
      const next = appendCliffhanger(
        applyTensionEngine(original, baseCtx),
        lang,
      );
      return changeMeta(original, next, "Ho chiuso con un aggancio più forte.");
    }
    case "slow_burn":
    case "more_desire_held":
    case "reduce_confessions": {
      let next = softenConfessions(original, lang);
      next = applyTensionEngine(next, baseCtx);
      next = humanizeNarrativeText(next, baseCtx);
      return changeMeta(original, next, "Ho rallentato il payoff emotivo.");
    }
    case "more_emotion": {
      const next = applyTensionEngine(humanizeNarrativeText(original, baseCtx), baseCtx);
      return changeMeta(original, next, "Ho intensificato la carica emotiva.");
    }
    case "more_immersion": {
      const next = applyHumanImperfectionLayer(
        applyTensionEngine(original, baseCtx),
        baseCtx,
      );
      return changeMeta(original, next, "Ho aggiunto dettagli sensoriali e ritmo immersivo.");
    }
    case "reduce_repetition": {
      const next = reduceRepeatedPhrases(original);
      return changeMeta(original, next, "Ho ridotto ripetizioni evidenti.");
    }
    case "strengthen_hook": {
      const next = strengthenOpeningHook(
        humanizeNarrativeText(original.slice(0, 1200), baseCtx) +
          (original.length > 1200 ? original.slice(1200) : ""),
        lang,
      );
      return changeMeta(original, next, "Ho rafforzato l'apertura del capitolo.");
    }
    case "more_clarity":
    case "more_engaging": {
      const next = simplifyNonfiction(humanizeNarrativeText(original, baseCtx));
      return changeMeta(original, next, "Ho reso il passaggio più chiaro e coinvolgente.");
    }
    case "more_authoritative": {
      const next = original
        .replace(/\b(forse|probabilmente|maybe|perhaps)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      return changeMeta(original, next, "Ho reso il tono più autorevole.");
    }
    case "more_commercial": {
      const next = strengthenOpeningHook(
        appendCliffhanger(applyTensionEngine(original, baseCtx), lang),
        lang,
      );
      return changeMeta(original, next, "Ho spinto hook e ritmo commerciale.");
    }
    default:
      return { text: original, changed: false, changePercent: 0 };
  }
}
