import { GenreProfile } from "../types";

export type StructuralPlan = {
  chapters?: Array<{ title?: string; lengthEstimate?: number; purpose?: string }>;
  meta?: Record<string, any>;
};

export abstract class BaseBrain {
  profile: GenreProfile;
  constructor(profile: GenreProfile) {
    this.profile = profile;
  }

  // Produce a high-level structural plan for a manuscript or section
  abstract asyncPlan(seedText?: string): Promise<StructuralPlan>;

  // Render a single section/chapter given context
  abstract writeSection(index: number, ctx?: any): Promise<string>;

  // Optional: return formatting hints (lists, recipes, code blocks)
  getFormattingHints(): Record<string, any> {
    return {};
  }
}

export default BaseBrain;
