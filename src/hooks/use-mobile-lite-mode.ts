import { useEffect, useState } from "react";
import { isMobileLiteMode } from "@/lib/mobile-performance";

export function useMobileLiteMode(): boolean {
  const [enabled, setEnabled] = useState(() => isMobileLiteMode());

  useEffect(() => {
    const update = () => setEnabled(isMobileLiteMode());
    const queries = [
      window.matchMedia("(max-width: 767px)"),
      window.matchMedia("(hover: none) and (pointer: coarse)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(orientation: landscape)"),
    ];

    update();
    queries.forEach((query) => query.addEventListener("change", update));
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      queries.forEach((query) => query.removeEventListener("change", update));
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return enabled;
}
