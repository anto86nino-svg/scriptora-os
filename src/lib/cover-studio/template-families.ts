import type { CoverTemplateFamily } from "./types";

/** Curated template families mapped to built-in CoverGenerator template indices */
export const COVER_TEMPLATE_FAMILIES: CoverTemplateFamily[] = [
  {
    id: "kdp-bestseller",
    label: "KDP Bestseller",
    tagline: "Grid-tested commercial clarity",
    templateIndices: [2, 3, 4, 9],
    typographyGuidance: "Bold title stack — max 3 lines at thumbnail scale",
    layoutDirection: "Title lower-third, single focal background",
    emotionalPositioning: "Instant genre read within 0.5 seconds",
    visualHierarchy: "Title → subtitle promise → author",
    genreKeywords: ["bestseller", "kdp", "commercial", "fiction", "nonfiction"],
  },
  {
    id: "booktok-romance",
    label: "BookTok Romance",
    tagline: "Emotional hook for scroll-stopping grids",
    templateIndices: [4, 9, 0],
    typographyGuidance: "High-contrast serif — avoid thin weights",
    layoutDirection: "Mood-drenched background, title anchored center-low",
    emotionalPositioning: "Desire, tension, or yearning — one clear emotional beat",
    visualHierarchy: "Title dominance over decorative elements",
    genreKeywords: ["booktok", "romance", "love", "passion"],
  },
  {
    id: "premium-literary",
    label: "Premium Literary",
    tagline: "Prestige minimalism",
    templateIndices: [0, 1, 5],
    typographyGuidance: "Refined serif, generous spacing",
    layoutDirection: "Typography-led — restrained imagery",
    emotionalPositioning: "Quiet confidence, author-as-brand",
    visualHierarchy: "Title + author — subtitle optional",
    genreKeywords: ["literary", "book club", "prestige", "narrativa"],
  },
  {
    id: "dark-romance",
    label: "Dark Romance",
    tagline: "Obsessive luxury positioning",
    templateIndices: [9, 4, 2],
    typographyGuidance: "High-contrast serif or elegant display",
    layoutDirection: "Close framing — symbolic object or silhouette",
    emotionalPositioning: "Danger + desire — crimson/gold/black palette bias",
    visualHierarchy: "Title must survive crimson-on-black thumbnails",
    genreKeywords: ["dark romance", "obsession", "mafia", "morally gray"],
  },
  {
    id: "thriller-commercial",
    label: "Thriller Commercial",
    tagline: "Shelf urgency",
    templateIndices: [2, 7, 9],
    typographyGuidance: "Bold condensed or sharp serif",
    layoutDirection: "Negative space + single tension point",
    emotionalPositioning: "Urgency before beauty",
    visualHierarchy: "Title readable at smallest KDP preview",
    genreKeywords: ["thriller", "noir", "crime", "suspense", "mystery"],
  },
  {
    id: "fantasy-cinematic",
    label: "Fantasy Cinematic",
    tagline: "Epic scale, title-first",
    templateIndices: [9, 7, 0],
    typographyGuidance: "Display serif — one hero word can scale up",
    layoutDirection: "Vertical depth, title in stable lower band",
    emotionalPositioning: "Wonder + stakes — avoid busy collage",
    visualHierarchy: "Title locks before ornamental glow",
    genreKeywords: ["fantasy", "romantasy", "epic", "magic", "fae"],
  },
  {
    id: "selfhelp-authority",
    label: "Self-help Authority",
    tagline: "Trust-forward nonfiction",
    templateIndices: [3, 6, 1],
    typographyGuidance: "Clean sans or classic serif — subtitle carries promise",
    layoutDirection: "Top-third title lockup, generous margins",
    emotionalPositioning: "Clarity, authority, transformation",
    visualHierarchy: "Title = product promise",
    genreKeywords: ["self-help", "business", "mindset", "productivity", "authority"],
  },
  {
    id: "cozy-fiction",
    label: "Cozy Fiction",
    tagline: "Warm escapist comfort",
    templateIndices: [1, 5, 4],
    typographyGuidance: "Soft serif — approachable, not corporate",
    layoutDirection: "Warm palette field, centered title",
    emotionalPositioning: "Safety, warmth, gentle intrigue",
    visualHierarchy: "Inviting title stack over busy texture",
    genreKeywords: ["cozy", "feel-good", "warm", "comfort", "small town"],
  },
];

export function matchTemplateFamily(source: string): CoverTemplateFamily | null {
  const lower = source.toLowerCase();
  let best: CoverTemplateFamily | null = null;
  let bestScore = 0;
  for (const family of COVER_TEMPLATE_FAMILIES) {
    const score = family.genreKeywords.reduce((t, kw) => t + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = family;
    }
  }
  return bestScore > 0 ? best : null;
}

export function recommendedTemplateIndex(family: CoverTemplateFamily): number {
  return family.templateIndices[0] ?? 0;
}
