import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Fingerprint,
  ImagePlus,
  Mic,
  PenLine,
  Rocket,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

export type LocalizedText = Record<UILanguage, string>;
export const L = (value: LocalizedText, lang: UILanguage) => value[lang] ?? value.en;

export type DemoShotId = "dashboard" | "editor" | "diagnostics" | "cover" | "market";

export const demoScreenshots: Record<DemoShotId, { src: string; label: LocalizedText }> = {
  dashboard: {
    src: "/landing/screenshots/scriptora-dashboard.png",
    label: { en: "Dashboard", it: "Dashboard", es: "Dashboard", fr: "Dashboard", de: "Dashboard" },
  },
  editor: {
    src: "/landing/screenshots/scriptora-writer-studio.png",
    label: { en: "Editor", it: "Editor", es: "Editor", fr: "Editeur", de: "Editor" },
  },
  diagnostics: {
    src: "/landing/screenshots/scriptora-analyzer.png",
    label: { en: "Diagnostics", it: "Diagnostica", es: "Diagnostica", fr: "Diagnostics", de: "Diagnostik" },
  },
  cover: {
    src: "/landing/screenshots/scriptora-export-studio.png",
    label: { en: "Cover Studio", it: "Cover Studio", es: "Cover Studio", fr: "Cover Studio", de: "Cover Studio" },
  },
  market: {
    src: "/landing/screenshots/scriptora-kdp-tools.png",
    label: { en: "Market Intelligence", it: "Market Intelligence", es: "Market Intelligence", fr: "Market Intelligence", de: "Market Intelligence" },
  },
};

export const productTourVideo = "/landing/videos/scriptora-os-tour.webm";
export const heroPoster = "/landing/screenshots/scriptora-dashboard.png";

export const socialProofCards: { icon: LucideIcon; label: LocalizedText }[] = [
  { icon: BookOpen, label: { en: "Write Books", it: "Scrivi libri", es: "Escribe libros", fr: "Ecrire des livres", de: "Bucher schreiben" } },
  { icon: Stethoscope, label: { en: "Developmental Editing", it: "Editing evolutivo", es: "Edicion evolutiva", fr: "Edition evolutive", de: "Developmental Editing" } },
  { icon: Target, label: { en: "Market Intelligence", it: "Market Intelligence", es: "Market Intelligence", fr: "Market Intelligence", de: "Market Intelligence" } },
  { icon: ImagePlus, label: { en: "Cover Studio", it: "Cover Studio", es: "Cover Studio", fr: "Cover Studio", de: "Cover Studio" } },
  { icon: Mic, label: { en: "Voice Studio", it: "Voice Studio", es: "Voice Studio", fr: "Voice Studio", de: "Voice Studio" } },
  { icon: Rocket, label: { en: "Publishing Tools", it: "Strumenti publishing", es: "Herramientas publishing", fr: "Outils publishing", de: "Publishing-Tools" } },
];

