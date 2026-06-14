import { buildCoverBrief, isItalianLanguage } from "./cover-brief";
import { assessCoverReadiness } from "./cover-readiness";
import { harmonizeCoverScore, scoreCover } from "./cover-scoring";
import { buildVariants, recommendTemplate } from "./cover-templates";
import { buildHonestyBadge } from "./cover-quality";
import type { CoverBriefInput, CoverDataMode, CoverStudioPackage } from "./cover-types";

export function buildCoverStudioPackage(
  input: CoverBriefInput,
  opts?: {
    templateId?: string;
    dataMode?: CoverDataMode;
    hasSavedCover?: boolean;
    darkTemplate?: boolean;
    hasUpload?: boolean;
  },
): CoverStudioPackage {
  const brief = buildCoverBrief(input);
  const recommended = recommendTemplate(brief.genreFamily);
  const templateId = opts?.templateId || recommended.id;
  const dataMode = opts?.dataMode || "template";
  const honesty = buildHonestyBadge(dataMode, brief.language);

  const score = harmonizeCoverScore(
    scoreCover(brief, {
      templateId,
      titleLength: brief.title.length,
      subtitleLength: brief.subtitle.length,
      hasUpload: opts?.hasUpload,
      darkTemplate: opts?.darkTemplate,
    }),
  );

  const readiness = assessCoverReadiness(brief, score, {
    hasSavedCover: opts?.hasSavedCover,
    exportFormat: "epub",
  });

  const italian = isItalianLanguage(brief.language);
  const variants = buildVariants(brief.genreFamily, italian);

  return {
    dataMode,
    honestyLabel: honesty.label,
    honestyDetail: honesty.detail,
    brief,
    recommendedTemplateId: recommended.id,
    variants,
    score,
    readiness,
  };
}

export type { CoverBriefInput, CoverStudioPackage, CoverScore, CoverReadiness, CoverVariant } from "./cover-types";
export { inferGenreFamily, recommendTemplate, getTemplateById, COVER_TEMPLATES } from "./cover-templates";
export { buildCoverBrief } from "./cover-brief";
