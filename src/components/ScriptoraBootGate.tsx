import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScriptoraBootScreen } from "@/components/ScriptoraBootScreen";
import { useHybridBootProgress } from "@/hooks/useHybridBootProgress";
import { ensureStorageHydrated } from "@/lib/smart-boot";

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
  const [storageReady, setStorageReady] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const exitStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    ensureStorageHydrated().then(() => {
      if (!cancelled) setStorageReady(true);
    });
    return () => {
      cancelled = true;
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
    setExiting(true);
    const id = window.setTimeout(() => setRevealed(true), 520);
    return () => clearTimeout(id);
  }, [readyToExit]);

  const mountShell = authReady && storageReady && planReady;

  // Safety: never stall forever if a lazy route chunk fails to resolve.
  useEffect(() => {
    if (!mountShell || shellReady) return;
    const id = window.setTimeout(() => setShellReady(true), 12_000);
    return () => clearTimeout(id);
  }, [mountShell, shellReady]);

  return (
    <>
      {!revealed && (
        <ScriptoraBootScreen
          progress={progress}
          step={step}
          messageKey={messageKey}
          exiting={exiting}
        />
      )}

      <div
        className={
          revealed
            ? "scriptora-boot-reveal min-h-screen"
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
