import type { AtmosphereProfileId } from "./types";

export type ThemeCopy = {
  bookObjectLabel: string;
  activeBookLabel: string;
  journeyLabel: string;
  emptyBookHint: string;
  osTitle: string;
  osDescription: string;
  groups: Record<string, { title: string; desc: string }>;
  modules: Record<string, { title: string; desc?: string; tag?: string }>;
};

const BASE_COPY: ThemeCopy = {
  bookObjectLabel: "Manuscript Core",
  activeBookLabel: "Libro attivo",
  journeyLabel: "Percorso autore",
  emptyBookHint: "Scriptora OS mette il libro al centro: idea, scrittura, cover, export e lancio KDP.",
  osTitle: "Strumenti dietro il libro",
  osDescription: "Apri solo la cartella che ti serve. Il manoscritto resta il centro.",
  groups: {
    writer: { title: "Writer OS", desc: "Scrittura, rewrite, personaggi, voce e note attorno al libro." },
    bestseller: { title: "Market OS", desc: "Mercato, titoli, keyword e segnali commerciali dietro il progetto." },
    publishing: { title: "Publish OS", desc: "Cover, export e scaffale finale quando il manoscritto e pronto." },
    system: { title: "System OS", desc: "Identita autore, ambiente, libreria e controlli di Scriptora." },
  },
  modules: {},
};

const THEME_COPY: Partial<Record<AtmosphereProfileId, Partial<ThemeCopy>>> = {
  "horror-gothic": {
    bookObjectLabel: "Cursed Manuscript",
    activeBookLabel: "Manoscritto maledetto",
    journeyLabel: "Camera del manoscritto",
    emptyBookHint: "Apri un nuovo fascicolo narrativo. Scriptora trasformera idea, indizi, cover e lancio in un rituale controllato.",
    osTitle: "Stanze dell'indagine narrativa",
    osDescription: "Ogni strumento e una camera del manoscritto. Apri solo il fascicolo che serve.",
    groups: {
      writer: { title: "Camera della Scrittura", desc: "Scrittura, riscrittura, anime e voci nascoste nel manoscritto." },
      bestseller: { title: "Oracolo del Mercato", desc: "Segnali commerciali, titoli e rituali di dominazione KDP." },
      publishing: { title: "Sigillo Finale", desc: "Cover, export e archivio dei manoscritti pronti a uscire." },
      system: { title: "Archivio Maledetto", desc: "Identita, ambiente, libreria e controlli del laboratorio oscuro." },
    },
    modules: {
      writer_studio: { title: "Camera della Scrittura", tag: "SCRITTURA" },
      story_architect: { title: "Fascicolo d'Origine", tag: "ORIGINE" },
      manuscript_lab: { title: "Autopsia del Manoscritto", tag: "AUTOPSIA" },
      rewrite_studio: { title: "Riscrittura d'Ombra", tag: "RISCRITTURA" },
      character_studio: { title: "Anime della Storia", tag: "CAST" },
      voice_studio: { title: "Voce dalle Ombre", tag: "ASCOLTO" },
      notes: { title: "Taccuino del Caso", tag: "INDIZI" },
      bestseller_engine: { title: "Rituale di Dominazione", tag: "RITUALE" },
      kdp_launch: { title: "Oracolo del Mercato", tag: "KDP" },
      title_intelligence: { title: "Nomi Proibiti", tag: "TITOLI" },
      bestseller_radar: { title: "Segnali nel Buio", tag: "RADAR" },
      keyword_gold: { title: "Parole Sepolte", tag: "KEYWORD" },
      cover_studio: { title: "Volto del Manoscritto", tag: "COVER" },
      export_studio: { title: "Sigillo Finale", tag: "EXPORT" },
      completed_shelf: { title: "Archivio Sigillato", tag: "ARCHIVIO" },
      author_identity: { title: "Identita Occulta", tag: "AUTORE" },
      atmosphere: { title: "Camera Atmosferica", tag: "AMBIENTE" },
      drafts: { title: "Archivio Maledetto", tag: "DRAFT" },
      settings: { title: "Chiavi del Sistema", tag: "CONTROLLO" },
    },
  },
  "fantasy-realm": {
    bookObjectLabel: "Royal Manuscript",
    activeBookLabel: "Libro del Regno",
    journeyLabel: "Sala del destino",
    groups: {
      writer: { title: "Chamber of Creation", desc: "Scrittura, rewrite, personaggi e voce nella sala del Regno." },
      bestseller: { title: "Kingdom Market", desc: "Mercato, titoli e segnali commerciali come mappe del reame." },
      publishing: { title: "Royal Publishing", desc: "Cover, export e biblioteca reale dei libri completati." },
      system: { title: "Royal Library", desc: "Identita, atmosfera, libreria e controllo del reame creativo." },
    },
    modules: {
      writer_studio: { title: "Chamber of Creation" },
      manuscript_lab: { title: "Destiny Oracle" },
      character_studio: { title: "World Builder" },
      kdp_launch: { title: "Kingdom Market" },
      completed_shelf: { title: "Royal Library" },
    },
  },
  "dark-luxury": {
    bookObjectLabel: "Velvet Manuscript",
    activeBookLabel: "Libro in velluto",
    journeyLabel: "Studio noir",
    groups: {
      writer: { title: "Velvet Writing Room", desc: "Scrittura e riscrittura in un ambiente intimo, elegante, notturno." },
      bestseller: { title: "Noir Market Suite", desc: "Titoli, segnali e posizionamento con lusso scuro." },
      publishing: { title: "Gold Seal Studio", desc: "Cover, export e finitura editoriale premium." },
      system: { title: "Private Archive", desc: "Identita autore, atmosfera e controllo dello studio." },
    },
    modules: {
      writer_studio: { title: "Velvet Writing Room" },
      rewrite_studio: { title: "Noir Rewrite" },
      cover_studio: { title: "Gold Cover Studio" },
      export_studio: { title: "Gold Seal Export" },
    },
  },
  "space-scifi": {
    bookObjectLabel: "Narrative Core",
    activeBookLabel: "Manoscritto orbitale",
    journeyLabel: "Command deck",
    groups: {
      writer: { title: "Narrative Lab", desc: "Scrittura, rewrite, cast e lettura come moduli di laboratorio." },
      bestseller: { title: "Market Intelligence HUD", desc: "Segnali, titoli e KDP dentro un cruscotto predittivo." },
      publishing: { title: "Launch Bay", desc: "Cover, export e pacchetti pronti al rilascio." },
      system: { title: "Control Deck", desc: "Identita, ambiente, libreria e sistemi del Writer OS." },
    },
    modules: {
      writer_studio: { title: "Narrative Lab" },
      manuscript_lab: { title: "Continuity Scanner" },
      kdp_launch: { title: "Market Intelligence HUD" },
      export_studio: { title: "Launch Bay Export" },
    },
  },
};

export function getAtmosphereThemeCopy(profileId: AtmosphereProfileId): ThemeCopy {
  const override = THEME_COPY[profileId] || {};
  return {
    ...BASE_COPY,
    ...override,
    groups: { ...BASE_COPY.groups, ...(override.groups || {}) },
    modules: { ...BASE_COPY.modules, ...(override.modules || {}) },
  };
}
