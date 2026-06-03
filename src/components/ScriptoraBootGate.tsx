import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InternalLoadingGuardPanel } from "@/components/InternalLoadingGuardPanel";
import { ScriptoraBootScreen } from "@/components/ScriptoraBootScreen";
import { useHybridBootProgress } from "@/hooks/useHybridBootProgress";
import { clearScriptoraLocalSessionPointers } from "@/lib/boot-recovery";
import { ensureStorageHydrated, hasBootRitualCompletedThisSession, markBootRitualCompletedThisSession } from "@/lib/smart-boot";

interface ScriptoraBootGateProps {
  children: ReactNode;
  authReady: boolean;
  planReady?: boolean;
}

function ShellReadyMarker({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/**
 * Premium boot overlay — hybrid cinematic progress + real init (auth, storage, plan, route chunk).
 */
export function ScriptoraBootGate({
  children,
  authReady,
  planReady = true,
}: ScriptoraBootGateProps) {
  const skipRitual = hasBootRitualCompletedThisSession();
  const [storageReady, setStorageReady] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [revealed, setRevealed] = useState(skipRitual);
  const [stalled, setStalled] = useState(false);
  const exitStartedRef = useRef(false);
  const bootStartedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      console.error("[workspace init failed] Storage hydration timed out; continuing with safe local fallback");
      setStorageReady(true);
    }, 6_000);

    ensureStorageHydrated()
      .catch((error) => {
        console.error("[workspace init failed] Storage hydration failed; continuing with safe local fallback", error);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setStorageReady(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const markShellReady = useCallback(() => {
    setShellReady(true);
  }, []);

  const flags = useMemo(
    () => ({
      authReady,
      storageReady,
      planReady,
      shellReady,
    }),
    [authReady, planReady, shellReady, storageReady],
  );

  const bootComplete = authReady && storageReady && planReady && shellReady;
  const { progress, step, messageKey, readyToExit } = useHybridBootProgress(flags, bootComplete);

  useEffect(() => {
    if (!readyToExit || exitStartedRef.current) return;
    exitStartedRef.current = true;
    markBootRitualCompletedThisSession();
    setExiting(true);
    const id = window.setTimeout(() => setRevealed(true), 520);
    return () => clearTimeout(id);
  }, [readyToExit]);

  const mountShell = authReady && storageReady && planReady;

  // Safety: never stall forever if a lazy route chunk fails to resolve.
  useEffect(() => {
    if (!mountShell || shellReady) return;
    const id = window.setTimeout(() => {
      console.error("[dashboard bootstrap failed] Shell readiness marker timed out; revealing safe workspace shell");
      setShellReady(true);
    }, skipRitual ? 2_000 : 12_000);
    return () => clearTimeout(id);
  }, [mountShell, shellReady, skipRitual]);

  useEffect(() => {
    if (revealed) return;
    const id = window.setTimeout(() => {
      const elapsedMs = Date.now() - bootStartedAtRef.current;
      console.error("[boot-debug] internal boot stalled", {
        route: window.location.pathname,
        authReady,
        storageReady,
        planReady,
        shellReady,
        bootComplete,
        readyToExit,
        revealed,
        exiting,
        mountShell,
        skipRitual,
        elapsedMs,
      });
      setStalled(true);
    }, 10_000);
    return () => window.clearTimeout(id);
  }, [authReady, bootComplete, exiting, mountShell, planReady, readyToExit, revealed, shellReady, skipRitual, storageReady]);

  useEffect(() => {
    if (!stalled || !mountShell || revealed) return;
    const id = window.setTimeout(() => {
      console.error("[boot-debug] forcing reveal after recoverable internal boot stall");
      markBootRitualCompletedThisSession();
      setShellReady(true);
      setRevealed(true);
    }, 3_000);
    return () => window.clearTimeout(id);
  }, [mountShell, revealed, stalled]);

  const openSafeDashboard = useCallback(() => {
    clearScriptoraLocalSessionPointers();
    markBootRitualCompletedThisSession();
    if (!authReady) {
      window.location.assign("/auth");
      return;
    }
    setStorageReady(true);
    setShellReady(true);
    setRevealed(true);
  }, [authReady]);

  return (
    <>
      {!skipRitual && !revealed && (
        <ScriptoraBootScreen
          progress={progress}
          step={step}
          messageKey={messageKey}
          exiting={exiting}
        />
      )}

      {stalled && !revealed && (
        <InternalLoadingGuardPanel
          details="Auth, storage, piano o workspace non hanno completato il bootstrap nei tempi previsti."
          onOpenSafeDashboard={openSafeDashboard}
        />
      )}

      <div
        className={
          revealed
            ? skipRitual
              ? "min-h-screen"
              : "scriptora-boot-reveal min-h-screen"
            : "pointer-events-none fixed inset-0 overflow-hidden opacity-0"
        }
        aria-hidden={!revealed}
      >
        {mountShell && (
          <>
            <ShellReadyMarker onReady={markShellReady} />
            <Suspense fallback={null}>{children}</Suspense>
          </>
        )}
      </div>
    </>
  );
}
