import { WorldContext } from "./StructuralBeat";

// Analyzes narrative text to extract world context for title generation
export class WorldContextAnalyzer {
  async analyzeChapter(chapterText: string): Promise<WorldContext> {
    return {
      locations: this.extractLocations(chapterText),
      objects: this.extractObjects(chapterText),
      motifs: this.extractMotifs(chapterText),
      emotions: this.extractEmotions(chapterText),
      characters: this.extractCharacters(chapterText),
      environmentalDetails: this.extractEnvironmentalDetails(chapterText),
      culturalReferences: this.extractCulturalReferences(chapterText),
      mysteries: this.extractMysteries(chapterText),
    };
  }

  private extractLocations(text: string): string[] {
    // Simple heuristic: look for capitalized sequences, common location patterns
    const patterns = [
      /\b([A-Z][a-z]+\s+(?:Street|Avenue|Park|Square|River|Mountain|City|Island|Tower|Cathedral|Museum))\b/g,
      /\b(Paris|London|Rome|Tokyo|New York|Venice|Barcelona|Athens)\b/g,
    ];

    const locations: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(...matches);
      }
    }

    return [...new Set(locations)].slice(0, 5); // Unique, limited
  }

  private extractObjects(text: string): string[] {
    // Look for concrete noun patterns
    const patterns = [/\b(book|letter|photograph|key|door|window|mirror|tea|wine|rose|clock|candle)\b/gi];

    const objects: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        objects.push(...matches.map((m) => m.toLowerCase()));
      }
    }

    return [...new Set(objects)].slice(0, 5);
  }

  private extractMotifs(text: string): string[] {
    // Recurring themes/symbols
    const keywords = [
      "water",
      "light",
      "shadow",
      "silence",
      "betrayal",
      "love",
      "loss",
      "truth",
      "memory",
      "dreams",
    ];

    const found: string[] = [];
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword)) {
        found.push(keyword);
      }
    }

    return found.slice(0, 3);
  }

  private extractEmotions(text: string): string[] {
    // Emotional state indicators
    const emotions = [
      "joy",
      "sorrow",
      "fear",
      "anger",
      "wonder",
      "longing",
      "regret",
      "hope",
      "despair",
      "tenderness",
    ];

    const found: string[] = [];
    for (const emotion of emotions) {
      if (text.toLowerCase().includes(emotion)) {
        found.push(emotion);
      }
    }

    return found.slice(0, 3);
  }

  private extractCharacters(text: string): string[] {
    // Simple: look for capitalized single/double words not at sentence start
    const regex = /(?:^|\.\s+|!\s+|\?\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const matches = text.match(regex);

    if (!matches) return [];

    return matches
      .map((m) => m.replace(/^[\.\!\?\s]+/, "").trim())
      .filter((m) => m.length > 0)
      .slice(0, 5);
  }

  private extractEnvironmentalDetails(text: string): string[] {
    // Sensory/atmospheric details
    const patterns = [
      /\b(dawn|dusk|midnight|twilight|moonlight|sunlight|rain|snow|fog|thunder|breeze|wind)\b/gi,
      /\b(warm|cold|bright|dark|quiet|loud|sweet|bitter|rough|smooth)\b/gi,
    ];

    const details: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        details.push(...matches.map((m) => m.toLowerCase()));
      }
    }

    return [...new Set(details)].slice(0, 5);
  }

  private extractCulturalReferences(text: string): string[] {
    // References to art, literature, music, history
    const patterns = [/\b(Shakespeare|Dante|Mozart|Picasso|Proust|mythology|legend|folklore)\b/gi];

    const refs: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        refs.push(...matches.map((m) => m.toLowerCase()));
      }
    }

    return [...new Set(refs)].slice(0, 3);
  }

  private extractMysteries(text: string): string[] {
    // Unanswered questions or intriguing phrases
    const patterns = [
      /\b(who|what|why|where|when|how)\s+(?:\w+\s+){1,3}[^\.!?]+[?!]/gi,
    ];

    const mysteries: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        mysteries.push(...matches.slice(0, 2));
      }
    }

    return mysteries.slice(0, 3);
  }
}

export default WorldContextAnalyzer;
