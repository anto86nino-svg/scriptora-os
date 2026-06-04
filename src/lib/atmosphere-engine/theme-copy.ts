import type { AtmosphereProfileId } from "./types";

export type ThemeCopy = {
  world: {
    label: string;
    title: string;
    description: string;
    bookObject: string;
    orbitLabel: string;
  };
  bookObjectLabel: string;
  activeBookLabel: string;
  journeyLabel: string;
  emptyBookHint: string;
  osTitle: string;
  osDescription: string;
  groups: Record<string, { title: string; desc: string; room?: string; object?: string }>;
  modules: Record<string, { title: string; desc?: string; tag?: string; form?: string; object?: string; room?: string }>;
};

const BASE_COPY: ThemeCopy = {
  world: {
    label: "Author operating room",
    title: "Il sistema operativo del tuo libro",
    description: "Il manoscritto resta al centro. Ogni strumento diventa una stazione al servizio del progetto.",
    bookObject: "Libro attivo",
    orbitLabel: "Stazioni del libro",
  },
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
    world: {
      label: "Abandoned gothic writing chamber",
      title: "Camera gotica del manoscritto",
      description: "Il libro domina la stanza. Ogni sezione e un luogo oscuro ma controllato: scrittura, autopsia, oracolo, sigillo.",
      bookObject: "Cursed manuscript",
      orbitLabel: "Stanze attorno al manoscritto",
    },
    bookObjectLabel: "Cursed Manuscript",
    activeBookLabel: "Manoscritto maledetto",
    journeyLabel: "Camera del manoscritto",
    emptyBookHint: "Apri un nuovo fascicolo narrativo. Scriptora trasformera idea, indizi, cover e lancio in un rituale controllato.",
    osTitle: "Stanze dell'indagine narrativa",
    osDescription: "Ogni strumento e una camera del manoscritto. Apri solo il fascicolo che serve.",
    groups: {
      writer: { title: "Camera della Scrittura", desc: "Scrittura, riscrittura, anime e voci nascoste nel manoscritto.", room: "Candle-lit writing chamber", object: "Scrittoio del manoscritto" },
      bestseller: { title: "Oracolo del Mercato", desc: "Segnali commerciali, titoli e rituali di dominazione KDP.", room: "Occult dossier chamber", object: "Tavolo degli indizi" },
      publishing: { title: "Sigillo Finale", desc: "Cover, export e archivio dei manoscritti pronti a uscire.", room: "Sealing ceremony", object: "Sigillo editoriale" },
      system: { title: "Archivio Maledetto", desc: "Identita, ambiente, libreria e controlli del laboratorio oscuro.", room: "Cursed archive", object: "Chiavi dell'archivio" },
    },
    modules: {
      writer_studio: { title: "Camera della Scrittura", tag: "SCRITTURA", form: "desk", object: "Scrittoio acceso" },
      story_architect: { title: "Fascicolo d'Origine", tag: "ORIGINE", form: "dossier", object: "Cartella del caso" },
      manuscript_lab: { title: "Autopsia del Manoscritto", tag: "AUTOPSIA", form: "autopsy", object: "Tavolo anatomico" },
      rewrite_studio: { title: "Riscrittura d'Ombra", tag: "RISCRITTURA", form: "mirror", object: "Specchio delle varianti" },
      character_studio: { title: "Anime della Storia", tag: "CAST", form: "archive", object: "Parete delle anime" },
      voice_studio: { title: "Voce dalle Ombre", tag: "ASCOLTO", form: "voice", object: "Fonografo oscuro" },
      notes: { title: "Taccuino del Caso", tag: "INDIZI", form: "notebook", object: "Taccuino aperto" },
      bestseller_engine: { title: "Rituale di Dominazione", tag: "RITUALE", form: "ritual", object: "Cerchio di lancio" },
      kdp_launch: { title: "Oracolo del Mercato", tag: "KDP", form: "oracle", object: "Oracolo commerciale" },
      title_intelligence: { title: "Nomi Proibiti", tag: "TITOLI", form: "dossier", object: "Registro dei titoli" },
      bestseller_radar: { title: "Segnali nel Buio", tag: "RADAR", form: "signal", object: "Mappa dei segnali" },
      keyword_gold: { title: "Parole Sepolte", tag: "KEYWORD", form: "archive", object: "Indice sepolto" },
      cover_studio: { title: "Volto del Manoscritto", tag: "COVER", form: "portrait", object: "Ritratto del libro" },
      export_studio: { title: "Sigillo Finale", tag: "EXPORT", form: "seal", object: "Sigillo finale" },
      completed_shelf: { title: "Archivio Sigillato", tag: "ARCHIVIO", form: "archive", object: "Scaffale chiuso" },
      author_identity: { title: "Identita Occulta", tag: "AUTORE", form: "identity", object: "Maschera autoriale" },
      atmosphere: { title: "Camera Atmosferica", tag: "AMBIENTE", form: "chamber", object: "Manopole ambientali" },
      drafts: { title: "Archivio Maledetto", tag: "DRAFT", form: "archive", object: "Fascicoli sospesi" },
      settings: { title: "Chiavi del Sistema", tag: "CONTROLLO", form: "keys", object: "Chiavi del sistema" },
    },
  },
  "fantasy-realm": {
    world: {
      label: "Royal storytelling kingdom",
      title: "Sala reale del manoscritto",
      description: "Il libro diventa un tomo sacro sul trono. Le stazioni sono camere del regno creativo.",
      bookObject: "Sacred tome",
      orbitLabel: "Camere del regno",
    },
    bookObjectLabel: "Royal Manuscript",
    activeBookLabel: "Libro del Regno",
    journeyLabel: "Sala del destino",
    groups: {
      writer: { title: "Chamber of Creation", desc: "Scrittura, rewrite, personaggi e voce nella sala del Regno.", room: "Royal creation chamber", object: "Tavolo delle pergamene" },
      bestseller: { title: "Kingdom Market", desc: "Mercato, titoli e segnali commerciali come mappe del reame.", room: "Kingdom oracle", object: "Mappa del mercato" },
      publishing: { title: "Royal Publishing", desc: "Cover, export e biblioteca reale dei libri completati.", room: "Destiny forge", object: "Sigillo reale" },
      system: { title: "Royal Library", desc: "Identita, atmosfera, libreria e controllo del reame creativo.", room: "Royal archive", object: "Chiavi del regno" },
    },
    modules: {
      writer_studio: { title: "Chamber of Creation", form: "desk", object: "Pergamena viva" },
      story_architect: { title: "Forgia dell'Origine", form: "ritual", object: "Mappa della quest" },
      manuscript_lab: { title: "Destiny Oracle", form: "oracle", object: "Sfera del destino" },
      rewrite_studio: { title: "Incantesimo di Riscrittura", form: "mirror", object: "Specchio runico" },
      character_studio: { title: "Hall of Heroes", form: "archive", object: "Arazzo degli eroi" },
      voice_studio: { title: "Coro del Regno", form: "voice", object: "Corno narrativo" },
      notes: { title: "Pergamene Segrete", form: "notebook", object: "Taccuino del mago" },
      bestseller_engine: { title: "Forgia del Destino", form: "ritual", object: "Incudine del lancio" },
      kdp_launch: { title: "Kingdom Market", form: "market", object: "Mappa del regno" },
      title_intelligence: { title: "Nomi del Trono", form: "oracle", object: "Registro dei casati" },
      bestseller_radar: { title: "Segnali delle Terre", form: "signal", object: "Astrolabio reale" },
      keyword_gold: { title: "Rune Commerciali", form: "archive", object: "Indice dorato" },
      cover_studio: { title: "Stemma del Libro", form: "portrait", object: "Scudo di copertina" },
      export_studio: { title: "Sigillo Reale", form: "seal", object: "Pergamena finale" },
      completed_shelf: { title: "Royal Library", form: "archive", object: "Biblioteca reale" },
      author_identity: { title: "Casata Autoriale", form: "identity", object: "Sigillo dell'autore" },
      atmosphere: { title: "Sala delle Atmosfere", form: "chamber", object: "Braciere del reame" },
      drafts: { title: "Archivio Reale", form: "archive", object: "Scaffale dei tomi" },
      settings: { title: "Chiavi del Regno", form: "keys", object: "Chiavi del castello" },
    },
  },
  "dark-luxury": {
    world: {
      label: "Private bestseller penthouse",
      title: "Studio privato del manoscritto",
      description: "Il libro vive su una scrivania editoriale di lusso. Tutto resta pulito, notturno, professionale.",
      bookObject: "Premium manuscript desk",
      orbitLabel: "Suite editoriali",
    },
    bookObjectLabel: "Velvet Manuscript",
    activeBookLabel: "Libro in velluto",
    journeyLabel: "Studio noir",
    groups: {
      writer: { title: "Velvet Writing Room", desc: "Scrittura e riscrittura in un ambiente intimo, elegante, notturno.", room: "Private writing office", object: "Scrivania in velluto" },
      bestseller: { title: "Noir Market Suite", desc: "Titoli, segnali e posizionamento con lusso scuro.", room: "Market suite", object: "Dossier commerciale" },
      publishing: { title: "Gold Seal Studio", desc: "Cover, export e finitura editoriale premium.", room: "Gold seal atelier", object: "Timbro dorato" },
      system: { title: "Private Archive", desc: "Identita autore, atmosfera e controllo dello studio.", room: "Private archive", object: "Archivio personale" },
    },
    modules: {
      writer_studio: { title: "Velvet Writing Room", form: "desk", object: "Scrivania premium" },
      story_architect: { title: "Private Briefing", form: "dossier", object: "Dossier editoriale" },
      manuscript_lab: { title: "Editorial Tasting Room", form: "autopsy", object: "Campione manoscritto" },
      rewrite_studio: { title: "Noir Rewrite", form: "mirror", object: "Bozza rifinita" },
      character_studio: { title: "Room of Secrets", form: "archive", object: "Fascicoli privati" },
      voice_studio: { title: "Midnight Listening Room", form: "voice", object: "Cuffie in velluto" },
      notes: { title: "Black Notebook", form: "notebook", object: "Taccuino privato" },
      bestseller_engine: { title: "Launch Salon", form: "market", object: "Tavolo strategico" },
      kdp_launch: { title: "Noir Market Suite", form: "market", object: "Dossier KDP" },
      title_intelligence: { title: "Title Atelier", form: "dossier", object: "Campioni titolo" },
      bestseller_radar: { title: "Signals Bar", form: "signal", object: "Radar discreto" },
      keyword_gold: { title: "Metadata Vault", form: "archive", object: "Cassetta keyword" },
      cover_studio: { title: "Gold Cover Studio", form: "portrait", object: "Campione cover" },
      export_studio: { title: "Gold Seal Export", form: "seal", object: "Pacchetto finale" },
      completed_shelf: { title: "Private Shelf", form: "archive", object: "Scaffale firmato" },
      author_identity: { title: "Author Persona", form: "identity", object: "Biglietto autoriale" },
      atmosphere: { title: "Ambient Director", form: "chamber", object: "Luci dello studio" },
      drafts: { title: "Private Archive", form: "archive", object: "Cartelle in pelle" },
      settings: { title: "Studio Controls", form: "keys", object: "Chiavi private" },
    },
  },
  "space-scifi": {
    world: {
      label: "Narrative intelligence lab",
      title: "Laboratorio di intelligenza narrativa",
      description: "Il libro e un nucleo operativo. Ogni modulo e una stazione di comando per progettare, testare e lanciare.",
      bookObject: "Core intelligence artifact",
      orbitLabel: "Stazioni del laboratorio",
    },
    bookObjectLabel: "Narrative Core",
    activeBookLabel: "Manoscritto orbitale",
    journeyLabel: "Command deck",
    groups: {
      writer: { title: "Narrative Lab", desc: "Scrittura, rewrite, cast e lettura come moduli di laboratorio.", room: "Narrative lab", object: "Console di scrittura" },
      bestseller: { title: "Market Intelligence HUD", desc: "Segnali, titoli e KDP dentro un cruscotto predittivo.", room: "Market command center", object: "Radar commerciale" },
      publishing: { title: "Launch Bay", desc: "Cover, export e pacchetti pronti al rilascio.", room: "Launch bay", object: "Capsula editoriale" },
      system: { title: "Control Deck", desc: "Identita, ambiente, libreria e sistemi del Writer OS.", room: "Control deck", object: "Pannello centrale" },
    },
    modules: {
      writer_studio: { title: "Narrative Lab", form: "console", object: "Console live" },
      story_architect: { title: "Blueprint Reactor", form: "scanner", object: "Schema orbitale" },
      manuscript_lab: { title: "Continuity Scanner", form: "scanner", object: "Scanner narrativo" },
      rewrite_studio: { title: "Rewrite Matrix", form: "console", object: "Modulo di riscrittura" },
      character_studio: { title: "Identity Matrix", form: "archive", object: "Archivio personaggi" },
      voice_studio: { title: "Audio Deck", form: "voice", object: "Console vocale" },
      notes: { title: "Mission Log", form: "notebook", object: "Log di bordo" },
      bestseller_engine: { title: "Launch Simulator", form: "launch", object: "Simulatore mercato" },
      kdp_launch: { title: "Market Intelligence HUD", form: "hud", object: "Radar KDP" },
      title_intelligence: { title: "Title Array", form: "hud", object: "Matrice titoli" },
      bestseller_radar: { title: "Signal Observatory", form: "signal", object: "Osservatorio trend" },
      keyword_gold: { title: "Keyword Processor", form: "scanner", object: "Processore keyword" },
      cover_studio: { title: "Cover Renderer", form: "portrait", object: "Renderer cover" },
      export_studio: { title: "Launch Bay Export", form: "launch", object: "Modulo di rilascio" },
      completed_shelf: { title: "Archive Bay", form: "archive", object: "Vault manoscritti" },
      author_identity: { title: "Author Signal", form: "identity", object: "Firma neurale" },
      atmosphere: { title: "Environment Lab", form: "chamber", object: "Pannello atmosfera" },
      drafts: { title: "Draft Vault", form: "archive", object: "Celle progetto" },
      settings: { title: "Control Deck", form: "keys", object: "Chiavi sistema" },
    },
  },
  "nature-calm": {
    world: {
      label: "Premium transformation institute",
      title: "Istituto del manoscritto autorevole",
      description: "Il libro diventa un manoscritto di conoscenza. Le stanze guidano trasformazione, chiarezza e autorevolezza.",
      bookObject: "Knowledge manuscript",
      orbitLabel: "Sale di trasformazione",
    },
    bookObjectLabel: "Knowledge Manuscript",
    activeBookLabel: "Manoscritto guida",
    journeyLabel: "Istituto editoriale",
    groups: {
      writer: { title: "Clarity Studio", desc: "Scrittura, struttura e voce per un messaggio piu nitido.", room: "Clarity room", object: "Leggio del metodo" },
      bestseller: { title: "Authority Market", desc: "Posizionamento, promessa e fiducia commerciale.", room: "Authority chamber", object: "Mappa di fiducia" },
      publishing: { title: "Transformation Publishing", desc: "Cover, export e consegna finale del percorso.", room: "Publishing institute", object: "Certificato editoriale" },
      system: { title: "Knowledge Archive", desc: "Identita, ambiente e archivio del metodo.", room: "Knowledge archive", object: "Biblioteca del metodo" },
    },
    modules: {
      writer_studio: { title: "Clarity Studio", form: "desk", object: "Leggio del metodo" },
      story_architect: { title: "Method Blueprint", form: "dossier", object: "Mappa del percorso" },
      manuscript_lab: { title: "Impact Diagnosis", form: "scanner", object: "Mappa di impatto" },
      rewrite_studio: { title: "Precision Rewrite", form: "desk", object: "Schema pulito" },
      character_studio: { title: "Reader Personas", form: "archive", object: "Schede lettore" },
      voice_studio: { title: "Guided Reading Room", form: "voice", object: "Leggio audio" },
      notes: { title: "Practice Notes", form: "notebook", object: "Quaderno esercizi" },
      bestseller_engine: { title: "Authority Launch", form: "market", object: "Piano autorevole" },
      kdp_launch: { title: "Authority Market", form: "market", object: "Piano di fiducia" },
      title_intelligence: { title: "Promise Lab", form: "dossier", object: "Promesse testate" },
      bestseller_radar: { title: "Demand Observatory", form: "signal", object: "Osservatorio domanda" },
      keyword_gold: { title: "Search Clarity", form: "scanner", object: "Indice keyword" },
      cover_studio: { title: "Transformation Cover", form: "portrait", object: "Identita visiva" },
      export_studio: { title: "Delivery Suite", form: "seal", object: "Consegna finale" },
      completed_shelf: { title: "Knowledge Archive", form: "archive", object: "Archivio guide" },
      author_identity: { title: "Authority Identity", form: "identity", object: "Firma autorevole" },
      atmosphere: { title: "Institute Rooms", form: "chamber", object: "Sale del metodo" },
      drafts: { title: "Practice Library", form: "archive", object: "Bozze didattiche" },
      settings: { title: "Institute Controls", form: "keys", object: "Chiavi del metodo" },
    },
  },
};

export function getAtmosphereThemeCopy(profileId: AtmosphereProfileId): ThemeCopy {
  const override = THEME_COPY[profileId] || {};
  return {
    ...BASE_COPY,
    ...override,
    world: { ...BASE_COPY.world, ...(override.world || {}) },
    groups: { ...BASE_COPY.groups, ...(override.groups || {}) },
    modules: { ...BASE_COPY.modules, ...(override.modules || {}) },
  };
}
