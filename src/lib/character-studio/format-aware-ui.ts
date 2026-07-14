import { resolveUniversalBookStudio, type UniversalBookStudioId } from "@/lib/book-intelligence/universal-book-studios";
import { normalizeGenre } from "@/lib/book-config-studio/defaults";

export type CharacterStudioFormatMode = "narrative" | "poetry" | "manual" | "workbook" | "study";

export interface CharacterStudioFormatUiProfile {
  studioId: UniversalBookStudioId;
  mode: CharacterStudioFormatMode;
  studioTitle: string;
  studioSubtitle: string;
  generatorName: string;
  blueprintName: string;
  qualityGateName: string;
  exportProfile: string;
  visibleFields: string[];
  forbiddenFields: string[];
  showNarrativeFields: boolean;
  showCharacterFields: boolean;
  showPoetryFields: boolean;
  showManualFields: boolean;
  showWorkbookFields: boolean;
  showStudyFields: boolean;
  countLabel: string;
  sectionCountLabel?: string;
  ideaLabel: string;
  ideaPlaceholder: string;
  step2Title: string;
  step4Title: string;
  step4Description: string;
  promiseLabel: string;
  settingLabel: string;
  subjectLabel: string;
  methodLabel: string;
  formatNotice: string;
  handoffCopy: string;
}

export function resolveCharacterStudioFormatUiProfile(input: {
  bookFormat?: string;
  genre?: string;
  subcategory?: string;
}): CharacterStudioFormatUiProfile {
  const { studio } = resolveUniversalBookStudio({
    config: {
      bookFormat: input.bookFormat,
      genre: input.genre
        ? normalizeGenre(input.genre, `${input.subcategory || ""} ${input.bookFormat || ""}`)
        : undefined,
      subcategory: input.subcategory,
    },
    explicitBookFormat: input.bookFormat,
  });
  const mode = studio.fieldMode;

  return {
    studioId: studio.id,
    mode,
    studioTitle: studio.visibleName,
    studioSubtitle: studio.objective,
    generatorName: studio.generatorName,
    blueprintName: studio.blueprintName,
    qualityGateName: studio.qualityGateName,
    exportProfile: studio.exportProfile,
    visibleFields: studio.visibleFields,
    forbiddenFields: studio.forbiddenFields,
    showNarrativeFields: mode === "narrative",
    showCharacterFields: mode === "narrative",
    showPoetryFields: mode === "poetry",
    showManualFields: mode === "manual" || mode === "workbook" || mode === "study",
    showWorkbookFields: mode === "workbook",
    showStudyFields: mode === "study",
    ...studio.ui,
  };
}
