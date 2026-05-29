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
    heroSub: "The complete operating system for modern authors.",
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
    demoTitle: "See the real workspace.",
    demoText: "Real screenshots from Scriptora — not mockups. Dashboard, editor, diagnostics, cover direction and market intelligence in one flow.",
    audienceLabel: "Built for",
    audienceTitle: "Authors who publish for real.",
    testimonialsLabel: "Author voices",
    testimonialsTitle: "Trusted by writers building real books.",
    testimonialsText: "Premium layout ready for verified author stories. No stock photos. No fabricated quotes.",
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
    heroSub: "Il sistema operativo completo per autori moderni.",
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
    demoTitle: "Vedi il workspace vero.",
    demoText: "Screenshot reali da Scriptora — non mockup. Dashboard, editor, diagnostica, cover e market intelligence in un unico flusso.",
    audienceLabel: "Pensato per",
    audienceTitle: "Autori che pubblicano sul serio.",
    testimonialsLabel: "Voci autore",
    testimonialsTitle: "Costruito per chi scrive libri veri.",
    testimonialsText: "Layout premium pronto per testimonianze verificate. Niente stock. Niente quote inventate.",
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
    heroSub: "El sistema operativo completo para autores modernos.",
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
    demoTitle: "Mira el workspace real.",
    demoText: "Capturas reales de Scriptora — no mockups. Dashboard, editor, diagnostica, cover y market intelligence en un flujo.",
    audienceLabel: "Hecho para",
    audienceTitle: "Autores que publican de verdad.",
    testimonialsLabel: "Voces autor",
    testimonialsTitle: "Hecho para quienes construyen libros reales.",
    testimonialsText: "Layout premium listo para testimonios verificados. Sin stock. Sin citas falsas.",
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
    heroSub: "Le systeme d'exploitation complet pour auteurs modernes.",
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
    demoTitle: "Voyez le vrai workspace.",
    demoText: "Captures reelles de Scriptora — pas de mockups. Dashboard, editeur, diagnostics, cover et market intelligence en un flux.",
    audienceLabel: "Concu pour",
    audienceTitle: "Les auteurs qui publient pour de vrai.",
    testimonialsLabel: "Voix auteur",
    testimonialsTitle: "Concu pour ceux qui construisent de vrais livres.",
    testimonialsText: "Layout premium pret pour temoignages verifies. Pas de stock. Pas de citations fabriquees.",
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
    heroSub: "Das komplette Betriebssystem fur moderne Autoren.",
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
    demoTitle: "Sehen Sie den echten Workspace.",
    demoText: "Echte Screenshots aus Scriptora — keine Mockups. Dashboard, Editor, Diagnostik, Cover und Market Intelligence in einem Fluss.",
    audienceLabel: "Gebaut fur",
    audienceTitle: "Autoren, die wirklich veroffentlichen.",
    testimonialsLabel: "Autorenstimmen",
    testimonialsTitle: "Gebaut fur Autoren echter Bucher.",
    testimonialsText: "Premium-Layout bereit fur verifizierte Geschichten. Kein Stock. Keine erfundenen Zitate.",
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
