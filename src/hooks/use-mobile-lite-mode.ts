import { useState } from "react";
import { isMobileLiteMode } from "@/lib/mobile-performance";

export function useMobileLiteMode(): boolean {
  const [enabled] = useState(() => isMobileLiteMode());
  return enabled;
}
