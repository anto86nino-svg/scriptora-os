import { useEffect, useState } from "react";
import { readGuidedFlowEnabled, subscribeGuidedFlow, writeGuidedFlowEnabled } from "@/lib/guided-flow";

export function useGuidedFlow() {
  const [enabled, setEnabledState] = useState(readGuidedFlowEnabled);

  useEffect(() => subscribeGuidedFlow(setEnabledState), []);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    writeGuidedFlowEnabled(next);
  };

  return { enabled, setEnabled };
}
