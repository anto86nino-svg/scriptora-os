import { getUILanguage, setUILanguage, type UILanguage } from "@/lib/i18n";
import {
  loadVisualPreset,
  saveVisualPreset,
  type VisualPerformancePreset,
} from "@/lib/performance-mode";
import {
  loadScriptoraAppearance,
  saveScriptoraAppearance,
  SCRIPTORA_BACKGROUNDS,
  type ScriptoraBackgroundId,
  type ScriptoraWritingFont,
} from "@/lib/scriptora-appearance";
import { loadSettings, saveSettings, type WritingSettings } from "@/lib/settings";
import { isHumanizerLayerEnabled, setHumanizerLayerEnabled } from "@/lib/HumanizerLayer";
import { isGenreBrainEnabled, setGenreBrainEnabled } from "@/lib/GenreBrain";
import { isStoryBibleLockEnabled, setStoryBibleLockEnabled } from "@/lib/StoryBibleLock";
import { isAdvancedLaunchpadEnabled, setAdvancedLaunchpadEnabled } from "@/components/one-flow/ProfileMenuDialog";

export const HUB_STORAGE_KEY = "scriptora-settings-hub-v1";
export const HUB_CHANGE_EVENT = "scriptora-settings-hub-change";
export const GUIDED_FLOW_KEY = "scriptora-guided-flow";

export type EditorWidth = "narrow" | "medium" | "wide";
export type HumanizerIntensity = "light" | "balanced" | "deep";
export type DefaultExportFormat = "epub" | "pdf" | "docx" | "kdp";

export interface ScriptoraHubPreferences {
  reduceAnimations: boolean;
  autoSave: boolean;
  focusWritingMode: boolean;
  smartCache: boolean;
  smoothTransitions: boolean;
  preferStreamingPreview: boolean;
  dynamicBackground: boolean;
  atmosphereIntensity: number;
  cinematicMode: boolean;
  glowLevel: number;
  textureIntensity: number;
  editorWidth: EditorWidth;
  focusParagraph: boolean;
  typewriterMode: boolean;
  smoothScroll: boolean;
  humanizerIntensity: HumanizerIntensity;
  slowBurnProtection: boolean;
  emotionalRealism: boolean;
  showDontTell: boolean;
  creativityVsConsistency: number;
  preserveAuthorVoice: boolean;
  narrativeTension: boolean;
  defaultExportFormat: DefaultExportFormat;
  autoFrontMatter: boolean;
  authorSignatureInExport: boolean;
}

const DEFAULT_HUB_PREFERENCES: ScriptoraHubPreferences = {
  reduceAnimations: false,
  autoSave: true,
  focusWritingMode: false,
  smartCache: true,
  smoothTransitions: true,
  preferStreamingPreview: true,
  dynamicBackground: true,
  atmosphereIntensity: 72,
  cinematicMode: false,
  glowLevel: 58,
  textureIntensity: 46,
  editorWidth: "medium",
  focusParagraph: false,
  typewriterMode: false,
  smoothScroll: true,
  humanizerIntensity: "balanced",
  slowBurnProtection: true,
  emotionalRealism: true,
  showDontTell: true,
  creativityVsConsistency: 58,
  preserveAuthorVoice: true,
  narrativeTension: true,
  defaultExportFormat: "epub",
  autoFrontMatter: true,
  authorSignatureInExport: true,
};

export const THEME_QUICK_PICKS: Array<{
  id: string;
  label: string;
  emoji: string;
  backgroundId: ScriptoraBackgroundId;
}> = [
  { id: "horror", label: "Horror", emoji: "🔪", backgroundId: "horror-crime-lab" },
  { id: "romance", label: "Romance", emoji: "🥀", backgroundId: "dark-romance-velvet" },
  { id: "fantasy", label: "Fantasy", emoji: "🏰", backgroundId: "fantasy-throne" },
  { id: "scifi", label: "Sci-Fi", emoji: "🧠", backgroundId: "scifi-intel-lab" },
  { id: "noir", label: "Noir", emoji: "🕵️", backgroundId: "noir-office" },
  { id: "luxury", label: "Luxury", emoji: "✨", backgroundId: "classic-premium-author" },
  { id: "minimal", label: "Minimal", emoji: "◻️", backgroundId: "clean-pro" },
];

