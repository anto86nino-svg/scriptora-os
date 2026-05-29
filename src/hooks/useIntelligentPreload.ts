import { useEffect, useRef } from "react";
import type { BookProject } from "@/types/book";
import { resolvePreloadProfile, scheduleIntelligentPreload } from "@/lib/smart-boot";

/** Warm likely OS modules after the dashboard shell is visible. */
export function useIntelligentPreload(projects: BookProject[], enabled = true) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    const profile = resolvePreloadProfile(projects);
    scheduleIntelligentPreload(profile);
  }, [enabled, projects]);
}