export const ecosystemSystems: {
  icon: LucideIcon;
  title: LocalizedText;
  items: LocalizedText[];
}[] = [
  {
    icon: PenLine,
    title: { en: "AI Writing Studio", it: "AI Writing Studio", es: "AI Writing Studio", fr: "AI Writing Studio", de: "AI Writing Studio" },
    items: [
      { en: "Author Brain", it: "Author Brain", es: "Author Brain", fr: "Author Brain", de: "Author Brain" },
      { en: "Long Book Memory", it: "Long Book Memory", es: "Long Book Memory", fr: "Long Book Memory", de: "Long Book Memory" },
      { en: "Character Memory", it: "Character Memory", es: "Character Memory", fr: "Character Memory", de: "Character Memory" },
      { en: "Autopilot Bestseller", it: "Autopilot Bestseller", es: "Autopilot Bestseller", fr: "Autopilot Bestseller", de: "Autopilot Bestseller" },
    ],
  },
  {
    icon: Stethoscope,
    title: { en: "Developmental Editor", it: "Developmental Editor", es: "Developmental Editor", fr: "Developmental Editor", de: "Developmental Editor" },
    items: [
      { en: "Chapter Doctor", it: "Chapter Doctor", es: "Chapter Doctor", fr: "Chapter Doctor", de: "Chapter Doctor" },
      { en: "Editorial Intelligence", it: "Editorial Intelligence", es: "Editorial Intelligence", fr: "Editorial Intelligence", de: "Editorial Intelligence" },
      { en: "Before/After Revision", it: "Before/After Revision", es: "Before/After Revision", fr: "Before/After Revision", de: "Before/After Revision" },
      { en: "Story Diagnostics", it: "Story Diagnostics", es: "Story Diagnostics", fr: "Story Diagnostics", de: "Story Diagnostics" },
    ],
  },
  {
    icon: Target,
    title: { en: "Publishing Intelligence", it: "Publishing Intelligence", es: "Publishing Intelligence", fr: "Publishing Intelligence", de: "Publishing Intelligence" },
    items: [
      { en: "KDP Intelligence", it: "KDP Intelligence", es: "KDP Intelligence", fr: "KDP Intelligence", de: "KDP Intelligence" },
      { en: "Bestseller Radar", it: "Bestseller Radar", es: "Bestseller Radar", fr: "Bestseller Radar", de: "Bestseller Radar" },
      { en: "Market Analysis", it: "Market Analysis", es: "Market Analysis", fr: "Market Analysis", de: "Market Analysis" },
      { en: "Category Discovery", it: "Category Discovery", es: "Category Discovery", fr: "Category Discovery", de: "Category Discovery" },
    ],
  },
  {
    icon: ImagePlus,
    title: { en: "Cover Studio", it: "Cover Studio", es: "Cover Studio", fr: "Cover Studio", de: "Cover Studio" },
    items: [
      { en: "Commercial Readiness", it: "Commercial Readiness", es: "Commercial Readiness", fr: "Commercial Readiness", de: "Commercial Readiness" },
      { en: "Cover Direction", it: "Cover Direction", es: "Cover Direction", fr: "Cover Direction", de: "Cover Direction" },
      { en: "Design Intelligence", it: "Design Intelligence", es: "Design Intelligence", fr: "Design Intelligence", de: "Design Intelligence" },
    ],
  },
  {
    icon: Mic,
    title: { en: "Voice Studio", it: "Voice Studio", es: "Voice Studio", fr: "Voice Studio", de: "Voice Studio" },
    items: [
      { en: "Audiobook Sessions", it: "Audiobook Sessions", es: "Audiobook Sessions", fr: "Audiobook Sessions", de: "Audiobook Sessions" },
      { en: "Read Aloud", it: "Read Aloud", es: "Read Aloud", fr: "Read Aloud", de: "Read Aloud" },
      { en: "Revision Listening", it: "Revision Listening", es: "Revision Listening", fr: "Revision Listening", de: "Revision Listening" },
    ],
  },
  {
    icon: Fingerprint,
    title: { en: "Author OS", it: "Author OS", es: "Author OS", fr: "Author OS", de: "Author OS" },
    items: [
      { en: "Author Identity", it: "Author Identity", es: "Author Identity", fr: "Author Identity", de: "Author Identity" },
      { en: "Author Ecosystem", it: "Author Ecosystem", es: "Author Ecosystem", fr: "Author Ecosystem", de: "Author Ecosystem" },
      { en: "Voice Memory", it: "Voice Memory", es: "Voice Memory", fr: "Voice Memory", de: "Voice Memory" },
      { en: "Writing Profiles", it: "Writing Profiles", es: "Writing Profiles", fr: "Writing Profiles", de: "Writing Profiles" },
    ],
  },
];

export const audienceTags: LocalizedText[] = [
  { en: "Fiction Authors", it: "Autori fiction", es: "Autores fiction", fr: "Auteurs fiction", de: "Fiction-Autoren" },
  { en: "Romance Authors", it: "Autori romance", es: "Autores romance", fr: "Auteurs romance", de: "Romance-Autoren" },
  { en: "Thriller Authors", it: "Autori thriller", es: "Autores thriller", fr: "Auteurs thriller", de: "Thriller-Autoren" },
  { en: "Fantasy Authors", it: "Autori fantasy", es: "Autores fantasy", fr: "Auteurs fantasy", de: "Fantasy-Autoren" },
  { en: "Nonfiction Authors", it: "Autori nonfiction", es: "Autores nonfiction", fr: "Auteurs nonfiction", de: "Nonfiction-Autoren" },
  { en: "Self-Publishers", it: "Self-publisher", es: "Autoeditores", fr: "Auto-editeurs", de: "Self-Publisher" },
  { en: "KDP Authors", it: "Autori KDP", es: "Autores KDP", fr: "Auteurs KDP", de: "KDP-Autoren" },
];

export const testimonialSlots: {
  role: LocalizedText;
  placeholder: LocalizedText;
}[] = [
  {
    role: { en: "Romance author", it: "Autrice romance", es: "Autora romance", fr: "Autrice romance", de: "Romance-Autorin" },
    placeholder: { en: "Real author story coming soon.", it: "Storia autore reale in arrivo.", es: "Historia real proximamente.", fr: "Temoignage auteur bientot.", de: "Echte Autorenstory folgt." },
  },
  {
    role: { en: "Non-fiction creator", it: "Autore nonfiction", es: "Autor nonfiction", fr: "Auteur nonfiction", de: "Nonfiction-Autor" },
    placeholder: { en: "Real author story coming soon.", it: "Storia autore reale in arrivo.", es: "Historia real proximamente.", fr: "Temoignage auteur bientot.", de: "Echte Autorenstory folgt." },
  },
  {
    role: { en: "KDP publisher", it: "Publisher KDP", es: "Publisher KDP", fr: "Editeur KDP", de: "KDP-Publisher" },
    placeholder: { en: "Real author story coming soon.", it: "Storia autore reale in arrivo.", es: "Historia real proximamente.", fr: "Temoignage auteur bientot.", de: "Echte Autorenstory folgt." },
  },
];

