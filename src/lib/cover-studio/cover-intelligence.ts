import { inferCoverArtDirection } from "./art-direction";
import type { CoverDirectionSuggestions, CoverIntelligenceInput } from "./types";

const BOOKTOK_GENRES = /romance|dark.?romance|romantasy|fantasy|memoir|ya|new.?adult/i;

function detectSubgenre(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/dark romance|dark-romance/.test(lower)) return "Dark Romance";
  if (/romantasy|fae|faerie/.test(lower)) return "Romantasy";
  if (/cozy|feel.?good/.test(lower)) return "Cozy Fiction";
  if (/literary|book club/.test(lower)) return "Premium Literary";
  if (/thriller|noir|crime/.test(lower)) return "Commercial Thriller";
  if (/self-help|business|authority/.test(lower)) return "Authority Nonfiction";
  if (/fantasy|epic/.test(lower)) return "Fantasy Cinematic";
  return undefined;
}

function bookTokIntensity(genreText: string): { level: "low" | "moderate" | "high"; note: string } {
  if (!BOOKTOK_GENRES.test(genreText)) {
    return {
      level: "low",
      note: "BookTok intensity is niche-specific — strongest for emotionally driven fiction.",
    };
  }
  const lower = genreText.toLowerCase();
  if (/dark romance|romantasy|enemies to lovers|spicy|fae/.test(lower)) {
    return {
      level: "high",
      note: "High BookTok potential — prioritize emotional contrast and thumbnail-readable title stack.",
    };
  }
  if (/romance|fantasy|memoir/.test(lower)) {
    return {
      level: "moderate",
      note: "Moderate BookTok potential — strengthen mood contrast and one clear emotional hook at thumbnail scale.",
    };
  }
  return { level: "low", note: "BookTok scoring applies lightly — focus on genre clarity first." };
}

function directionForMotif(motif: string): Omit<CoverDirectionSuggestions, "genreLabel" | "subgenreHint" | "bookTokIntensity" | "bookTokNote"> {
  switch (motif) {
    case "dark-romance":
      return {
        mood: ["obsessive", "dark luxury", "emotional tension"],
        typography: "High-contrast serif or elegant display — title must dominate at 120px thumbnail",
        composition: "Close emotional framing — figure silhouette or symbolic object, not busy collage",
        palette: ["black", "crimson", "gold"],
        positioning: "Signal danger + desire — readers should feel intensity before reading the title",
      };
    case "romantasy":
      return {
        mood: ["cinematic atmosphere", "fantasy glow", "emotional symbolism"],
        typography: "Ornate serif with luminous accent — avoid thin weights at small sizes",
        composition: "Central focal glow with title anchored in lower third",
        palette: ["midnight", "violet", "ember gold"],
        positioning: "Romance-fantasy crossover — magic cues without obscuring title legibility",
      };
    case "thriller":
      return {
        mood: ["tension", "shadow", "urgency"],
        typography: "Bold condensed sans or sharp serif — high contrast against dark field",
        composition: "Negative space with single tension point (light, figure, weapon hint)",
        palette: ["charcoal", "blood red", "cold white"],
        positioning: "Commercial thriller shelf — clarity beats artistry at thumbnail scale",
      };
    case "romance":
      return {
        mood: ["intimate", "warm", "desire-forward"],
        typography: "Soft serif or script accent on subtitle only — keep title readable",
        composition: "Emotional center-weighted — avoid clutter above title block",
        palette: ["dusk rose", "plum", "champagne"],
        positioning: "Romance signal must read instantly in KDP grid — contrast title from background",
      };
    case "business":
      return {
        mood: ["authority", "clarity", "trust"],
        typography: "Clean sans or classic serif — subtitle carries promise, title carries brand",
        composition: "Strong top-third title lockup — generous margins",
        palette: ["navy", "emerald", "gold accent"],
        positioning: "Nonfiction authority — title is the product promise",
      };
    case "fantasy":
      return {
        mood: ["epic scale", "mythic light", "wonder"],
        typography: "Display serif with controlled ornament — one hero word can scale larger",
        composition: "Vertical depth — sky or portal motif, title in stable lower band",
        palette: ["obsidian", "royal purple", "gold"],
        positioning: "Epic fantasy expectations — cinematic but title-first",
      };
    case "literary":
      return {
        mood: ["restraint", "prestige", "author-forward"],
        typography: "Refined serif — generous letterspacing on title",
        composition: "Minimal field — typography carries the brand",
        palette: ["ink", "ivory", "single accent"],
        positioning: "Literary prestige — less genre signaling, more tonal confidence",
      };
    default:
      return {
        mood: ["genre-aligned", "commercial clarity"],
        typography: "High-contrast title stack — test at thumbnail scale",
        composition: "Single focal hierarchy — title, subtitle, author",
        palette: ["template-led contrast"],
        positioning: "Align visual mood with back-cover promise",
      };
  }
}

export function buildCoverDirectionSuggestions(input: CoverIntelligenceInput): CoverDirectionSuggestions {
  const source = [
    input.projectGenre,
    input.genreBrief,
    input.title,
    input.subtitle,
    input.description,
    input.templateMood,
  ].filter(Boolean).join(" ");

  const art = inferCoverArtDirection(source);
  const base = directionForMotif(art.motif);
  const subgenre = detectSubgenre(source);
  const bookTok = bookTokIntensity(source);

  const genreLabel = subgenre || art.label;

  return {
    genreLabel,
    subgenreHint: subgenre,
    ...base,
    bookTokIntensity: bookTok.level,
    bookTokNote: bookTok.note,
  };
}
