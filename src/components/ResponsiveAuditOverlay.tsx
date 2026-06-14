import { useEffect, useState } from "react";
import { auditViewportLayout, detectViewportClass } from "@/lib/adaptive-viewport-engine";

/** Dev-only responsive audit panel (embedded in floating dock). */
export function ResponsiveAuditPanel() {
  const [issues, setIssues] = useState<string[]>([]);
  const [viewport, setViewport] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const run = () => {
      setViewport(detectViewportClass());
      setIssues(auditViewportLayout());
    };

    run();
    const timer = setInterval(run, 4000);
    window.addEventListener("resize", run);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", run);
    };
  }, []);

  if (!import.meta.env.DEV || issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-400/35 bg-black/80 px-2.5 py-2 text-[10px] leading-snug text-amber-100">
      <div className="mb-1 font-semibold text-amber-300">Audit · {viewport}</div>
      <ul className="space-y-0.5 max-h-24 overflow-y-auto">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

/** @deprecated Use ResponsiveAuditPanel inside ScriptoraFloatingDock */
export function ResponsiveAuditOverlay() {
  return null;
}
