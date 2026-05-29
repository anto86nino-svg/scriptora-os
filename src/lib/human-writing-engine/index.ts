export type { HumanWritingContext, HumanWritingDomain, HumanWritingProfile } from "./types";
export { resolveHumanWritingProfile } from "./profiles";
export { buildHumanWritingPromptBlock, shouldApplyHumanWritingPostProcess } from "./prompt";
export { applyHumanWritingPostProcess } from "./post-process";

export const HUMAN_WRITING_ENGINE_V2_STORAGE_KEY = "scriptora-human-writing-engine-v2-enabled";

export function isHumanWritingEngineV2Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_HUMAN_WRITING_V2 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(HUMAN_WRITING_ENGINE_V2_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setHumanWritingEngineV2Enabled(enabled: boolean): void {
  try {
    localStorage.setItem(HUMAN_WRITING_ENGINE_V2_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-human-writing-v2-change"));
  } catch {
    // non-blocking
  }
}
