import type { BackMatter, BookConfig, BookMatterOptions, FrontMatter, GenerationPhase } from "@/types/book";
import { DEFAULT_MATTER_OPTIONS } from "@/lib/book-config-studio/defaults";

export function resolveMatterOptions(config: BookConfig): BookMatterOptions {
  return { ...DEFAULT_MATTER_OPTIONS, ...(config.matterOptions || {}) };
}

export function isFrontMatterEnabled(config: BookConfig): boolean {
  return resolveMatterOptions(config).frontMatterEnabled;
}

export function isBackMatterEnabled(config: BookConfig): boolean {
  return resolveMatterOptions(config).backMatterEnabled;
}

export function initialPhaseAfterBlueprint(config: BookConfig): GenerationPhase {
  return isFrontMatterEnabled(config) ? "front-matter" : "chapters";
}

export function phaseAfterAllChapters(config: BookConfig): GenerationPhase {
  return isBackMatterEnabled(config) ? "back-matter" : "complete";
}

export function filterFrontMatterTemplateSections(sections: string[], opts: BookMatterOptions): string[] {
  return sections.filter((section) => {
    const low = section.toLowerCase();
    if (!opts.acknowledgmentsEnabled && /dedica|dedication|ringraziament|acknowledgment|prefazione personale/i.test(low)) {
      return false;
    }
    return true;
  });
}

export function filterBackMatterTemplateSections(sections: string[], opts: BookMatterOptions): string[] {
  return sections.filter((section) => {
    const low = section.toLowerCase();
    if (!opts.ctaEnabled && /call to action|prossimo passo|cta|azione|next step/i.test(low)) return false;
    if (!opts.bibliographyEnabled && /bibliograf|references|risorse|letture consigliate|glossary|glossario/i.test(low)) {
      return false;
    }
    if (!opts.acknowledgmentsEnabled && /ringraziament|acknowledgment/i.test(low)) return false;
    return true;
  });
}

export function applyMatterOptionsToFrontMatter(fm: FrontMatter, opts: BookMatterOptions): FrontMatter {
  return {
    ...fm,
    dedication: opts.acknowledgmentsEnabled ? fm.dedication : "",
  };
}

export function applyMatterOptionsToBackMatter(bm: BackMatter, opts: BookMatterOptions): BackMatter {
  return {
    ...bm,
    callToAction: opts.ctaEnabled ? bm.callToAction : "",
    otherBooks: opts.bibliographyEnabled ? bm.otherBooks : "",
  };
}

export function matterOptionsPromptNote(config: BookConfig): string {
  const opts = resolveMatterOptions(config);
  const notes: string[] = [];
  if (!opts.acknowledgmentsEnabled) notes.push("Skip dedication/acknowledgments sections.");
  if (!opts.ctaEnabled) notes.push("Skip call-to-action sections.");
  if (!opts.bibliographyEnabled) notes.push("Skip bibliography/references sections.");
  if (!notes.length) return "";
  return `MATTER OPTIONS: ${notes.join(" ")}`;
}
