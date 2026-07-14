import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("floating tool guide visibility", () => {
  it("does not mount the global Step Guide in the application chrome", () => {
    const chrome = readSource("src/components/MobileAppChrome.tsx");

    expect(chrome).not.toContain("ScriptoraStepGuide");
    expect(chrome).not.toContain("StepGuide");
    expect(chrome).toContain("!writerStudioVisible && !devMode");
  });

  it("does not mount or configure GuidedProjectFlow in Writer OS", () => {
    const writer = readSource("src/pages/Index.tsx");
    const dashboard = readSource("src/pages/Dashboard.tsx");
    const settings = readSource("src/components/settings/ScriptoraSettingsHub.tsx");

    expect(writer).not.toContain("GuidedProjectFlow");
    expect(writer).not.toContain("guidedFlowEnabled");
    expect(writer).not.toContain("scriptora-guide-pulse");
    expect(dashboard).not.toContain("activeToolGuideRoute");
    expect(dashboard).not.toContain("scriptora-guide-context");
    expect(settings).not.toContain("setGuidedFlowEnabled");
    expect(settings).not.toContain('label="Guided flow"');
  });

  it("keeps the guided book-creation interview mounted", () => {
    const wizard = readSource("src/components/one-flow/BookCreationOsWizard.tsx");

    expect(wizard).toContain("GuidedInterviewPanel");
    expect(wizard).toContain("Intervista guidata Scriptora");
    expect(wizard).toContain("Avvia intervista guidata");
    expect(wizard).toContain("initialIdea={idea}");
  });

  it("returns from the guided interview to visible structure steps after DNA confirmation", () => {
    const wizard = readSource("src/components/one-flow/BookCreationOsWizard.tsx");
    const confirmationHandler = wizard.slice(
      wizard.indexOf("const handleForgeDnaConfirm"),
      wizard.indexOf("const [blueprintPreview"),
    );

    expect(confirmationHandler).toContain("setUseGuidedInterview(false)");
    expect(confirmationHandler).toContain("setStep((current) => Math.max(2, current))");
  });
});