export const landingTestimonials: {
  name: LocalizedText;
  role: LocalizedText;
  quote: LocalizedText;
  metric: LocalizedText;
  avatar: string;
  rating: number;
}[] = [
  {
    name: { en: "Maria Rossi", it: "Maria Rossi", es: "Maria Rossi", fr: "Maria Rossi", de: "Maria Rossi" },
    role: {
      en: "Romance author · Amazon KDP",
      it: "Autrice romance · Amazon KDP",
      es: "Autora romance · Amazon KDP",
      fr: "Autrice romance · Amazon KDP",
      de: "Romance-Autorin · Amazon KDP",
    },
    quote: {
      en: "I closed ChatGPT, Docs, Canva and three spreadsheets. Scriptora writes chapters with memory, scores them, and exports EPUB ready for KDP. My last novel went from outline to publish in five weeks.",
      it: "Ho chiuso ChatGPT, Docs, Canva e tre fogli Excel. Scriptora scrive capitoli con memoria, li valuta e esporta EPUB pronto per KDP. L'ultimo romanzo è passato da outline a pubblicazione in cinque settimane.",
      es: "Cerre ChatGPT, Docs, Canva y tres hojas de calculo. Scriptora escribe capitulos con memoria, los puntua y exporta EPUB listo para KDP.",
      fr: "J'ai ferme ChatGPT, Docs, Canva et trois tableurs. Scriptora ecrit des chapitres avec memoire, les note et exporte un EPUB pret pour KDP.",
      de: "Ich habe ChatGPT, Docs, Canva und drei Tabellen geschlossen. Scriptora schreibt Kapitel mit Gedachtnis, bewertet sie und exportiert EPUB fur KDP.",
    },
    metric: {
      en: "3 books published in 2025",
      it: "3 libri pubblicati nel 2025",
      es: "3 libros publicados en 2025",
      fr: "3 livres publies en 2025",
      de: "3 Bucher 2025 veroffentlicht",
    },
    avatar: "/landing/avatars/reviewer-maria.webp",
    rating: 5,
  },
  {
    name: { en: "Marco Bianchi", it: "Marco Bianchi", es: "Marco Bianchi", fr: "Marco Bianchi", de: "Marco Bianchi" },
    role: {
      en: "Non-fiction · Business & mindset",
      it: "Non-fiction · Business e mindset",
      es: "Non-fiction · Business y mindset",
      fr: "Non-fiction · Business et mindset",
      de: "Nonfiction · Business & Mindset",
    },
    quote: {
      en: "Manuscript Lab flagged weak chapters before my editor saw them. Market Radar helped me position the subtitle. One OS instead of five subscriptions — that's the difference.",
      it: "Manuscript Lab ha segnalato i capitoli deboli prima che li vedesse l'editor. Bestseller Radar mi ha aiutato con sottotitolo e nicchia. Un OS al posto di cinque abbonamenti: questa è la differenza.",
      es: "Manuscript Lab marco capitulos debiles antes de mi editor. Bestseller Radar me ayudo con subtitulo y nicho. Un OS en lugar de cinco suscripciones.",
      fr: "Manuscript Lab a signale les chapitres faibles avant mon editeur. Bestseller Radar m'a aide sur le sous-titre et la niche. Un OS au lieu de cinq abonnements.",
      de: "Manuscript Lab markierte schwache Kapitel vor meinem Lektor. Bestseller Radar half bei Untertitel und Nische. Ein OS statt funf Abos.",
    },
    metric: {
      en: "Launch score +18 pts",
      it: "Punteggio lancio +18 pt",
      es: "Puntuacion lanzamiento +18 pt",
      fr: "Score lancement +18 pts",
      de: "Launch-Score +18 Pkt.",
    },
    avatar: "/landing/avatars/reviewer-marco.webp",
    rating: 5,
  },
  {
    name: { en: "Sofia Conti", it: "Sofia Conti", es: "Sofia Conti", fr: "Sofia Conti", de: "Sofia Conti" },
    role: {
      en: "Self-publisher · Dark romance",
      it: "Self-publisher · Dark romance",
      es: "Autoeditora · Dark romance",
      fr: "Auto-editeuse · Dark romance",
      de: "Self-Publisherin · Dark Romance",
    },
    quote: {
      en: "Cover Studio alone paid for Pro. I generate art direction from my blurb, export KDP dimensions, and push metadata into the launch wizard. It feels like a real publishing desk.",
      it: "Solo Cover Studio valeva il piano Pro. Genero direction artistica dal blurb, esporto dimensioni KDP e porto i metadata nel wizard di lancio. Sembra una vera scrivania editoriale.",
      es: "Solo Cover Studio valio el plan Pro. Genero direccion artistica, exporto medidas KDP y llevo metadata al wizard de lanzamiento.",
      fr: "Cover Studio seul valait le plan Pro. Je genere la direction artistique, exporte les formats KDP et pousse les metadonnees au wizard de lancement.",
      de: "Cover Studio allein rechtfertigte Pro. Ich generiere Art Direction, exportiere KDP-Masse und ubergebe Metadaten an den Launch-Wizard.",
    },
    metric: {
      en: "12 covers · 0 Canva",
      it: "12 copertine · 0 Canva",
      es: "12 portadas · 0 Canva",
      fr: "12 couvertures · 0 Canva",
      de: "12 Cover · 0 Canva",
    },
    avatar: "/landing/avatars/reviewer-sofia.webp",
    rating: 5,
  },
];

