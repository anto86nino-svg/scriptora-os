import type { ExpressBookScenario } from "@/lib/guided-interview/express-book-package";
import type { ExpressControlLevel } from "@/lib/guided-interview/express-forge-types";

/** Pick the scenario Studio Express auto mode should apply before Foundation Lock. */
export function pickExpressAutoScenario(
  packages: ExpressBookScenario[],
): ExpressBookScenario | undefined {
  if (!packages.length) return undefined;
  return packages.find((p) => p.variant === "commercial") ?? packages[0];
}

export function expressSubmitAllowed(
  controlLevel: ExpressControlLevel,
  ideaSeed: string,
): boolean {
  return controlLevel === "auto" || ideaSeed.trim().length >= 4;
}
