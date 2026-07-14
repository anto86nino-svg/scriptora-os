export type ScriptoraUiMode = "standard" | "romanziere";

const KEY = "scriptora-ui-mode";

export function getUiMode(): ScriptoraUiMode {
  const value = localStorage.getItem(KEY);
  return value === "romanziere" ? "romanziere" : "standard";
}

export function setUiMode(mode: ScriptoraUiMode) {
  localStorage.setItem(KEY, mode);
}

export function isRomanziereMode() {
  return getUiMode() === "romanziere";
}
