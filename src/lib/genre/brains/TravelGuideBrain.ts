import BaseBrain, { StructuralPlan } from "./BaseBrain";
import { GenreProfile } from "../types";

export class TravelGuideBrain extends BaseBrain {
  constructor(profile: GenreProfile) {
    super(profile);
  }

  async asyncPlan(seedText?: string): Promise<StructuralPlan> {
    // Example: create chapters per destination, practical tips, maps, and itineraries
    return {
      chapters: [
        { title: "Introduction & Orientation", purpose: "Set expectations, best seasons" },
        { title: "Top Sights & Routes", purpose: "Must-see, routes, timings" },
        { title: "Local Food & Culture", purpose: "Eating, customs, tips" },
        { title: "Practical Info", purpose: "Transport, accommodation, safety" },
      ],
      meta: { tone: "practical-sensory", recommendationDensity: 0.6 },
    };
  }

  async writeSection(index: number, ctx?: any): Promise<string> {
    // Minimal placeholder — real implementation will use model with constraints
    const chapter = (await this.asyncPlan())["chapters"]![index];
    return `Section: ${chapter?.title || "Untitled"}\n\n(Generate practical, sensory guide content here.)`;
  }
}

export default TravelGuideBrain;
