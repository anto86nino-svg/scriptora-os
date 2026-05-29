import { useEffect, useRef, useState } from "react";

export type BootProgressFlags = {
  authReady: boolean;
  storageReady: boolean;
  planReady: boolean;
  shellReady: boolean;
};

export type BootRitualStep = 1 | 2 | 3;

export type BootRitualMessageKey =
  | "boot_loading_universe"
  | "boot_msg_intelligence"
  | "boot_ritual_publish";

/** Step 1 — WRITE */
const STEP_1_MS = 1000;
/** Step 2 — EDIT */
const STEP_2_MS = 1000;
/** Step 3 — PUBLISH · DOMINATE */
const STEP_3_MS = 1200;

const STEP_2_END = STEP_1_MS + STEP_2_MS;
const RITUAL_MS = STEP_2_END + STEP_3_MS;
const FINISH_MS = 450;
const LERP = 0.085;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function getBootRitualStep(elapsed: number): BootRitualStep {
  if (elapsed < STEP_1_MS) return 1;
  if (elapsed < STEP_2_END) return 2;
  return 3;
}

export function getBootRitualMessageKey(step: BootRitualStep): BootRitualMessageKey {
  if (step === 1) return "boot_loading_universe";
  if (step === 2) return "boot_msg_intelligence";
  return "boot_ritual_publish";
}

/** Ritual timeline — 0→35→75→100 across ~3.2s (1.0s + 1.0s + 1.2s). */
export function getRitualProgressTarget(elapsed: number): number {
  const t = Math.min(elapsed, RITUAL_MS);

  if (t <= STEP_1_MS) {
    return 35 * easeOutCubic(t / STEP_1_MS);
  }
  if (t <= STEP_2_END) {
    const local = (t - STEP_1_MS) / STEP_2_MS;
    return 35 + 40 * easeOutCubic(local);
  }
  const local = (t - STEP_2_END) / STEP_3_MS;
  return 75 + 25 * easeOutCubic(local);
}

/** Real init mapped onto the ritual bands — slow boots can outrun the timeline. */
export function computeRealProgressTarget(flags: BootProgressFlags): number {
  if (!flags.authReady) return 8;
  if (!flags.storageReady) return 42;
  if (!flags.planReady) return 58;
  if (!flags.shellReady) return 86;
  return 94;
}

/**
 * Premium Scriptora Boot Ritual — 3-step cinematic progression + real Smart Boot readiness.
 * Exit requires BOTH ritual complete AND app ready (never stalls at 100%).
 */
export function useHybridBootProgress(flags: BootProgressFlags, bootComplete: boolean) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<BootRitualStep>(1);
  const [readyToExit, setReadyToExit] = useState(false);

  const bootStartRef = useRef(Date.now());
  const bootCompleteAtRef = useRef<number | null>(null);
  const displayRef = useRef(0);

  useEffect(() => {
    if (bootComplete && bootCompleteAtRef.current === null) {
      bootCompleteAtRef.current = Date.now();
    }
  }, [bootComplete]);

  useEffect(() => {
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;

      const now = Date.now();
      const elapsed = now - bootStartRef.current;
      const ritualComplete = elapsed >= RITUAL_MS;

      const ritualStep = getBootRitualStep(elapsed);
      setStep(ritualStep);

      const ritualTarget = getRitualProgressTarget(elapsed);
      const realTarget = computeRealProgressTarget(flags);
      let target = Math.max(ritualTarget, realTarget);

      const finishGate =
        bootComplete &&
        ritualComplete &&
        bootCompleteAtRef.current !== null;

      if (finishGate) {
        const finishStart = Math.max(bootCompleteAtRef.current!, bootStartRef.current + RITUAL_MS);
        const finishElapsed = now - finishStart;

        if (finishElapsed >= 0) {
          const finishRatio = Math.min(1, finishElapsed / FINISH_MS);
          target = Math.max(target, 95 + 5 * easeOutCubic(finishRatio));
        } else {
          target = Math.min(target, 94);
        }
      } else {
        target = Math.min(target, 94);
      }

      const next = displayRef.current + (target - displayRef.current) * LERP;
      displayRef.current = Math.min(100, next);
      setProgress(displayRef.current);

      if (finishGate) {
        const finishStart = Math.max(bootCompleteAtRef.current!, bootStartRef.current + RITUAL_MS);
        const revealAt = finishStart + FINISH_MS;
        const finishDone = displayRef.current >= 98.5;

        if (now >= revealAt && finishDone) {
          setReadyToExit(true);
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [
    flags.authReady,
    flags.storageReady,
    flags.planReady,
    flags.shellReady,
    bootComplete,
  ]);

  const messageKey = getBootRitualMessageKey(step);

  return { progress, step, messageKey, readyToExit };
}