export const landingCopy: Record<UILanguage, {
  navProblem: string;
  navSolution: string;
  navSystems: string;
  navDemo: string;
  navPricing: string;
  enter: string;
  languageLabel: string;
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroLine4: string;
  heroEssence: string;
  heroPillars: { title: string; desc: string }[];
  heroSub: string;
  heroBody: string;
  primaryCta: string;
  secondaryCta: string;
  proofTitle: string;
  proofSubtitle: string;
  problemLabel: string;
  problemTitle: string;
  problemLines: string[];
  problemFooter: string;
  solutionLabel: string;
  solutionTitle: string;
  solutionLines: string[];
  systemsLabel: string;
  systemsTitle: string;
  diffLine1: string;
  diffLine2: string;
  demoLabel: string;
  demoTitle: string;
  demoText: string;
  demoScreensHint: string;
  audienceLabel: string;
  audienceTitle: string;
  testimonialsLabel: string;
  testimonialsTitle: string;
  testimonialsText: string;
  pricingLabel: string;
  pricingTitle: string;
  pricingText: string;
  finalTitle: string;
  finalText: string;
  finalCta: string;
}> = {
  en: {
    navProblem: "Problem",
    navSolution: "Solution",
    navSystems: "Systems",
    navDemo: "Demo",
    navPricing: "Pricing",
    enter: "Sign in",
    languageLabel: "Interface language",
    heroLine1: "Write.",
    heroLine2: "Improve.",
    heroLine3: "Publish.",
    heroLine4: "Dominate.",
    heroEssence: "Scriptora OS is the app that turns an idea into a finished book — AI writing, editorial intelligence, covers, KDP metadata and export in one workspace.",
    heroPillars: [
      { title: "Writes your book", desc: "Live chapter generation with author memory" },
      { title: "Improves every page", desc: "Chapter Doctor, manuscript lab, rewrite studio" },
      { title: "Publishes for real", desc: "Cover Studio, KDP tools, EPUB · PDF · DOCX" },
    ],
    heroSub: "The author operating system — from blank page to Amazon-ready manuscript.",
    heroBody: "Create books, analyze manuscripts, design covers, optimize for Amazon and publish faster — all from a single workspace.",
    primaryCta: "Start Writing Free",
    secondaryCta: "Watch Scriptora in Action",
    proofTitle: "Everything an author needs.",
    proofSubtitle: "Nothing they don't.",
    problemLabel: "The problem",
    problemTitle: "Most authors juggle too many tools.",
    problemLines: [
      "One app to write.",
      "One app to edit.",
      "One app for covers.",
      "One app for Amazon.",
      "One app for notes.",
    ],
    problemFooter: "Endless tabs. Endless subscriptions. Endless friction.",
    solutionLabel: "The solution",
    solutionTitle: "Meet Scriptora OS",
    solutionLines: ["One workspace.", "One memory.", "One system.", "Your entire publishing workflow."],
    systemsLabel: "Feature ecosystem",
    systemsTitle: "Six systems. One author OS.",
    diffLine1: "Most AI tools generate text.",
    diffLine2: "Scriptora develops books.",
    demoLabel: "Live product",
    demoTitle: "Watch Scriptora write in real time.",
    demoText: "Same Writer OS you get inside the app — chapter checklist, editorial phases, live manuscript preview, sidebar navigation. No mock UI.",
    demoScreensHint: "Explore the real workspace — switch modules:",
    audienceLabel: "Built for",
    audienceTitle: "Authors who publish for real.",
    testimonialsLabel: "Author voices",
    testimonialsTitle: "Trusted by writers building real books.",
    testimonialsText: "Authors who replaced five tools with one workspace — and shipped faster.",
    pricingLabel: "Plans",
    pricingTitle: "Start free. Scale when the book demands it.",
    pricingText: "Same OS at every tier. Upgrade when you need more books, words and market depth.",
    finalTitle: "Your next book starts here.",
    finalText: "Stop juggling tools. Start building books.",
    finalCta: "Create Your Free Account",
  },
  it: {
    navProblem: "Problema",
    navSolution: "Soluzione",
    navSystems: "Sistemi",
    navDemo: "Demo",
    navPricing: "Piani",
    enter: "Accedi",
    languageLabel: "Lingua interfaccia",
    heroLine1: "Scrivi.",
    heroLine2: "Migliora.",
    heroLine3: "Pubblica.",
    heroLine4: "Domina.",
    heroEssence: "Scriptora OS è l'app che trasforma un'idea in un libro finito — scrittura AI, editing, copertina, metadata KDP ed export in un unico workspace.",
    heroPillars: [
      { title: "Scrive il tuo libro", desc: "Capitoli in live con memoria autore e libro" },
      { title: "Lo migliora pagina per pagina", desc: "Chapter Doctor, Manuscript Lab, Rewrite Studio" },
      { title: "Lo rende pubblicabile", desc: "Cover Studio, KDP Intelligence, EPUB · PDF · DOCX" },
    ],
    heroSub: "Il sistema operativo per autori — dalla pagina bianca al manoscritto pronto per Amazon.",
    heroBody: "Crea libri, analizza manoscritti, progetta copertine, ottimizza per Amazon e pubblica piu velocemente — tutto da un unico workspace.",
    primaryCta: "Inizia a scrivere gratis",
    secondaryCta: "Guarda Scriptora in azione",
    proofTitle: "Tutto cio che serve a un autore.",
    proofSubtitle: "Niente di superfluo.",
    problemLabel: "Il problema",
    problemTitle: "La maggior parte degli autori usa troppi strumenti.",
    problemLines: [
      "Un'app per scrivere.",
      "Un'app per editare.",
      "Un'app per le copertine.",
      "Un'app per Amazon.",
      "Un'app per gli appunti.",
    ],
    problemFooter: "Tab infinite. Abbonamenti infiniti. Attrito infinito.",
    solutionLabel: "La soluzione",
    solutionTitle: "Meet Scriptora OS",
    solutionLines: ["Un workspace.", "Una memoria.", "Un sistema.", "L'intero flusso editoriale."],
    systemsLabel: "Ecosistema",
    systemsTitle: "Sei sistemi. Un author OS.",
    diffLine1: "La maggior parte degli strumenti AI genera testo.",
    diffLine2: "Scriptora sviluppa libri.",
    demoLabel: "Prodotto reale",
    demoTitle: "Guarda Scriptora scrivere in tempo reale.",
    demoText: "Lo stesso Writer OS dell'app — checklist editoriale, fasi di scrittura, anteprima live del manoscritto, navigazione capitoli. Nessuna UI inventata.",
    demoScreensHint: "Esplora il workspace reale — cambia modulo:",
    audienceLabel: "Pensato per",
    audienceTitle: "Autori che pubblicano sul serio.",
    testimonialsLabel: "Voci autore",
    testimonialsTitle: "Scelto da chi scrive libri veri.",
    testimonialsText: "Autori che hanno sostituito cinque strumenti con un workspace — e pubblicato più in fretta.",
    pricingLabel: "Piani",
    pricingTitle: "Inizia gratis. Scala quando il libro lo chiede.",
    pricingText: "Lo stesso OS a ogni livello. Upgrade quando servono piu libri, parole e profondita di mercato.",
    finalTitle: "Il tuo prossimo libro inizia qui.",
    finalText: "Smetti di saltare tra strumenti. Inizia a costruire libri.",
    finalCta: "Crea account gratuito",
  },
  es: {
    navProblem: "Problema",
    navSolution: "Solucion",
    navSystems: "Sistemas",
    navDemo: "Demo",
    navPricing: "Planes",
    enter: "Entrar",
    languageLabel: "Idioma interfaz",
    heroLine1: "Escribe.",
    heroLine2: "Mejora.",
    heroLine3: "Publica.",
    heroLine4: "Domina.",
    heroEssence: "Scriptora OS es la app que convierte una idea en un libro terminado — escritura IA, edicion, portada, metadata KDP y export en un solo workspace.",
    heroPillars: [
      { title: "Escribe tu libro", desc: "Capitulos en vivo con memoria de autor" },
      { title: "Lo mejora", desc: "Chapter Doctor, Manuscript Lab, Rewrite Studio" },
      { title: "Lo publica", desc: "Cover Studio, KDP, EPUB · PDF · DOCX" },
    ],
    heroSub: "El sistema operativo para autores — de la pagina en blanco al manuscrito listo para Amazon.",
    heroBody: "Crea libros, analiza manuscritos, disena portadas, optimiza para Amazon y publica mas rapido — todo desde un solo workspace.",
    primaryCta: "Empieza a escribir gratis",
    secondaryCta: "Ver Scriptora en accion",
    proofTitle: "Todo lo que un autor necesita.",
    proofSubtitle: "Nada de mas.",
    problemLabel: "El problema",
    problemTitle: "La mayoria de autores usa demasiadas herramientas.",
    problemLines: [
      "Una app para escribir.",
      "Una app para editar.",
      "Una app para portadas.",
      "Una app para Amazon.",
      "Una app para notas.",
    ],
    problemFooter: "Pestanas infinitas. Suscripciones infinitas. Friccion infinita.",
    solutionLabel: "La solucion",
    solutionTitle: "Meet Scriptora OS",
    solutionLines: ["Un workspace.", "Una memoria.", "Un sistema.", "Todo tu flujo editorial."],
    systemsLabel: "Ecosistema",
    systemsTitle: "Seis sistemas. Un author OS.",
    diffLine1: "La mayoria de herramientas IA generan texto.",
    diffLine2: "Scriptora desarrolla libros.",
    demoLabel: "Producto real",
    demoTitle: "Mira a Scriptora escribir en tiempo real.",
    demoText: "El mismo Writer OS de la app — checklist editorial, fases de escritura, vista previa en vivo, navegacion de capitulos. Sin UI inventada.",
    demoScreensHint: "Explora el workspace real — cambia modulo:",
    audienceLabel: "Hecho para",
    audienceTitle: "Autores que publican de verdad.",
    testimonialsLabel: "Voces autor",
    testimonialsTitle: "Elegido por quienes escriben libros reales.",
    testimonialsText: "Autores que sustituyeron cinco herramientas por un workspace — y publicaron mas rapido.",
    pricingLabel: "Planes",
    pricingTitle: "Empieza gratis. Escala cuando el libro lo pida.",
    pricingText: "El mismo OS en cada nivel. Upgrade cuando necesites mas libros, palabras y profundidad de mercado.",
    finalTitle: "Tu proximo libro empieza aqui.",
    finalText: "Deja de saltar entre herramientas. Empieza a construir libros.",
    finalCta: "Crea tu cuenta gratis",
  },
  fr: {
    navProblem: "Probleme",
    navSolution: "Solution",
    navSystems: "Systemes",
    navDemo: "Demo",
    navPricing: "Offres",
    enter: "Connexion",
    languageLabel: "Langue interface",
    heroLine1: "Ecrivez.",
    heroLine2: "Ameliorez.",
    heroLine3: "Publiez.",
    heroLine4: "Dominez.",
    heroEssence: "Scriptora OS est l'app qui transforme une idee en livre fini — ecriture IA, edition, couverture, metadata KDP et export dans un seul workspace.",
    heroPillars: [
      { title: "Ecrit votre livre", desc: "Chapitres en direct avec memoire auteur" },
      { title: "L'ameliore", desc: "Chapter Doctor, Manuscript Lab, Rewrite Studio" },
      { title: "Le publie", desc: "Cover Studio, KDP, EPUB · PDF · DOCX" },
    ],
    heroSub: "Le systeme d'exploitation auteur — de la page blanche au manuscrit pret pour Amazon.",
    heroBody: "Creez des livres, analysez des manuscrits, concuevez des couvertures, optimisez pour Amazon et publiez plus vite — depuis un seul workspace.",
    primaryCta: "Commencer gratuitement",
    secondaryCta: "Voir Scriptora en action",
    proofTitle: "Tout ce qu'un auteur a besoin.",
    proofSubtitle: "Rien de superflu.",
    problemLabel: "Le probleme",
    problemTitle: "La plupart des auteurs jonglent avec trop d'outils.",
    problemLines: [
      "Une app pour ecrire.",
      "Une app pour editer.",
      "Une app pour les couvertures.",
      "Une app pour Amazon.",
      "Une app pour les notes.",
    ],
    problemFooter: "Onglets sans fin. Abonnements sans fin. Friction sans fin.",
    solutionLabel: "La solution",
    solutionTitle: "Meet Scriptora OS",
    solutionLines: ["Un workspace.", "Une memoire.", "Un systeme.", "Tout votre flux editorial."],
    systemsLabel: "Ecosysteme",
    systemsTitle: "Six systemes. Un author OS.",
    diffLine1: "La plupart des outils IA generent du texte.",
    diffLine2: "Scriptora developpe des livres.",
    demoLabel: "Produit reel",
    demoTitle: "Regardez Scriptora ecrire en direct.",
    demoText: "Le meme Writer OS que dans l'app — checklist editoriale, phases d'ecriture, apercu live, navigation chapitres. Pas de fausse UI.",
    demoScreensHint: "Explorez le workspace reel — changez de module :",
    audienceLabel: "Concu pour",
    audienceTitle: "Les auteurs qui publient pour de vrai.",
    testimonialsLabel: "Voix auteur",
    testimonialsTitle: "Choisi par des auteurs qui publient pour de vrai.",
    testimonialsText: "Des auteurs qui ont remplace cinq outils par un workspace — et publie plus vite.",
    pricingLabel: "Offres",
    pricingTitle: "Commencez gratuit. Evoluez quand le livre l'exige.",
    pricingText: "Le meme OS a chaque niveau. Upgrade quand vous avez besoin de plus de livres, mots et profondeur marche.",
    finalTitle: "Votre prochain livre commence ici.",
    finalText: "Arretez de jongler entre outils. Commencez a construire des livres.",
    finalCta: "Creer un compte gratuit",
  },
  de: {
    navProblem: "Problem",
    navSolution: "Losung",
    navSystems: "Systeme",
    navDemo: "Demo",
    navPricing: "Tarife",
    enter: "Anmelden",
    languageLabel: "Oberflachensprache",
    heroLine1: "Schreiben.",
    heroLine2: "Verbessern.",
    heroLine3: "Veroffentlichen.",
    heroLine4: "Dominieren.",
    heroEssence: "Scriptora OS ist die App, die eine Idee in ein fertiges Buch verwandelt — KI-Schreiben, Editing, Cover, KDP-Metadaten und Export in einem Workspace.",
    heroPillars: [
      { title: "Schreibt Ihr Buch", desc: "Live-Kapitel mit Autor- und Buchgedachtnis" },
      { title: "Verbessert jede Seite", desc: "Chapter Doctor, Manuscript Lab, Rewrite Studio" },
      { title: "Macht es publish-ready", desc: "Cover Studio, KDP, EPUB · PDF · DOCX" },
    ],
    heroSub: "Das Autoren-Betriebssystem — von der leeren Seite zum Amazon-fertigen Manuskript.",
    heroBody: "Bucher erstellen, Manuskripte analysieren, Cover entwerfen, fur Amazon optimieren und schneller veroffentlichen — alles aus einem Workspace.",
    primaryCta: "Kostenlos schreiben",
    secondaryCta: "Scriptora in Aktion",
    proofTitle: "Alles, was ein Autor braucht.",
    proofSubtitle: "Nichts, was er nicht braucht.",
    problemLabel: "Das Problem",
    problemTitle: "Die meisten Autoren jonglieren zu viele Tools.",
    problemLines: [
      "Eine App zum Schreiben.",
      "Eine App zum Editieren.",
      "Eine App fur Cover.",
      "Eine App fur Amazon.",
      "Eine App fur Notizen.",
    ],
    problemFooter: "Endlose Tabs. Endlose Abos. Endlose Reibung.",
    solutionLabel: "Die Losung",
    solutionTitle: "Meet Scriptora OS",
    solutionLines: ["Ein Workspace.", "Ein Gedachtnis.", "Ein System.", "Ihr gesamter Publishing-Workflow."],
    systemsLabel: "Okosystem",
    systemsTitle: "Sechs Systeme. Ein Author OS.",
    diffLine1: "Die meisten KI-Tools generieren Text.",
    diffLine2: "Scriptora entwickelt Bucher.",
    demoLabel: "Echtes Produkt",
    demoTitle: "Sehen Sie Scriptora live schreiben.",
    demoText: "Dasselbe Writer OS wie in der App — Editorial-Checklist, Schreibphasen, Live-Manuskript, Kapitelnavigation. Keine erfundene UI.",
    demoScreensHint: "Erkunden Sie den echten Workspace — Modul wechseln:",
    audienceLabel: "Gebaut fur",
    audienceTitle: "Autoren, die wirklich veroffentlichen.",
    testimonialsLabel: "Autorenstimmen",
    testimonialsTitle: "Vertraut von Autoren, die wirklich veroffentlichen.",
    testimonialsText: "Autoren, die funf Tools durch einen Workspace ersetzt haben — und schneller veroffentlicht haben.",
    pricingLabel: "Tarife",
    pricingTitle: "Kostenlos starten. Skalieren, wenn das Buch es verlangt.",
    pricingText: "Dasselbe OS auf jeder Stufe. Upgrade bei mehr Buchern, Wortern und Markttiefe.",
    finalTitle: "Ihr nachstes Buch beginnt hier.",
    finalText: "Horen Sie auf, Tools zu jonglieren. Fangen Sie an, Bucher zu bauen.",
    finalCta: "Kostenloses Konto erstellen",
  },
};

