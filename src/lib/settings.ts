export interface WritingSettings {
  fontFamily: string;
  fontSize: number; // px
  lineSpacing: number; // multiplier
}

const STORAGE_KEY = "scriptora_writing_settings";

const DEFAULT: WritingSettings = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: 16,
  lineSpacing: 2,
};

export const FONT_OPTIONS = [
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Garamond', 'EB Garamond', serif", label: "Garamond" },
  { value: "'Arial', sans-serif", label: "Arial" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

export function loadSettings(): WritingSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT;
}

export function saveSettings(s: WritingSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
