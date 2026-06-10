import { BookProject } from "@/types/book";

export type NarratorStyleId = "cinematic" | "intimate" | "dramatic" | "calm";

export interface NarratorStyleProfile {
  id: NarratorStyleId;
  label: string;
  rate: number;
  pitch: number;
  emotionalIntensityMode: "soft" | "balanced" | "high";
  dialogueCadenceMode: "natural" | "expressive" | "restrained";
  pacingMode: "immersive" | "balanced" | "tight";
}

export interface VoiceTelemetry {
  narrationPacingMode: NarratorStyleProfile["pacingMode"];
  emotionalIntensityMode: NarratorStyleProfile["emotionalIntensityMode"];
  dialogueCadenceMode: NarratorStyleProfile["dialogueCadenceMode"];
  silenceDensity: number;
  narrationRhythmProfile: "flowing" | "balanced" | "punchy";
}

export const VOICE_STUDIO_STYLES: NarratorStyleProfile[] = [
  {
    id: "cinematic",
    label: "Cinematic Narrator",
    rate: 0.9,
    pitch: 0.95,
    emotionalIntensityMode: "balanced",
    dialogueCadenceMode: "expressive",
    pacingMode: "immersive",
  },
  {
    id: "intimate",
    label: "Intimate Confessional",
    rate: 0.88,
    pitch: 1.05,
    emotionalIntensityMode: "soft",
    dialogueCadenceMode: "natural",
    pacingMode: "immersive",
  },
  {
    id: "dramatic",
    label: "Dramatic Performance",
    rate: 0.97,
    pitch: 1.02,
    emotionalIntensityMode: "high",
    dialogueCadenceMode: "expressive",
    pacingMode: "tight",
  },
  {
    id: "calm",
    label: "Calm Storyteller",
    rate: 0.92,
    pitch: 0.98,
    emotionalIntensityMode: "soft",
    dialogueCadenceMode: "restrained",
    pacingMode: "balanced",
  },
];

export interface CharacterVoiceProfile {
  id: string;
  name: string;
  emotionalMode: "reserved" | "volatile" | "warm" | "cold";
  cadence: "short-lines" | "balanced" | "lyrical";
  toneHint: string;
}

// Future-facing scaffold; intentionally lightweight and additive.
export interface VoiceStudioPreparation {
  narratorPresets: NarratorStyleProfile[];
  characterProfiles: CharacterVoiceProfile[];
}

export function prepareVoiceStudioProfiles(project: BookProject | null): VoiceStudioPreparation {
  const raw = Array.isArray((project?.config as any)?.characters) ? (project?.config as any)?.characters : [];
  const characterProfiles: CharacterVoiceProfile[] = raw
    .filter((c: any) => String(c?.name || "").trim().length > 0)
    .map((c: any, idx: number) => ({
      id: `character-${idx}`,
      name: [c.name, c.surname].filter(Boolean).join(" ").trim(),
      emotionalMode: /(guarded|cold|distant|avoid)/i.test(String(c.personality || "")) ? "cold"
        : /(intense|explosive|impulsive|jealous)/i.test(String(c.personality || "")) ? "volatile"
        : /(warm|kind|gentle|empathetic)/i.test(String(c.personality || "")) ? "warm"
        : "reserved",
      cadence: /(sarcastic|sharp|dry)/i.test(String(c.personality || "")) ? "short-lines"
        : /(poetic|reflective)/i.test(String(c.personality || "")) ? "lyrical"
        : "balanced",
      toneHint: c.role || "supporting voice",
    }));

  return {
    narratorPresets: VOICE_STUDIO_STYLES,
    characterProfiles,
  };
}

export function applyNarrativeReadDirectives(
  text: string,
  style: NarratorStyleProfile,
): { text: string; telemetry: VoiceTelemetry } {
  const clean = String(text || "").replace(/\r/g, "").trim();
  if (!clean) {
    return {
      text: "",
      telemetry: {
        narrationPacingMode: style.pacingMode,
        emotionalIntensityMode: style.emotionalIntensityMode,
        dialogueCadenceMode: style.dialogueCadenceMode,
        silenceDensity: 0,
        narrationRhythmProfile: "balanced",
      },
    };
  }

  let directed = clean;

  // Dialogue-aware pauses: improve readability without over-processing prose.
  directed = directed.replace(/(["“][^"”\n]{8,120}[”"])/g, "$1 ...");
  // Emotional micro-pauses around abrupt turn connectors.
  directed = directed.replace(/\b(but|yet|however|still|ma|pero|però)\b/gi, "... $1");
  // Cliffhanger emphasis near sentence endings.
  directed = directed.replace(/([!?])\s+([A-Z])/g, "$1 ... $2");

  if (style.pacingMode === "immersive") {
    directed = directed.replace(/\.\s+/g, ". ... ");
  } else if (style.pacingMode === "tight") {
    directed = directed.replace(/\.\s+/g, ". ");
  } else {
    directed = directed.replace(/\.\s+/g, ". .. ");
  }

  const pauseTokens = (directed.match(/\.\.\./g) || []).length;
  const words = directed.split(/\s+/).filter(Boolean).length;
  const silenceDensity = Number(((pauseTokens / Math.max(1, words)) * 100).toFixed(2));
  const rhythm: VoiceTelemetry["narrationRhythmProfile"] =
    style.pacingMode === "immersive" ? "flowing" : style.pacingMode === "tight" ? "punchy" : "balanced";

  return {
    text: directed,
    telemetry: {
      narrationPacingMode: style.pacingMode,
      emotionalIntensityMode: style.emotionalIntensityMode,
      dialogueCadenceMode: style.dialogueCadenceMode,
      silenceDensity,
      narrationRhythmProfile: rhythm,
    },
  };
}

export function emitVoiceStudioTelemetry(payload: VoiceTelemetry & { chapterTitle: string }) {
  try {
    if (typeof window === "undefined") return;
    const debugEnabled =
      (window as any).__SCRIPTORA_DEBUG_VOICE_STUDIO__ === true ||
      localStorage.getItem("scriptora-debug-voice-studio") === "1";
    if (!debugEnabled) return;
    console.info("[VoiceStudioTelemetry]", payload);
    window.dispatchEvent(new CustomEvent("scriptora:voice-studio-telemetry", { detail: payload }));
  } catch {
    // No-op: debug telemetry must never impact UX.
  }
}

