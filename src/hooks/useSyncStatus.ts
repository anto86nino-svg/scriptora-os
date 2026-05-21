import { useState, useCallback, useEffect } from "react";

export type SyncStatus = "idle" | "saving" | "saved" | "pending" | "offline";

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "idle"
  );

  useEffect(() => {
    const handleOnline = () => setStatus("saved");
    const handleOffline = () => setStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const markSaving = useCallback(() => {
    setStatus(navigator.onLine === false ? "offline" : "saving");
  }, []);
  const markSaved = useCallback(() => {
    setStatus("saved");
    // Reset to idle after 3s
    setTimeout(() => setStatus(prev => prev === "saved" ? "idle" : prev), 3000);
  }, []);
  const markPending = useCallback(() => {
    setStatus(navigator.onLine === false ? "offline" : "pending");
    setTimeout(() => setStatus(prev => prev === "pending" ? "idle" : prev), 5000);
  }, []);
  const markOffline = useCallback(() => setStatus("offline"), []);

  return { syncStatus: status, markSaving, markSaved, markPending, markOffline };
}
