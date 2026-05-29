import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScriptoraBootScreen } from "@/components/ScriptoraBootScreen";
import {
  bootMessageKey,
  computeBootProgress,
  ensureStorageHydrated,
} from "@/lib/smart-boot";

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
 * Premium boot overlay — tracks real init (auth, storage, plan, route chunk).
 * No artificial delay: exits as soon as work completes.
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

  const progress = computeBootProgress(flags);
  const messageKey = bootMessageKey(flags);
  const bootComplete = authReady && storageReady && planReady && shellReady;

  useEffect(() => {
    if (!bootComplete || exitStartedRef.current) return;
    exitStartedRef.current = true;
    setExiting(true);
    const id = window.setTimeout(() => setRevealed(true), 320);
    return () => clearTimeout(id);
  }, [bootComplete]);

  const mountShell = authReady && storageReady && planReady;

  return (
    <>
      {!revealed && (
        <ScriptoraBootScreen progress={progress} messageKey={messageKey} exiting={exiting} />
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
          <Suspense fallback={null}>
            <ShellReadyMarker onReady={markShellReady} />
            {children}
          </Suspense>
        )}
      </div>
    </>
  );
}
