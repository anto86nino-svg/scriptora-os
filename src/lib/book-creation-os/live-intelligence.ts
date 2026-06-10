import type { BookCharacter } from "@/types/book";
import type { BookObjective, WritingStyleProfile } from "./objectives";

export interface LiveIntelligenceInsight {
  id: string;
  label: string;
  value: string;
  tone: "success" | "warn" | "info" | "premium";
  active?: boolean;
}

export interface LiveIntelligenceSnapshot {
  activatedEngines: LiveIntelligenceInsight[];
  insights: LiveIntelligenceInsight[];
  readerHook: "alta" | "media" | "da_rafforzare";
  bingeability: "alto" | "medio" | "da_rafforzare";
}

function hookScore(idea: string, chapters: number): "alta" | "media" | "da_rafforzare" {
  const words = idea.trim().split(/\s+/).filter(Boolean).length;
  const hasConflict = /\b(ma|però|segreto|morte|tradimento|pericolo|mistero|guerra|amore|odio)\b/i.test(idea);
  if (words >= 12 && hasConflict) return "alta";
  if (words >= 6) return "media";
  return "da_rafforzare";
}

function bingeScore(chapters: number, bookLength: string): "alto" | "medio" | "da_rafforzare" {
  if (chapters >= 16 && bookLength !== "short") return "alto";
  if (chapters >= 10) return "medio";
  return "da_rafforzare";
}

function voiceLabel(profile: WritingStyleProfile): string {
  const parts: string[] = [];
  if (profile.emotionalIntensity >= 70) parts.push("introspezione emotiva");
  if (profile.tensionIntensity >= 70) parts.push("atmosfera intensa");
  if (profile.poeticLevel >= 65) parts.push("lirismo controllato");
  if (profile.dialogueLevel >= 65) parts.push("dialoghi carichi");
  if (profile.showDontTell >= 70) parts.push("show don't tell dominante");
  if (profile.slowBurn >= 70) parts.push("slow burn protetto");
  return parts.length ? parts.join(" + ") : "voce equilibrata, chiara";
}

function characterCompatibility(chars: BookCharacter[]): LiveIntelligenceInsight {
  const filled = chars.filter((c) => String(c.name || "").trim());
  if (filled.length < 2) {
    return { id: "compat", label: "Dinamica cast", value: "Aggiungi almeno 2 personaggi per tensione relazionale", tone: "info" };
  }
  const wounds = filled.filter((c) => c.wound || c.secret).length;
  const desires = filled.filter((c) => c.externalDesire).length;
  if (wounds >= 2 && desires >= 1) {
    return { id: "compat", label: "Compatibilità emotiva narrativa", value: "Forte — ferite e desideri in collisione", tone: "success" };
  }
  if (wounds >= 1) {
    return { id: "compat", label: "Compatibilità emotiva narrativa", value: "Buona — suggerito più attrito esplicito", tone: "warn" };
  }
  return { id: "compat", label: "Compatibilità emotiva narrativa", value: "Debole — aggiungi ferita o segreto", tone: "warn" };
}

export function computeLiveIntelligence(input: {
  step: number;
  idea: string;
  objective: BookObjective;
  styleProfile: WritingStyleProfile;
  characters: BookCharacter[];
  chapters: number;
  bookLength: string;
}): LiveIntelligenceSnapshot {
  const { objective, styleProfile, characters, chapters, bookLength, idea } = input;
  const activatedEngines: LiveIntelligenceInsight[] = [];
  const insights: LiveIntelligenceInsight[] = [];

  const isRomance = /romance|dark-romance/i.test(objective.genre);
  const isThriller = /thriller/i.test(objective.genre);

  activatedEngines.push(
    { id: "genre", label: "Genre Brain", value: objective.label, tone: "premium", active: true },
    { id: "blueprint", label: "Blueprint Integrity", value: "Attivo", tone: "success", active: true },
    { id: "humanizer", label: "Humanizer Layer", value: "Pronto", tone: "success", active: true },
    { id: "anti-rep", label: "Anti-Repetition", value: "Attivo", tone: "success", active: true },
  );

  if (isRomance || styleProfile.slowBurn >= 55) {
    activatedEngines.push({
      id: "slow-burn",
      label: "Slow Burn Protection",
      value: styleProfile.slowBurn >= 65 ? "Attiva" : "Moderata",
      tone: "premium",
      active: true,
    });
  }

  if (isThriller || styleProfile.tensionIntensity >= 60) {
    activatedEngines.push({
      id: "tension",
      label: "Tension Engine",
      value: "Attivato",
      tone: "premium",
      active: true,
    });
  }

  if (styleProfile.emotionalIntensity >= 60) {
    activatedEngines.push({
      id: "emotion-curve",
      label: "Emotional Addiction Curve",
      value: styleProfile.emotionalIntensity >= 75 ? "Rilevata — alta" : "Rilevata — media",
      tone: "info",
      active: true,
    });
  }

  const readerHook = hookScore(idea, chapters);
  insights.push({
    id: "hook",
    label: "Reader Hook Potential",
    value: readerHook === "alta" ? "Alta" : readerHook === "media" ? "Media" : "Da rafforzare",
    tone: readerHook === "alta" ? "success" : readerHook === "media" ? "info" : "warn",
  });

  if (input.step >= 2) {
    insights.push({
      id: "voice",
      label: "Voce narrativa rilevata",
      value: voiceLabel(styleProfile),
      tone: "premium",
    });
  }

  if (input.step >= 3) {
    insights.push(characterCompatibility(characters));
  }

  if (input.step >= 4) {
    const binge = bingeScore(chapters, bookLength);
    insights.push({
      id: "binge",
      label: "Potenziale bingeability",
      value: binge === "alto" ? "Alto" : binge === "medio" ? "Medio" : "Da rafforzare",
      tone: binge === "alto" ? "success" : binge === "medio" ? "info" : "warn",
    });
    if (chapters >= 20) {
      insights.push({
        id: "memory",
        label: "Long Book Memory",
        value: "Attivo per continuità seriale",
        tone: "success",
      });
    }
  }

  return {
    activatedEngines,
    insights,
    readerHook,
    bingeability: bingeScore(chapters, bookLength),
  };
}
