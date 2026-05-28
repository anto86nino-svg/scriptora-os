import { GenreProfile } from "./types";
import { StructuralBeat, WorldContext } from "./StructuralBeat";

// Genre-specific chapter title generation strategies
export class ChapterTitleGenerator {
  private genreProfile: GenreProfile;

  constructor(genreProfile: GenreProfile) {
    this.genreProfile = genreProfile;
  }

  async generateTitle(
    beatType: StructuralBeat,
    worldContext: WorldContext,
    priorTitles?: string[]
  ): Promise<string> {
    const strategy = this.selectStrategy();
    let title = await strategy.call(this, beatType, worldContext);

    // Avoid repetition with prior titles
    if (priorTitles && priorTitles.includes(title)) {
      title = await this.diversifyTitle(title, beatType, worldContext);
    }

    return title;
  }

  private selectStrategy() {
    switch (this.genreProfile.micro) {
      case "travel":
        return this.thrillerTitles; // cryptic, tension-driven
      case "cookbook":
        return this.romanceTitles; // emotionally charged
      case "poetry":
        return this.poetryTitles; // lyrical, abstract
      case "children":
        return this.childrenTitles; // wonder-oriented
      case "technical":
        return this.technicalTitles; // clarity-first
      default:
        return this.genericTitles; // balanced
    }
  }

  // Thriller: cryptic, suggestive
  private async thrillerTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const patterns = [
      (obj: string) => `${obj}`,
      (obj: string) => `The Weight of ${obj}`,
      (loc: string) => `Before ${loc}`,
      (loc: string) => `After ${loc}`,
      (emotion: string) => `${emotion}`,
      (obj: string, loc: string) => `${obj} Over ${loc}`,
    ];

    const choice = ctx.objects?.[0] || ctx.locations?.[0] || "Reckoning";
    return choice;
  }

  // Romance: emotionally charged, intimate
  private async romanceTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const patterns = [
      (emotion: string) => `${emotion}`,
      (char: string, emotion: string) => `${char}'s ${emotion}`,
      (obj: string) => `Beneath the ${obj}`,
      (moment: string) => `In this ${moment}`,
    ];

    const emotion = ctx.emotions?.[0] || "Longing";
    return emotion;
  }

  // Poetry: lyrical, abstract, minimalist
  private async poetryTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const shortForms = [
      ctx.motifs?.[0] || "Silence",
      ctx.emotions?.[0] || "Yearning",
      ctx.objects?.[0] || "Mirror",
      ctx.environmentalDetails?.[0] || "Dawn",
    ];

    return shortForms[Math.floor(Math.random() * shortForms.length)];
  }

  // Children: wonder-oriented, playful, memorable
  private async childrenTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const playful = [
      (obj: string) => `${obj} and the Quest`,
      (loc: string) => `Beyond ${loc}`,
      (char: string) => `${char}'s Adventure`,
      (motif: string) => `When ${motif} Awakened`,
    ];

    const char = ctx.characters?.[0] || ctx.motifs?.[0] || "The Hero";
    return `${char}'s Journey`;
  }

  // Technical: clarity-first, hierarchical
  private async technicalTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const clear = [
      (obj: string) => `Understanding ${obj}`,
      (obj: string) => `How ${obj} Works`,
      (process: string) => `${process} Step by Step`,
    ];

    const obj = ctx.objects?.[0] || "Fundamentals";
    return `Understanding ${obj}`;
  }

  // Generic: balanced, diverse
  private async genericTitles(
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    const all = [
      ...(ctx.locations || []),
      ...(ctx.objects || []),
      ...(ctx.emotions || []),
      ...(ctx.motifs || []),
    ];

    if (all.length > 0) {
      return all[Math.floor(Math.random() * all.length)];
    }

    return "Chapter " + Math.floor(Math.random() * 100);
  }

  private async diversifyTitle(
    title: string,
    beatType: StructuralBeat,
    ctx: WorldContext
  ): Promise<string> {
    // Generate variation using different pattern
    const alt = [
      `${title} Revisited`,
      `Another ${title}`,
      `Return to ${title}`,
      `The ${title} Question`,
    ];

    return alt[Math.floor(Math.random() * alt.length)];
  }
}

export default ChapterTitleGenerator;
