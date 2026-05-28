import { GenreProfile, ClassifierOptions } from "./types";

// Lightweight, extensible classifier: keyword heuristics + structural signals.
export async function classifyText(
  text: string,
  opts: ClassifierOptions = {}
): Promise<GenreProfile> {
  const lower = (text || "").toLowerCase();

  // Fast heuristics for high-confidence categories
  if (/\bingredient(s)?\b|\bpreheat\b|\bbake\b|\bserves\b/.test(lower)) {
    return {
      macro: "nonfiction",
      micro: "cookbook",
      format: "recipe",
      narrativeDensity: 0.15,
      informationalDensity: 0.95,
      emotionalIntensity: 0.2,
      readerExpectations: ["instructional", "clear_steps", "measurements"],
    };
  }

  if (/\btravel\b|\bexplore\b|\bguide\b|\bgetting to\b|\bnearby\b|\btourist\b/.test(lower)) {
    return {
      macro: "nonfiction",
      micro: "travel",
      format: "guide",
      narrativeDensity: 0.35,
      informationalDensity: 0.8,
      emotionalIntensity: 0.4,
      readerExpectations: ["practical", "sensory", "recommendations"],
    };
  }

  if (/\bpoem\b|\brhyme\b|\bstanza\b|\bmetaphor\b/.test(lower)) {
    return {
      macro: "special",
      micro: "poetry",
      format: "poem",
      narrativeDensity: 0.2,
      informationalDensity: 0.05,
      emotionalIntensity: 0.95,
      readerExpectations: ["lyrical", "imagery", "compression"],
    };
  }

  // Simple fallback: detect instructional vs narrative vs reflective
  const isInstructional = /\bhow to\b|\bstep(s)?\b|\binstructions\b/.test(lower);
  const isReflective = /\bself-help\b|\bself help\b|\bmotivat(e|ion)\b|\bhabit\b/.test(lower);

  if (isInstructional) {
    return {
      macro: "nonfiction",
      micro: "technical",
      format: "manual",
      narrativeDensity: 0.2,
      informationalDensity: 0.9,
      emotionalIntensity: 0.15,
      readerExpectations: ["precise", "hierarchical", "clear_examples"],
    };
  }

  if (isReflective) {
    return {
      macro: "nonfiction",
      micro: "self_help",
      format: "chapter",
      narrativeDensity: 0.45,
      informationalDensity: 0.4,
      emotionalIntensity: 0.75,
      readerExpectations: ["motivational", "actionable", "personalization"],
    };
  }

  // Default to fiction-leaning profile but lightweight
  return {
    macro: "fiction",
    micro: "unknown",
    format: "chapter",
    narrativeDensity: 0.8,
    informationalDensity: 0.2,
    emotionalIntensity: 0.7,
    readerExpectations: ["story", "characters", "tension"],
  };
}

export default classifyText;
