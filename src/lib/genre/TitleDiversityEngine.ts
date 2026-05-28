// Anti-repetition engine for chapter titles
// Ensures syntactic, emotional, and tonal diversity
export class TitleDiversityEngine {
  private titleHistory: string[] = [];
  private syntacticPatterns: Map<string, number> = new Map();
  private emotionalTones: Map<string, number> = new Map();

  addTitle(title: string, emotionalTone?: string): void {
    this.titleHistory.push(title);

    const pattern = this.extractSyntacticPattern(title);
    this.syntacticPatterns.set(
      pattern,
      (this.syntacticPatterns.get(pattern) || 0) + 1
    );

    if (emotionalTone) {
      this.emotionalTones.set(
        emotionalTone,
        (this.emotionalTones.get(emotionalTone) || 0) + 1
      );
    }
  }

  // Check if a candidate title would create harmful repetition
  shouldRejectTitle(candidate: string, emotionalTone?: string): boolean {
    // Reject if exact match
    if (this.titleHistory.includes(candidate)) {
      return true;
    }

    const pattern = this.extractSyntacticPattern(candidate);
    const patternCount = this.syntacticPatterns.get(pattern) || 0;

    // Reject if same pattern has appeared 2+ times
    if (patternCount >= 2) {
      return true;
    }

    // Reject if emotional tone appears too frequently
    if (emotionalTone && this.emotionalTones.get(emotionalTone) || 0 >= 3) {
      return true;
    }

    return false;
  }

  // Extract syntactic pattern (e.g., "The X", "X and Y", "X of Y")
  private extractSyntacticPattern(title: string): string {
    const lower = title.toLowerCase();

    if (/^the\s+\w+/.test(lower)) return "the_noun";
    if (/^\w+\s+and\s+\w+/.test(lower)) return "noun_and_noun";
    if (/^\w+\s+of\s+\w+/.test(lower)) return "noun_of_noun";
    if (/^\w+\s+over\s+\w+/.test(lower)) return "noun_over_noun";
    if (/^(when|as|after|before)\s+/.test(lower)) return "temporal";
    if (/^\w+['']s\s+\w+/.test(lower)) return "possessive";

    return "other";
  }

  // Get diversity metrics for author insight
  getDiversityReport(): {
    totalTitles: number;
    uniquePatterns: number;
    mostCommonPattern: string | null;
    emotionalToneDiversity: number;
  } {
    return {
      totalTitles: this.titleHistory.length,
      uniquePatterns: this.syntacticPatterns.size,
      mostCommonPattern: Array.from(this.syntacticPatterns.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || null,
      emotionalToneDiversity: this.emotionalTones.size,
    };
  }

  reset(): void {
    this.titleHistory = [];
    this.syntacticPatterns.clear();
    this.emotionalTones.clear();
  }
}

export default TitleDiversityEngine;
