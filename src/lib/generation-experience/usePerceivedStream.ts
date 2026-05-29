import { useEffect, useRef, useState } from "react";

/**
 * Perceived streaming — animates toward real chunk content without altering it.
 * Reuses engine output; only affects display cadence between chunk updates.
 */
export function usePerceivedStreamText(fullText: string, active: boolean, charsPerSecond = 42): string {
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef("");
  const displayedRef = useRef("");

  useEffect(() => {
    targetRef.current = fullText;
    if (!active) {
      displayedRef.current = fullText;
      setDisplayed(fullText);
      return undefined;
    }
    if (!fullText) {
      displayedRef.current = "";
      setDisplayed("");
      return undefined;
    }
    if (fullText.length < displayedRef.current.length) {
      displayedRef.current = fullText;
      setDisplayed(fullText);
    }

    const tickMs = 50;
    const charsPerTick = Math.max(1, Math.round((charsPerSecond * tickMs) / 1000));

    const interval = window.setInterval(() => {
      const target = targetRef.current;
      if (displayedRef.current.length >= target.length) return;
      const nextLen = Math.min(target.length, displayedRef.current.length + charsPerTick);
      displayedRef.current = target.slice(0, nextLen);
      setDisplayed(displayedRef.current);
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [fullText, active, charsPerSecond]);

  return displayed;
}

export function useEditorialChecklist(contentReady: boolean): number {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (contentReady) {
      setCompletedSteps(4);
      return undefined;
    }
    setCompletedSteps(0);
    const timers = [400, 900, 1400, 1900].map((delay, index) =>
      window.setTimeout(() => setCompletedSteps(index + 1), delay),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [contentReady]);

  return completedSteps;
}
