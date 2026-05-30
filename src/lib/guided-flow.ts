export const GUIDED_FLOW_KEY = "scriptora-guided-flow";
export const GUIDED_FLOW_EVENT = "scriptora-guided-flow-change";

export function readGuidedFlowEnabled(): boolean {
  const stored = localStorage.getItem(GUIDED_FLOW_KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;

  const legacyJson = localStorage.getItem("scriptora-guided-flow-enabled");
  if (legacyJson !== null) {
    try {
      return JSON.parse(legacyJson) === true;
    } catch {
      return legacyJson === "true";
    }
  }

  const legacyGuide = localStorage.getItem("scriptora-global-step-guide");
  if (legacyGuide === "on") return true;
  if (legacyGuide === "off") return false;

  return false;
}

export function writeGuidedFlowEnabled(enabled: boolean): void {
  localStorage.setItem(GUIDED_FLOW_KEY, enabled ? "on" : "off");
  localStorage.removeItem("scriptora-guided-flow-enabled");
  window.dispatchEvent(new CustomEvent(GUIDED_FLOW_EVENT, { detail: { enabled } }));
}

export function subscribeGuidedFlow(onChange: (enabled: boolean) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
    if (typeof detail?.enabled === "boolean") onChange(detail.enabled);
  };

  window.addEventListener(GUIDED_FLOW_EVENT, handler);
  return () => window.removeEventListener(GUIDED_FLOW_EVENT, handler);
}

export function safeTrim(value: unknown): string {
  return String(value ?? "").trim();
}
