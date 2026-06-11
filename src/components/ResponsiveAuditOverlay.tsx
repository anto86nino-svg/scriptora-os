import { useEffect, useState } from "react";
import { auditViewportLayout, detectViewportClass } from "@/lib/adaptive-viewport-engine";

/** Dev-only responsive audit — surfaces overflow issues without manual inspection. */
export function ResponsiveAuditOverlay() {
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
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-w-[min(92vw,360px)] rounded-lg border border-amber-400/40 bg-black/85 px-3 py-2 text-[10px] leading-snug text-amber-100 shadow-lg"
      aria-hidden
    >
      <div className="mb-1 font-semibold text-amber-300">Viewport: {viewport}</div>
      <ul className="space-y-0.5">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