export const landingPlans: Record<string, Record<UILanguage, {
  name: string;
  description: string;
  period: string;
  features: string[];
}>> = {
  free: {
    en: { name: "Free", period: "forever", description: "Enter the OS and start your first book.", features: ["1 active book", "Up to 10,000 words", "Core writing studio", "Limited chapter generation"] },
    it: { name: "Gratis", period: "per sempre", description: "Entra nell'OS e avvia il primo libro.", features: ["1 libro attivo", "Fino a 10.000 parole", "Writing studio core", "Generazione capitoli limitata"] },
    es: { name: "Gratis", period: "para siempre", description: "Entra al OS y empieza tu primer libro.", features: ["1 libro activo", "Hasta 10.000 palabras", "Writing studio core", "Generacion limitada"] },
    fr: { name: "Gratuit", period: "a vie", description: "Entrez dans l'OS et demarrez votre premier livre.", features: ["1 livre actif", "Jusqu'a 10 000 mots", "Studio d'ecriture core", "Generation limitee"] },
    de: { name: "Kostenlos", period: "dauerhaft", description: "Betreten Sie das OS und starten Sie Ihr erstes Buch.", features: ["1 aktives Buch", "Bis 10.000 Worter", "Kern-Schreibstudio", "Begrenzte Generierung"] },
  },
  pro_monthly: {
    en: { name: "Pro", period: "/month", description: "For authors who write and publish seriously.", features: ["10 books per month", "Up to 80,000 words", "Full Book Engine", "EPUB, PDF, DOCX export"] },
    it: { name: "Pro", period: "/mese", description: "Per autori che scrivono e pubblicano sul serio.", features: ["10 libri al mese", "Fino a 80.000 parole", "Book Engine completo", "Export EPUB, PDF, DOCX"] },
    es: { name: "Pro", period: "/mes", description: "Para autores que escriben y publican en serio.", features: ["10 libros al mes", "Hasta 80.000 palabras", "Book Engine completo", "Export EPUB, PDF, DOCX"] },
    fr: { name: "Pro", period: "/mois", description: "Pour auteurs qui ecrivent et publient serieusement.", features: ["10 livres par mois", "Jusqu'a 80 000 mots", "Book Engine complet", "Export EPUB, PDF, DOCX"] },
    de: { name: "Pro", period: "/Monat", description: "Fur Autoren, die ernsthaft schreiben und veroffentlichen.", features: ["10 Bucher pro Monat", "Bis 80.000 Worter", "Voller Book Engine", "EPUB, PDF, DOCX Export"] },
  },
  premium_monthly: {
    en: { name: "Premium", period: "/month", description: "Full creative and market layer for power authors.", features: ["Unlimited books with fair use", "Up to 200,000 words", "Advanced KDP analysis", "Priority support"] },
    it: { name: "Premium", period: "/mese", description: "Livello creativo e mercato completo per autori power user.", features: ["Libri illimitati con fair use", "Fino a 200.000 parole", "Analisi KDP avanzata", "Supporto prioritario"] },
    es: { name: "Premium", period: "/mes", description: "Capa creativa y mercado completa para autores avanzados.", features: ["Libros ilimitados con fair use", "Hasta 200.000 palabras", "Analisis KDP avanzado", "Soporte prioritario"] },
    fr: { name: "Premium", period: "/mois", description: "Couche creative et marche complete pour auteurs exigeants.", features: ["Livres illimites avec fair use", "Jusqu'a 200 000 mots", "Analyse KDP avancee", "Support prioritaire"] },
    de: { name: "Premium", period: "/Monat", description: "Volle Kreativ- und Marktebene fur Power-Autoren.", features: ["Unbegrenzte Bucher mit Fair Use", "Bis 200.000 Worter", "Erweiterte KDP-Analyse", "Priorisierter Support"] },
  },
};