function normalizeHubPreferences(raw: Partial<ScriptoraHubPreferences> | null): ScriptoraHubPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HUB_PREFERENCES };
  return {
    ...DEFAULT_HUB_PREFERENCES,
    ...raw,
    atmosphereIntensity: clamp(raw.atmosphereIntensity ?? DEFAULT_HUB_PREFERENCES.atmosphereIntensity, 0, 100),
    glowLevel: clamp(raw.glowLevel ?? DEFAULT_HUB_PREFERENCES.glowLevel, 0, 100),
    textureIntensity: clamp(raw.textureIntensity ?? DEFAULT_HUB_PREFERENCES.textureIntensity, 0, 100),
    creativityVsConsistency: clamp(raw.creativityVsConsistency ?? DEFAULT_HUB_PREFERENCES.creativityVsConsistency, 0, 100),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function loadHubPreferences(): ScriptoraHubPreferences {
  try {
    const raw = localStorage.getItem(HUB_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HUB_PREFERENCES };
    return normalizeHubPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_HUB_PREFERENCES };
  }
}

export function saveHubPreferences(patch: Partial<ScriptoraHubPreferences>): ScriptoraHubPreferences {
  const next = normalizeHubPreferences({ ...loadHubPreferences(), ...patch });
  localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(next));
  applyHubPreferences(next);
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
  return next;
}

export function applyHubPreferences(prefs: ScriptoraHubPreferences = loadHubPreferences()): void {
  const root = document.documentElement;
  root.dataset.scriptoraReduceAnimations = prefs.reduceAnimations ? "1" : "0";
  root.dataset.scriptoraFocusWriting = prefs.focusWritingMode ? "1" : "0";
  root.dataset.scriptoraEditorWidth = prefs.editorWidth;
  root.dataset.scriptoraTypewriter = prefs.typewriterMode ? "1" : "0";
  root.dataset.scriptoraSmoothScroll = prefs.smoothScroll ? "1" : "0";
  root.dataset.scriptoraDynamicBg = prefs.dynamicBackground ? "1" : "0";
  root.dataset.scriptoraCinematic = prefs.cinematicMode ? "1" : "0";
  root.style.setProperty("--scriptora-hub-atmosphere", String(prefs.atmosphereIntensity / 100));
  root.style.setProperty("--scriptora-hub-glow", String(prefs.glowLevel / 100));
  root.style.setProperty("--scriptora-hub-texture", String(prefs.textureIntensity / 100));
  if (!prefs.smoothTransitions) {
    root.classList.add("scriptora-no-smooth-transitions");
  } else {
    root.classList.remove("scriptora-no-smooth-transitions");
  }
}

export function isGuidedFlowEnabled(): boolean {
  try {
    return localStorage.getItem(GUIDED_FLOW_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setGuidedFlowEnabled(enabled: boolean): void {
  localStorage.setItem(GUIDED_FLOW_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
}

export function setUiLanguage(lang: UILanguage): void {
  setUILanguage(lang);
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
}

export function setVisualPerformancePreset(preset: VisualPerformancePreset): void {
  saveVisualPreset(preset);
}

export function setWritingPreferences(settings: WritingSettings): void {
  saveSettings(settings);
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
}

export function setThemeBackground(backgroundId: ScriptoraBackgroundId): void {
  const current = loadScriptoraAppearance();
  saveScriptoraAppearance({ ...current, backgroundId });
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
}

export function setThemeWritingFont(writingFont: ScriptoraWritingFont): void {
  const current = loadScriptoraAppearance();
  saveScriptoraAppearance({ ...current, writingFont });
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
}

export function getSettingsSnapshot() {
  return {
    hub: loadHubPreferences(),
    visualPreset: loadVisualPreset(),
    appearance: loadScriptoraAppearance(),
    writing: loadSettings(),
    uiLanguage: getUILanguage(),
    guidedFlow: isGuidedFlowEnabled(),
    humanizer: isHumanizerLayerEnabled(),
    genreBrain: isGenreBrainEnabled(),
    storyBibleLock: isStoryBibleLockEnabled(),
    advancedLaunchpad: isAdvancedLaunchpadEnabled(),
    activeBackground: SCRIPTORA_BACKGROUNDS.find((b) => b.id === loadScriptoraAppearance().backgroundId),
  };
}

const CACHE_CLEAR_ALLOWLIST_PREFIXES = [
  "scriptora-wizard-",
  "scriptora-marketplace-",
  "scriptora-performance-hint-",
  "scriptora-open-",
  "scriptora-gateway-",
  "scriptora-atmosphere-profile",
];

export function clearNonEssentialCaches(): string[] {
  const removed: string[] = [];
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (CACHE_CLEAR_ALLOWLIST_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    }
    sessionStorage.removeItem("scriptora-wizard-character-free-regens");
    removed.push("session:scriptora-wizard-character-free-regens");
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
  return removed;
}

export function restoreHubPreferencesDefaults(): ScriptoraHubPreferences {
  localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(DEFAULT_HUB_PREFERENCES));
  applyHubPreferences(DEFAULT_HUB_PREFERENCES);
  window.dispatchEvent(new Event(HUB_CHANGE_EVENT));
  return { ...DEFAULT_HUB_PREFERENCES };
}
