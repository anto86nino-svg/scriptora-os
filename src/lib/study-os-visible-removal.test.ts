import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const VISIBLE_SURFACES = [
  "src/components/landing/ScriptoraLanding.tsx",
  "src/components/landing/PublicDualPath.tsx",
  "src/components/landing/PublicHomeWow.tsx",
  "src/components/landing/PublicTestimonials.tsx",
  "src/components/os/home/HomeRebirth.tsx",
  "src/components/one-flow/DashboardOperationalSections.tsx",
  "src/components/pricing/ScriptoraPricingCatalog.tsx",
  "src/components/payments/PaymentStatusBanner.tsx",
  "src/components/billing/CreditMarketplacePanel.tsx",
  "src/components/boot/ScriptoraAliveTransition.tsx",
  "src/components/one-flow/ProfileMenuDialog.tsx",
  "src/components/settings/ScriptoraSettingsHub.tsx",
  "src/components/mobile/MobileDashboardChrome.tsx",
  "src/lib/legal-content.ts",
  "src/lib/scriptora-route-transition.ts",
  "src/components/MobileAppChrome.tsx",
  "index.html",
  "public/manifest.webmanifest",
] as const;

const VISIBLE_STUDY_REFERENCE = /Study\s*OS|StudyOS|\/study(?:-session)?\b|flashcards?|quizzes?|\bquiz\b|Studia meglio|Scrivi\s*[·+]\s*Studia/i;

describe("visible Study OS removal", () => {
  it.each(VISIBLE_SURFACES)("keeps %s free from Study OS promotion and navigation", (path) => {
    expect(readSource(path)).not.toMatch(VISIBLE_STUDY_REFERENCE);
  });

  it("does not mount Study routes while preserving the internal registry module", () => {
    const app = readSource("src/App.tsx");
    const registry = readSource("src/lib/one-flow/tool-registry.ts");

    expect(app).not.toMatch(/<Route\s+path=["']\/study/);
    expect(registry).toContain('id: "study"');
    expect(registry).toContain('canonicalRoute: "/study"');
  });
});
