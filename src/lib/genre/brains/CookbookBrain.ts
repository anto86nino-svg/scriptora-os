import BaseBrain, { StructuralPlan } from "./BaseBrain";
import { GenreProfile } from "../types";

export class CookbookBrain extends BaseBrain {
  constructor(profile: GenreProfile) {
    super(profile);
  }

  async asyncPlan(seedText?: string): Promise<StructuralPlan> {
    return {
      chapters: [
        { title: "Introduction & Tools", purpose: "Tools, pantry, techniques" },
        { title: "Recipes", purpose: "Organized recipe chapters" },
        { title: "Menus & Pairings", purpose: "Menu suggestions and tips" },
        { title: "Index & Measurements", purpose: "Conversions, index" },
      ],
      meta: { tone: "instructional-sensory", recipeFormat: "ingredients-steps-notes" },
    };
  }

  async writeSection(index: number, ctx?: any): Promise<string> {
    const chapter = (await this.asyncPlan())["chapters"]![index];
    return `Section: ${chapter?.title || "Untitled"}\n\n(Generate precise recipes, ingredient lists, and step-by-step instructions here.)`;
  }
}

export default CookbookBrain;
