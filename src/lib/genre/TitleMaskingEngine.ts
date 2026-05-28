import { StructuralBeat, WorldContext } from "./StructuralBeat";
import { GenreProfile } from "./types";

// Converts hidden structural beats into reader-facing, immersive chapter titles
export class TitleMaskingEngine {
  private genreProfile: GenreProfile;

  constructor(genreProfile: GenreProfile) {
    this.genreProfile = genreProfile;
  }

  async maskBeatToTitle(
    beatType: StructuralBeat,
    worldContext: WorldContext,
    index?: number
  ): Promise<string> {
    // Never expose raw structural beat names
    const blacklistedTitles = [
      "The Awakening",
      "The Fall",
      "The Choice",
      "Desire",
      "The Truth",
      "Threshold",
      "The Beginning",
      "The Crack",
      "The Revelation",
      "The First Crack",
      "The Trigger",
      "The Threshold",
      "Escalation",
      "The Collapse",
    ];

    // Generate a title using world context, emotion, and genre
    let title = await this.generateFromWorldContext(beatType, worldContext);

    // Fallback if masking produces blacklisted title
    if (blacklistedTitles.includes(title)) {
      title = await this.generateAlternativeTitle(beatType, worldContext);
    }

    return title;
  }

  private async generateFromWorldContext(
    beatType: StructuralBeat,
    worldContext: WorldContext
  ): Promise<string> {
    const { locations, objects, motifs, emotions, environmentalDetails } =
      worldContext;

    // Genre-specific title generation
    switch (this.genreProfile.micro) {
      case "travel":
        return this.generateTravelTitle(locations, environmentalDetails);
      case "cookbook":
        return this.generateCookbookTitle(objects, motifs);
      case "poetry":
        return this.generatePoetryTitle(motifs, emotions);
      default:
        return this.generateGenericTitle(
          beatType,
          locations,
          objects,
          emotions
        );
    }
  }

  private generateTravelTitle(
    locations?: string[],
    envDetails?: string[]
  ): string {
    if (!locations || locations.length === 0) {
      return "Somewhere New";
    }
    const loc = locations[Math.floor(Math.random() * locations.length)];
    if (envDetails && envDetails.length > 0) {
      const env = envDetails[Math.floor(Math.random() * envDetails.length)];
      return `${loc} at ${env}`;
    }
    return loc;
  }

  private generateCookbookTitle(
    objects?: string[],
    motifs?: string[]
  ): string {
    if (objects && objects.length > 0) {
      const obj = objects[Math.floor(Math.random() * objects.length)];
      return `The Art of ${obj}`;
    }
    if (motifs && motifs.length > 0) {
      const motif = motifs[Math.floor(Math.random() * motifs.length)];
      return `${motif} Flavors`;
    }
    return "Culinary Traditions";
  }

  private generatePoetryTitle(motifs?: string[], emotions?: string[]): string {
    if (motifs && motifs.length > 0) {
      return motifs[Math.floor(Math.random() * motifs.length)];
    }
    if (emotions && emotions.length > 0) {
      return emotions[Math.floor(Math.random() * emotions.length)];
    }
    return "Untitled";
  }

  private generateGenericTitle(
    beatType: StructuralBeat,
    locations?: string[],
    objects?: string[],
    emotions?: string[]
  ): string {
    // Draw from available world context
    const sources = [
      ...(locations || []),
      ...(objects || []),
      ...(emotions || []),
    ];

    if (sources.length > 0) {
      return sources[Math.floor(Math.random() * sources.length)];
    }

    // Last resort: beat-neutral descriptors
    const neutral = [
      "A New Day",
      "Turning Point",
      "The Crossroads",
      "Convergence",
      "Unraveling",
      "Reckoning",
      "Emergence",
    ];
    return neutral[Math.floor(Math.random() * neutral.length)];
  }

  private async generateAlternativeTitle(
    beatType: StructuralBeat,
    worldContext: WorldContext
  ): Promise<string> {
    const { locations, objects, characters } = worldContext;

    // Create combinations from diverse sources
    if (locations && objects && locations.length > 0 && objects.length > 0) {
      const loc = locations[0];
      const obj = objects[0];
      return `${obj} in ${loc}`;
    }

    if (characters && characters.length > 0) {
      const char = characters[0];
      return `What ${char} Knew`;
    }

    return "The Turning";
  }
}

export default TitleMaskingEngine;
