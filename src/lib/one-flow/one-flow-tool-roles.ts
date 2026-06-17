/** UX copy — tool roles in One Flow (optimization, not parallel creation). */
export const ONE_FLOW_TOOL_ROLES = {
  forge: {
    it: "Unico ingresso per creare un libro",
    en: "Single entry point to create a book",
  },
  titleIntelligence: {
    it: "Ottimizza titolo e sottotitolo",
    en: "Optimize title and subtitle",
  },
  bestsellerRadar: {
    it: "Ricerca mercato e nicchie",
    en: "Market and niche research",
  },
  keywordGold: {
    it: "Ottimizza keyword Amazon",
    en: "Optimize Amazon keywords",
  },
  kdpLaunch: {
    it: "Pubblicazione e packaging KDP",
    en: "KDP publishing and packaging",
  },
  marketIntelligence: {
    it: "Strumento decisionale mercato",
    en: "Market decision support",
  },
  ideaPreview: {
    it: "Anteprima idea → Book Forge",
    en: "Idea preview → Book Forge",
  },
} as const;

export const ONE_FLOW_PATH = [
  "NUOVO LIBRO",
  "FORGE",
  "BLUEPRINT THEATER",
  "WRITER",
  "PACKAGING CENTER",
  "PUBBLICAZIONE",
] as const;