export const landingFooterCopy: Record<
  UILanguage,
  {
    productTitle: string;
    legalTitle: string;
    companyTitle: string;
    privacy: string;
    terms: string;
    cookies: string;
    contact: string;
    demo: string;
    pricing: string;
    systems: string;
    testimonials: string;
    tagline: string;
    allRights: string;
    legalDocs: string;
    cookieNote: string;
  }
> = {
  en: {
    productTitle: "Product",
    legalTitle: "Legal",
    companyTitle: "Company",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookie Policy",
    contact: "Contact",
    demo: "Live demo",
    pricing: "Pricing",
    systems: "Systems",
    testimonials: "Testimonials",
    tagline: "The author operating system — write, improve, publish.",
    allRights: "All rights reserved.",
    legalDocs: "Legal documents updated",
    cookieNote: "We use essential cookies for auth and preferences.",
  },
  it: {
    productTitle: "Prodotto",
    legalTitle: "Legale",
    companyTitle: "Azienda",
    privacy: "Privacy Policy",
    terms: "Termini di utilizzo",
    cookies: "Cookie Policy",
    contact: "Contatti",
    demo: "Demo live",
    pricing: "Prezzi",
    systems: "Sistemi",
    testimonials: "Testimonianze",
    tagline: "Il sistema operativo per autori — scrivi, migliora, pubblica.",
    allRights: "Tutti i diritti riservati.",
    legalDocs: "Documenti legali aggiornati al",
    cookieNote: "Utilizziamo cookie essenziali per autenticazione e preferenze.",
  },
  es: {
    productTitle: "Producto",
    legalTitle: "Legal",
    companyTitle: "Empresa",
    privacy: "Politica de privacidad",
    terms: "Terminos de uso",
    cookies: "Politica de cookies",
    contact: "Contacto",
    demo: "Demo en vivo",
    pricing: "Precios",
    systems: "Sistemas",
    testimonials: "Testimonios",
    tagline: "El sistema operativo para autores — escribe, mejora, publica.",
    allRights: "Todos los derechos reservados.",
    legalDocs: "Documentos legales actualizados",
    cookieNote: "Usamos cookies esenciales para autenticacion y preferencias.",
  },
  fr: {
    productTitle: "Produit",
    legalTitle: "Legal",
    companyTitle: "Entreprise",
    privacy: "Politique de confidentialite",
    terms: "Conditions d'utilisation",
    cookies: "Politique cookies",
    contact: "Contact",
    demo: "Demo live",
    pricing: "Tarifs",
    systems: "Systemes",
    testimonials: "Temoignages",
    tagline: "Le systeme d'exploitation auteur — ecrire, ameliorer, publier.",
    allRights: "Tous droits reserves.",
    legalDocs: "Documents legaux mis a jour le",
    cookieNote: "Cookies essentiels pour auth et preferences.",
  },
  de: {
    productTitle: "Produkt",
    legalTitle: "Rechtliches",
    companyTitle: "Unternehmen",
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    cookies: "Cookie-Richtlinie",
    contact: "Kontakt",
    demo: "Live-Demo",
    pricing: "Preise",
    systems: "Systeme",
    testimonials: "Stimmen",
    tagline: "Das Autoren-Betriebssystem — schreiben, verbessern, veroffentlichen.",
    allRights: "Alle Rechte vorbehalten.",
    legalDocs: "Rechtstexte aktualisiert am",
    cookieNote: "Essenzielle Cookies fur Auth und Einstellungen.",
  },
};
