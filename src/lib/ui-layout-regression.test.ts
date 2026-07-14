import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getUILanguage, setUILanguage, t } from "./i18n";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("ui layout regressions", () => {
  it("renders the dashboard language menu in a fixed top layer outside clipped headers", () => {
    const dashboard = readSource("src/pages/Dashboard.tsx");
    const css = readSource("src/index.css");

    expect(dashboard).toContain("createPortal");
    expect(dashboard).toContain("scriptora-language-menu-layer");
    expect(dashboard).toContain("document.body");
    expect(css).toContain(".scriptora-language-menu-layer");
    expect(css).toContain("2147483000");
  });

  it("keeps Writer Studio scrollable without reader panes trapping wheel or touch gestures", () => {
    const index = readSource("src/pages/Index.tsx");
    const editorPanel = readSource("src/components/EditorPanel.tsx");
    const css = readSource("src/index.css");

    expect(index).toContain("scriptora-scroll-page");
    expect(index).toContain("scriptora-writer-main-shell");
    expect(editorPanel).toContain("scriptora-scroll-panel");
    expect(editorPanel).toContain("scriptora-reader-scroll");
    expect(editorPanel).toContain("overscroll-y-auto");
    expect(css).toContain(".scriptora-writer-main-shell");
    expect(css).toContain(".scriptora-reader-scroll");
    expect(css).toContain("max-height: none !important");
    expect(css).toContain("overscroll-behavior-y: auto");
  });

  it("keeps the mobile fullscreen shell isolated from generic dialogs and the desktop return control", () => {
    const index = readSource("src/pages/Index.tsx");
    const storyProgress = readSource("src/mobile/StoryProgressOs.tsx");
    const viewportHook = readSource("src/hooks/useMobileForgeViewport.ts");
    const css = readSource("src/index.css");
    const viteConfig = readSource("vite.config.ts");

    expect(css).toContain(":not(.scriptora-mobile-fullscreen-shell)");
    expect(css).toContain("html.scriptora-mobile-scroll-locked");
    expect(css).toContain("body.scriptora-mobile-scroll-locked");
    expect(viewportHook).toContain('MOBILE_SCROLL_LOCK_CLASS = "scriptora-mobile-scroll-locked"');
    expect(viewportHook).toContain("let scrollLockCount = 0");
    expect(index).toContain("flex min-h-0 min-w-0 flex-1 flex-col");
    expect(index).toContain("lg:inline-flex");
    expect(storyProgress).toContain("top-[3.75rem]");

    expect(viteConfig).toContain('id.includes("node_modules")');
    expect(viteConfig).not.toContain('return "engine-generation"');
    expect(viteConfig).not.toContain('return "forge-guided-interview"');
    expect(viteConfig).not.toContain('return "page-writer"');
    expect(viteConfig).not.toContain('return "page-dashboard"');
  });

  it("localizes operational Writer labels through the UI language state", () => {
    const previous = getUILanguage();

    try {
      setUILanguage("en");
      expect(t("recommendation_none")).toBe("No rewrite needed");
      expect(t("editorial_cleanup")).toBe("Editorial cleanup");
      expect(t("tool_cleanup_desc")).toBe("Fix errors and repetitions without rewriting.");

      setUILanguage("it");
      expect(t("recommendation_none")).toBe("Nessuna riscrittura necessaria");
      expect(t("editorial_cleanup")).toBe("Pulizia editoriale");
      expect(t("tool_cleanup_desc")).toBe("Corregge errori e ripetizioni senza riscrivere.");
    } finally {
      setUILanguage(previous);
    }
  });
});
