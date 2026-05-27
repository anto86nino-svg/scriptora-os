import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Crown,
  FileDown,
  Fingerprint,
  Flame,
  Globe2,
  ImagePlus,
  Layers3,
  Library,
  PenLine,
  Rocket,
  Search,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { paymentsConfig } from "@/config/payments";
import { setUILanguage, UI_LANGUAGES, useUILanguage, type UILanguage } from "@/lib/i18n";

interface ScriptoraLandingProps {
  mounted: boolean;
  devOn: boolean;
  canStart: boolean;
  isSignedIn: boolean;
  onEnter: () => void;
  onLogoClick: () => void;
}

type AppPreviewVariant = "dashboard" | "character" | "writer" | "publishing";
type LocalizedText = Record<UILanguage, string>;

const L = (value: LocalizedText, lang: UILanguage) => value[lang] ?? value.en;

const landingCopy: Record<UILanguage, {
  navHow: string;
  navTools: string;
  navPricing: string;
  enter: string;
  languageLabel: string;
  kicker: string;
  heroTitle: string;
  heroText: string;
  primary: string;
  secondary: string;
  proofSigned: string;
  proofGuest: string;
  proofConsentReady: string;
  proofConsentNeeded: string;
  proofStable: string;
  manifestoLabel: string;
  manifestoTitle: string;
  manifestoLines: string[];
  howLabel: string;
  howTitle: string;
  howText: string;
  workflowLabel: string;
  ecosystemLabel: string;
  writerLabel: string;
  writerTitle: string;
  writerText: string;
  livePreview: string;
  chapterMemory: string;
  liveTitle: string;
  liveText: string;
  pricingLabel: string;
  pricingTitle: string;
  pricingText: string;
  testimonialsLabel: string;
  testimonialsTitle: string;
  testimonialsText: string;
  finalTitle: string;
  finalText: string;
}> = {
  en: {
    navHow: "How it works",
    navTools: "Tools",
    navPricing: "Plans",
    enter: "Enter",
    languageLabel: "Interface language",
    kicker: "Where fragile ideas become books",
    heroTitle: "Not a chatbot. An Author OS.",
    heroText: "A private writing system that remembers the thread: voice, chapters, market, cover and export moving as one book.",
    primary: "Enter Scriptora OS",
    secondary: "See the system",
    proofSigned: "Your workspace is waiting",
    proofGuest: "Real login. Real workspace.",
    proofConsentReady: "Ready to enter",
    proofConsentNeeded: "Consent first. Then the OS.",
    proofStable: "Dashboard, generation and export stay protected",
    manifestoLabel: "Manifesto",
    manifestoTitle: "Ideas are fragile. Systems endure.",
    manifestoLines: [
      "Scriptora is not another place to ask for text.",
      "It is the place where a book keeps its memory: author voice, canon, chapters, revisions and market direction.",
      "You do not chase the story across tools. You enter the OS and the book stays with you.",
    ],
    howLabel: "How to use Scriptora",
    howTitle: "Build the world. Keep direction. Finish the book.",
    howText: "A calm author flow built from the real Scriptora workspace: identity, canon, writing, analysis, cover, KDP signals and export.",
    workflowLabel: "Author flow",
    ecosystemLabel: "Tools inside Scriptora",
    writerLabel: "Writer Studio",
    writerTitle: "The page moves. The story remembers.",
    writerText: "Inside the protected workspace, chapters are written with continuity, pressure, author identity and editorial memory always in view.",
    livePreview: "Living manuscript",
    chapterMemory: "Continuity locked",
    liveTitle: "The Cathedral of Forgotten Souls",
    liveText: "Every secret has a price. Every soul demands its debt. Scriptora keeps the scene under pressure without losing the book's direction.",
    pricingLabel: "Plans",
    pricingTitle: "Start small. Keep the system. Scale the library.",
    pricingText: "Choose the room you need now. The same Scriptora OS grows with the author, the manuscript and the market.",
    testimonialsLabel: "Author stories",
    testimonialsTitle: "Built for writers who refuse to lose the thread.",
    testimonialsText: "Short field notes from authors who use Scriptora as a creative cockpit: voice, structure and publishing preparation in one place.",
    finalTitle: "Your book is already calling. Give it a system.",
    finalText: "Enter the workspace where ideas stop drifting and start becoming manuscripts, covers, metadata and finished books.",
  },
  it: {
    navHow: "Come funziona",
    navTools: "Strumenti",
    navPricing: "Piani",
    enter: "Entra",
    languageLabel: "Lingua interfaccia",
    kicker: "Dove le idee fragili diventano libri",
    heroTitle: "Non un chatbot. Un Author OS.",
    heroText: "Un sistema privato di scrittura che ricorda il filo: voce, capitoli, mercato, copertina ed export avanzano come un solo libro.",
    primary: "Entra in Scriptora OS",
    secondary: "Vedi il sistema",
    proofSigned: "Il tuo workspace ti aspetta",
    proofGuest: "Login reale. Workspace reale.",
    proofConsentReady: "Pronto per entrare",
    proofConsentNeeded: "Prima consenso. Poi l'OS.",
    proofStable: "Dashboard, generazione ed export restano protetti",
    manifestoLabel: "Manifesto",
    manifestoTitle: "Le idee sono fragili. I sistemi resistono.",
    manifestoLines: [
      "Scriptora non e un altro posto dove chiedere testo.",
      "E il luogo in cui un libro conserva memoria: voce autore, canone, capitoli, revisioni e direzione di mercato.",
      "Non insegui la storia tra strumenti sparsi. Entri nell'OS e il libro resta con te.",
    ],
    howLabel: "Come usare Scriptora",
    howTitle: "Costruisci il mondo. Mantieni la direzione. Finisci il libro.",
    howText: "Un flusso autore calmo, costruito sul workspace reale di Scriptora: identita, canone, scrittura, analisi, cover, segnali KDP ed export.",
    workflowLabel: "Flusso autore",
    ecosystemLabel: "Strumenti dentro Scriptora",
    writerLabel: "Writer Studio",
    writerTitle: "La pagina avanza. La storia ricorda.",
    writerText: "Dentro il workspace protetto, i capitoli vengono scritti con continuita, pressione narrativa, identita autore e memoria editoriale sempre visibili.",
    livePreview: "Manoscritto vivo",
    chapterMemory: "Continuita fissata",
    liveTitle: "La Cattedrale delle Anime Dimenticate",
    liveText: "Ogni segreto ha un prezzo. Ogni anima reclama il suo debito. Scriptora mantiene la scena in tensione senza perdere la direzione del libro.",
    pricingLabel: "Piani",
    pricingTitle: "Inizia leggero. Tieni il sistema. Fai crescere la libreria.",
    pricingText: "Scegli lo spazio che ti serve ora. Lo stesso Scriptora OS cresce con l'autore, il manoscritto e il mercato.",
    testimonialsLabel: "Storie autore",
    testimonialsTitle: "Creato per autori che non vogliono perdere il filo.",
    testimonialsText: "Appunti brevi da chi usa Scriptora come cabina creativa: voce, struttura e preparazione editoriale nello stesso luogo.",
    finalTitle: "Il tuo libro sta gia chiamando. Dagli un sistema.",
    finalText: "Entra nel workspace dove le idee smettono di disperdersi e diventano manoscritti, copertine, metadata e libri finiti.",
  },
  es: {
    navHow: "Como funciona",
    navTools: "Herramientas",
    navPricing: "Planes",
    enter: "Entrar",
    languageLabel: "Idioma de interfaz",
    kicker: "Donde las ideas fragiles se vuelven libros",
    heroTitle: "No es un chatbot. Es un Author OS.",
    heroText: "Un sistema privado de escritura que recuerda el hilo: voz, capitulos, mercado, portada y export avanzando como un solo libro.",
    primary: "Entrar en Scriptora OS",
    secondary: "Ver el sistema",
    proofSigned: "Tu workspace te espera",
    proofGuest: "Login real. Workspace real.",
    proofConsentReady: "Listo para entrar",
    proofConsentNeeded: "Primero consentimiento. Luego el OS.",
    proofStable: "Dashboard, generacion y export siguen protegidos",
    manifestoLabel: "Manifiesto",
    manifestoTitle: "Las ideas son fragiles. Los sistemas perduran.",
    manifestoLines: [
      "Scriptora no es otro lugar para pedir texto.",
      "Es el lugar donde un libro conserva memoria: voz de autor, canon, capitulos, revisiones y direccion de mercado.",
      "No persigues la historia entre herramientas dispersas. Entras al OS y el libro se queda contigo.",
    ],
    howLabel: "Como usar Scriptora",
    howTitle: "Construye el mundo. Mantiene direccion. Termina el libro.",
    howText: "Un flujo de autor calmado basado en el workspace real de Scriptora: identidad, canon, escritura, analisis, portada, senales KDP y export.",
    workflowLabel: "Flujo de autor",
    ecosystemLabel: "Herramientas dentro de Scriptora",
    writerLabel: "Writer Studio",
    writerTitle: "La pagina avanza. La historia recuerda.",
    writerText: "Dentro del workspace protegido, los capitulos se escriben con continuidad, presion narrativa, identidad de autor y memoria editorial siempre visibles.",
    livePreview: "Manuscrito vivo",
    chapterMemory: "Continuidad fijada",
    liveTitle: "La Catedral de las Almas Olvidadas",
    liveText: "Cada secreto tiene un precio. Cada alma reclama su deuda. Scriptora mantiene la escena en tension sin perder la direccion del libro.",
    pricingLabel: "Planes",
    pricingTitle: "Empieza ligero. Conserva el sistema. Haz crecer la biblioteca.",
    pricingText: "Elige el espacio que necesitas ahora. El mismo Scriptora OS crece con el autor, el manuscrito y el mercado.",
    testimonialsLabel: "Historias de autores",
    testimonialsTitle: "Creado para autores que se niegan a perder el hilo.",
    testimonialsText: "Notas breves de quienes usan Scriptora como cabina creativa: voz, estructura y preparacion editorial en un solo lugar.",
    finalTitle: "Tu libro ya esta llamando. Dale un sistema.",
    finalText: "Entra al workspace donde las ideas dejan de dispersarse y se convierten en manuscritos, portadas, metadata y libros terminados.",
  },
  fr: {
    navHow: "Fonctionnement",
    navTools: "Outils",
    navPricing: "Offres",
    enter: "Entrer",
    languageLabel: "Langue interface",
    kicker: "La ou les idees fragiles deviennent livres",
    heroTitle: "Pas un chatbot. Un Author OS.",
    heroText: "Un systeme prive d'ecriture qui garde le fil: voix, chapitres, marche, couverture et export avancent comme un seul livre.",
    primary: "Entrer dans Scriptora OS",
    secondary: "Voir le systeme",
    proofSigned: "Votre workspace vous attend",
    proofGuest: "Login reel. Workspace reel.",
    proofConsentReady: "Pret a entrer",
    proofConsentNeeded: "Consentement d'abord. Puis l'OS.",
    proofStable: "Dashboard, generation et export restent proteges",
    manifestoLabel: "Manifeste",
    manifestoTitle: "Les idees sont fragiles. Les systemes durent.",
    manifestoLines: [
      "Scriptora n'est pas un autre endroit ou demander du texte.",
      "C'est le lieu ou un livre garde sa memoire: voix auteur, canon, chapitres, revisions et direction marche.",
      "Vous ne poursuivez pas l'histoire entre des outils disperses. Vous entrez dans l'OS et le livre reste avec vous.",
    ],
    howLabel: "Comment utiliser Scriptora",
    howTitle: "Construisez le monde. Gardez la direction. Terminez le livre.",
    howText: "Un flux auteur calme construit sur le vrai workspace Scriptora: identite, canon, ecriture, analyse, couverture, signaux KDP et export.",
    workflowLabel: "Flux auteur",
    ecosystemLabel: "Outils dans Scriptora",
    writerLabel: "Writer Studio",
    writerTitle: "La page avance. L'histoire se souvient.",
    writerText: "Dans le workspace protege, les chapitres s'ecrivent avec continuite, tension narrative, identite auteur et memoire editoriale visibles.",
    livePreview: "Manuscrit vivant",
    chapterMemory: "Continuite verrouillee",
    liveTitle: "La Cathedrale des Ames Oubliees",
    liveText: "Chaque secret a un prix. Chaque ame reclame sa dette. Scriptora garde la scene sous tension sans perdre la direction du livre.",
    pricingLabel: "Offres",
    pricingTitle: "Commencez leger. Gardez le systeme. Faites grandir la bibliotheque.",
    pricingText: "Choisissez l'espace dont vous avez besoin maintenant. Le meme Scriptora OS evolue avec l'auteur, le manuscrit et le marche.",
    testimonialsLabel: "Histoires d'auteurs",
    testimonialsTitle: "Cree pour les auteurs qui refusent de perdre le fil.",
    testimonialsText: "Notes courtes de celles et ceux qui utilisent Scriptora comme cockpit creatif: voix, structure et preparation editoriale au meme endroit.",
    finalTitle: "Votre livre appelle deja. Donnez-lui un systeme.",
    finalText: "Entrez dans le workspace ou les idees cessent de se disperser et deviennent manuscrits, couvertures, metadata et livres finis.",
  },
  de: {
    navHow: "So funktioniert es",
    navTools: "Werkzeuge",
    navPricing: "Tarife",
    enter: "Starten",
    languageLabel: "Oberflachensprache",
    kicker: "Wo fragile Ideen zu Buchern werden",
    heroTitle: "Kein Chatbot. Ein Author OS.",
    heroText: "Ein privates Schreibsystem, das den Faden halt: Stimme, Kapitel, Markt, Cover und Export bewegen sich wie ein Buch.",
    primary: "Scriptora OS starten",
    secondary: "System ansehen",
    proofSigned: "Dein Workspace wartet",
    proofGuest: "Echter Login. Echter Workspace.",
    proofConsentReady: "Bereit zum Eintritt",
    proofConsentNeeded: "Erst Einwilligung. Dann das OS.",
    proofStable: "Dashboard, Generierung und Export bleiben geschutzt",
    manifestoLabel: "Manifest",
    manifestoTitle: "Ideen sind fragil. Systeme bleiben.",
    manifestoLines: [
      "Scriptora ist nicht noch ein Ort, um Text anzufordern.",
      "Es ist der Ort, an dem ein Buch sein Gedachtnis behalt: Autorenstimme, Kanon, Kapitel, Revisionen und Marktrichtung.",
      "Du jagst die Geschichte nicht durch verstreute Tools. Du betrittst das OS und das Buch bleibt bei dir.",
    ],
    howLabel: "So nutzt du Scriptora",
    howTitle: "Welt bauen. Richtung halten. Buch beenden.",
    howText: "Ein ruhiger Autorenfluss aus dem echten Scriptora Workspace: Identitat, Kanon, Schreiben, Analyse, Cover, KDP Signale und Export.",
    workflowLabel: "Autorenfluss",
    ecosystemLabel: "Werkzeuge in Scriptora",
    writerLabel: "Writer Studio",
    writerTitle: "Die Seite bewegt sich. Die Geschichte erinnert sich.",
    writerText: "Im geschutzten Workspace entstehen Kapitel mit Kontinuitat, Szenendruck, Autorenidentitat und redaktionellem Gedachtnis.",
    livePreview: "Lebendes Manuskript",
    chapterMemory: "Kontinuitat fixiert",
    liveTitle: "Die Kathedrale der Vergessenen Seelen",
    liveText: "Jedes Geheimnis hat einen Preis. Jede Seele fordert ihre Schuld. Scriptora halt die Szene unter Spannung, ohne die Buchrichtung zu verlieren.",
    pricingLabel: "Tarife",
    pricingTitle: "Klein starten. System behalten. Bibliothek wachsen lassen.",
    pricingText: "Wahle den Raum, den du jetzt brauchst. Dasselbe Scriptora OS wachst mit Autor, Manuskript und Markt.",
    testimonialsLabel: "Autorenstimmen",
    testimonialsTitle: "Gebaut fur Autoren, die den Faden nicht verlieren wollen.",
    testimonialsText: "Kurze Notizen von Menschen, die Scriptora als kreatives Cockpit nutzen: Stimme, Struktur und Publishing-Vorbereitung an einem Ort.",
    finalTitle: "Dein Buch ruft bereits. Gib ihm ein System.",
    finalText: "Betritt den Workspace, in dem Ideen aufhoren zu driften und zu Manuskripten, Covern, Metadaten und fertigen Buchern werden.",
  },
};

const workflow = [
  {
    step: "01",
    title: { en: "Catch the signal", it: "Cattura il segnale", es: "Captura la senal", fr: "Captez le signal", de: "Signal fangen" },
    text: { en: "The first spark becomes a brief with genre, promise and reader gravity.", it: "La prima scintilla diventa un brief con genere, promessa e gravita del lettore.", es: "La primera chispa se vuelve brief con genero, promesa y gravedad lectora.", fr: "La premiere etincelle devient un brief avec genre, promesse et gravite lecteur.", de: "Der erste Funke wird zum Briefing mit Genre, Versprechen und Leserzug." },
  },
  {
    step: "02",
    title: { en: "Lock the canon", it: "Blocca il canone", es: "Bloquea el canon", fr: "Verrouillez le canon", de: "Kanon sperren" },
    text: { en: "Characters, names, wounds and continuity are fixed before the page starts moving.", it: "Personaggi, nomi, ferite e continuita vengono fissati prima che la pagina si muova.", es: "Personajes, nombres, heridas y continuidad se fijan antes de mover la pagina.", fr: "Personnages, noms, blessures et continuite se fixent avant que la page bouge.", de: "Figuren, Namen, Wunden und Kontinuitat stehen, bevor die Seite sich bewegt." },
  },
  {
    step: "03",
    title: { en: "Write with memory", it: "Scrivi con memoria", es: "Escribe con memoria", fr: "Ecrivez avec memoire", de: "Mit Gedachtnis schreiben" },
    text: { en: "Chapters advance with live text, scene pressure and the story thread intact.", it: "I capitoli avanzano con testo vivo, pressione di scena e filo narrativo intatto.", es: "Los capitulos avanzan con texto vivo, tension de escena e hilo intacto.", fr: "Les chapitres avancent avec texte vivant, tension de scene et fil intact.", de: "Kapitel laufen mit lebendem Text, Szenendruck und intaktem Faden." },
  },
  {
    step: "04",
    title: { en: "Prepare the shelf", it: "Prepara lo scaffale", es: "Prepara el estante", fr: "Preparez le rayon", de: "Regal vorbereiten" },
    text: { en: "Title, KDP, keywords, cover and export stay aligned until the book is ready.", it: "Titolo, KDP, keyword, cover ed export restano allineati fino al libro pronto.", es: "Titulo, KDP, keywords, portada y export quedan alineados hasta el libro listo.", fr: "Titre, KDP, mots-cles, couverture et export restent alignes jusqu'au livre pret.", de: "Titel, KDP, Keywords, Cover und Export bleiben bis zum fertigen Buch ausgerichtet." },
  },
];

const useGuide = [
  {
    step: "01",
    icon: Layers3,
    title: { en: "Enter the control room", it: "Entra nella cabina", es: "Entra a la cabina", fr: "Entrez dans le cockpit", de: "Kontrollraum offnen" },
    text: { en: "Choose author identity and let every project inherit the right creative voice.", it: "Scegli l'identita autore e lascia che ogni progetto erediti la voce giusta.", es: "Elige identidad de autor y deja que cada proyecto herede la voz correcta.", fr: "Choisissez l'identite auteur et chaque projet herite de la bonne voix.", de: "Wahle die Autorenidentitat, damit jedes Projekt die richtige Stimme erbt." },
    screen: "dashboard" as AppPreviewVariant,
    badge: "Dashboard",
  },
  {
    step: "02",
    icon: Users,
    title: { en: "Shape the canon", it: "Dai forma al canone", es: "Da forma al canon", fr: "Donnez forme au canon", de: "Kanon formen" },
    text: { en: "Create idea, cast, tone and promise before the manuscript learns its rules.", it: "Crea idea, cast, tono e promessa prima che il manoscritto impari le sue regole.", es: "Crea idea, reparto, tono y promesa antes de que el manuscrito aprenda sus reglas.", fr: "Creez idee, personnages, ton et promesse avant que le manuscrit apprenne ses regles.", de: "Erstelle Idee, Figuren, Ton und Versprechen, bevor das Manuskript seine Regeln lernt." },
    screen: "character" as AppPreviewVariant,
    badge: "Character Studio",
  },
  {
    step: "03",
    icon: PenLine,
    title: { en: "Write without losing the thread", it: "Scrivi senza perdere il filo", es: "Escribe sin perder el hilo", fr: "Ecrivez sans perdre le fil", de: "Schreiben ohne Fadenverlust" },
    text: { en: "Generate chapters, read the living preview, detect weak points and rewrite with intent.", it: "Genera capitoli, leggi l'anteprima viva, individua i punti deboli e riscrivi con intenzione.", es: "Genera capitulos, lee la vista viva, detecta puntos debiles y reescribe con intencion.", fr: "Generez les chapitres, lisez l'apercu vivant, detectez les faiblesses et reecrivez avec intention.", de: "Generiere Kapitel, lies die lebende Vorschau, erkenne Schwachen und schreibe gezielt um." },
    screen: "writer" as AppPreviewVariant,
    badge: "Writer Studio",
  },
  {
    step: "04",
    icon: Rocket,
    title: { en: "Move toward the market", it: "Avvicinati al mercato", es: "Avanza hacia el mercado", fr: "Avancez vers le marche", de: "Zum Markt bewegen" },
    text: { en: "Cover, KDP, keywords, metadata and export stay around the same creative core.", it: "Cover, KDP, keyword, metadata ed export restano attorno allo stesso nucleo creativo.", es: "Portada, KDP, keywords, metadata y export rodean el mismo nucleo creativo.", fr: "Couverture, KDP, mots-cles, metadata et export restent autour du meme noyau creatif.", de: "Cover, KDP, Keywords, Metadaten und Export bleiben um denselben kreativen Kern." },
    screen: "publishing" as AppPreviewVariant,
    badge: "Publishing OS",
  },
];

const systems = [
  {
    eyebrow: "Writer OS",
    title: { en: "Stop losing the thread of your story.", it: "Smetti di perdere il filo della storia.", es: "Deja de perder el hilo de tu historia.", fr: "Ne perdez plus le fil de votre histoire.", de: "Verliere den Faden deiner Geschichte nicht mehr." },
    text: { en: "Writer Studio, Character Studio, Analyzer and Rewrite Studio keep the manuscript in one creative cockpit.", it: "Writer Studio, Character Studio, Analyzer e Rewrite Studio tengono il manoscritto in una sola cabina creativa.", es: "Writer Studio, Character Studio, Analyzer y Rewrite Studio mantienen el manuscrito en una cabina creativa.", fr: "Writer Studio, Character Studio, Analyzer et Rewrite Studio gardent le manuscrit dans un cockpit creatif.", de: "Writer Studio, Character Studio, Analyzer und Rewrite Studio halten das Manuskript in einem kreativen Cockpit." },
    tools: [
      { icon: PenLine, label: "Writer Studio" },
      { icon: Search, label: "Analyzer" },
      { icon: Wand2, label: "Rewrite Studio" },
      { icon: Users, label: "Character Studio" },
    ],
  },
  {
    eyebrow: "Bestseller OS",
    title: { en: "Give the book a place in the market.", it: "Dai al libro un posto nel mercato.", es: "Dale al libro un lugar en el mercado.", fr: "Donnez au livre une place sur le marche.", de: "Gib dem Buch einen Platz im Markt." },
    text: { en: "Title intelligence, keyword signals and KDP tools turn positioning into a deliberate layer.", it: "Title intelligence, segnali keyword e strumenti KDP trasformano il posizionamento in una scelta precisa.", es: "Title intelligence, senales keyword y KDP convierten el posicionamiento en una capa deliberada.", fr: "Title intelligence, signaux mots-cles et KDP transforment le positionnement en couche deliberee.", de: "Title Intelligence, Keyword-Signale und KDP machen Positionierung zu einer bewussten Ebene." },
    tools: [
      { icon: Flame, label: "Bestseller Engine" },
      { icon: Rocket, label: "KDP Intelligence" },
      { icon: Zap, label: "Title Domination" },
      { icon: BarChart3, label: "Keyword Gold" },
    ],
  },
  {
    eyebrow: "Publishing OS",
    title: { en: "Make the manuscript feel like a real book.", it: "Fai sentire il manoscritto come un vero libro.", es: "Haz que el manuscrito se sienta como un libro real.", fr: "Faites sentir le manuscrit comme un vrai livre.", de: "Lass das Manuskript wie ein echtes Buch wirken." },
    text: { en: "Cover, export, library and identity stay coherent from first page to final package.", it: "Cover, export, biblioteca e identita restano coerenti dalla prima pagina al pacchetto finale.", es: "Portada, export, biblioteca e identidad quedan coherentes de la primera pagina al paquete final.", fr: "Couverture, export, bibliotheque et identite restent coherents de la premiere page au package final.", de: "Cover, Export, Bibliothek und Identitat bleiben von der ersten Seite bis zum finalen Paket konsistent." },
    tools: [
      { icon: ImagePlus, label: "Cover Studio" },
      { icon: FileDown, label: "Export Studio" },
      { icon: Library, label: "Library" },
      { icon: Fingerprint, label: "Author Identity" },
    ],
  },
];

const previewCards = [
  { icon: BookOpen, label: "Writer Studio", text: { en: "Chapters that remember", it: "Capitoli che ricordano", es: "Capitulos que recuerdan", fr: "Chapitres qui se souviennent", de: "Kapitel mit Gedachtnis" } },
  { icon: Search, label: "Analyzer", text: { en: "Weak points become direction", it: "I punti deboli diventano direzione", es: "Los puntos debiles dan direccion", fr: "Les faiblesses deviennent direction", de: "Schwachen werden Richtung" } },
  { icon: Wand2, label: "Rewrite Studio", text: { en: "Emotion, rhythm, control", it: "Emozione, ritmo, controllo", es: "Emocion, ritmo, control", fr: "Emotion, rythme, controle", de: "Emotion, Rhythmus, Kontrolle" } },
  { icon: Rocket, label: "KDP Engine", text: { en: "Market signals, not guesses", it: "Segnali mercato, non intuito", es: "Senales de mercado, no intuicion", fr: "Signaux marche, pas intuition", de: "Marktsignale, nicht Raten" } },
  { icon: ImagePlus, label: "Cover Studio", text: { en: "A shelf-ready visual system", it: "Sistema visivo pronto scaffale", es: "Sistema visual listo para estante", fr: "Systeme visuel pret rayon", de: "Regalfertiges visuelles System" } },
  { icon: FileDown, label: "Export Studio", text: { en: "Formats ready to leave the OS", it: "Formati pronti a uscire dall'OS", es: "Formatos listos para salir del OS", fr: "Formats prets a sortir de l'OS", de: "Formate bereit fur den Export" } },
];

const productRoutes: Record<AppPreviewVariant, string> = {
  dashboard: "/dashboard",
  character: "/dashboard",
  writer: "/app",
  publishing: "/keyword-gold",
};

const productScreenshots: Record<AppPreviewVariant, string> = {
  dashboard: "/landing/screenshots/scriptora-dashboard.png",
  character: "/landing/screenshots/scriptora-character-studio.png",
  writer: "/landing/screenshots/scriptora-writer-studio.png",
  publishing: "/landing/screenshots/scriptora-kdp-tools.png",
};

const productTourVideo = "/landing/videos/scriptora-os-tour.webm";

const liveGenerationCopy = {
  label: { en: "Live generation", it: "Generazione live", es: "Generacion live", fr: "Generation live", de: "Live-Generierung" },
  title: {
    en: "Watch Scriptora write the book, chapter by chapter.",
    it: "Guarda Scriptora scrivere il libro, capitolo dopo capitolo.",
    es: "Mira a Scriptora escribir el libro, capitulo a capitulo.",
    fr: "Regardez Scriptora ecrire le livre, chapitre apres chapitre.",
    de: "Sieh, wie Scriptora das Buch Kapitel fur Kapitel schreibt.",
  },
  text: {
    en: "A live product scene: structure, canon, chapter text and progress move together inside the same author workspace.",
    it: "Una scena prodotto viva: struttura, canone, testo dei capitoli e progresso si muovono insieme nello stesso workspace autore.",
    es: "Una escena de producto viva: estructura, canon, texto de capitulos y progreso avanzan juntos en el mismo workspace de autor.",
    fr: "Une scene produit vivante: structure, canon, texte des chapitres et progression avancent ensemble dans le meme workspace auteur.",
    de: "Eine lebende Produktszene: Struktur, Kanon, Kapiteltext und Fortschritt bewegen sich im selben Autoren-Workspace.",
  },
  playerLabel: { en: "Scriptora live book generation demo", it: "Demo live generazione libro Scriptora", es: "Demo live de generacion de libro Scriptora", fr: "Demo live de generation de livre Scriptora", de: "Scriptora Live-Buchgenerierung Demo" },
  badge: { en: "Writing now", it: "Sta scrivendo", es: "Escribiendo", fr: "Ecriture en cours", de: "Schreibt gerade" },
  workspace: { en: "Writer Studio", it: "Writer Studio", es: "Writer Studio", fr: "Writer Studio", de: "Writer Studio" },
  bookTitle: { en: "The Cathedral of Forgotten Souls", it: "La Cattedrale delle Anime Dimenticate", es: "La Catedral de las Almas Olvidadas", fr: "La Cathedrale des Ames Oubliees", de: "Die Kathedrale der Vergessenen Seelen" },
  sceneLabel: { en: "Chapter 03", it: "Capitolo 03", es: "Capitulo 03", fr: "Chapitre 03", de: "Kapitel 03" },
  chapterTitle: { en: "The threshold remembers", it: "La soglia ricorda", es: "El umbral recuerda", fr: "Le seuil se souvient", de: "Die Schwelle erinnert sich" },
  inspectorTitle: { en: "Generation stack", it: "Stack generazione", es: "Stack generacion", fr: "Stack generation", de: "Generierungsstack" },
  memoryLock: { en: "Canon locked", it: "Canone bloccato", es: "Canon bloqueado", fr: "Canon verrouille", de: "Kanon gesperrt" },
  continuity: { en: "Continuity", it: "Continuita", es: "Continuidad", fr: "Continuite", de: "Kontinuitat" },
  quality: { en: "Quality", it: "Qualita", es: "Calidad", fr: "Qualite", de: "Qualitat" },
  words: { en: "words", it: "parole", es: "palabras", fr: "mots", de: "Worter" },
  chapters: [
    { label: { en: "Blueprint", it: "Blueprint", es: "Blueprint", fr: "Blueprint", de: "Blueprint" }, status: { en: "ready", it: "pronto", es: "listo", fr: "pret", de: "bereit" } },
    { label: { en: "Chapter 01", it: "Capitolo 01", es: "Capitulo 01", fr: "Chapitre 01", de: "Kapitel 01" }, status: { en: "written", it: "scritto", es: "escrito", fr: "ecrit", de: "geschrieben" } },
    { label: { en: "Chapter 02", it: "Capitolo 02", es: "Capitulo 02", fr: "Chapitre 02", de: "Kapitel 02" }, status: { en: "written", it: "scritto", es: "escrito", fr: "ecrit", de: "geschrieben" } },
    { label: { en: "Chapter 03", it: "Capitolo 03", es: "Capitulo 03", fr: "Chapitre 03", de: "Kapitel 03" }, status: { en: "live", it: "live", es: "live", fr: "live", de: "live" } },
    { label: { en: "Chapter 04", it: "Capitolo 04", es: "Capitulo 04", fr: "Chapitre 04", de: "Kapitel 04" }, status: { en: "queued", it: "in coda", es: "en cola", fr: "en file", de: "wartet" } },
  ],
  lines: [
    {
      en: "The nave held its breath while the portal learned her name.",
      it: "La navata trattenne il respiro mentre il portale imparava il suo nome.",
      es: "La nave contuvo el aliento mientras el portal aprendia su nombre.",
      fr: "La nef retenait son souffle pendant que le portail apprenait son nom.",
      de: "Das Kirchenschiff hielt den Atem an, wahrend das Portal ihren Namen lernte.",
    },
    {
      en: "Scriptora recalls the canon: same wounds, same promise, same cost.",
      it: "Scriptora richiama il canone: stesse ferite, stessa promessa, stesso prezzo.",
      es: "Scriptora recuerda el canon: mismas heridas, misma promesa, mismo precio.",
      fr: "Scriptora rappelle le canon: memes blessures, meme promesse, meme prix.",
      de: "Scriptora ruft den Kanon ab: dieselben Wunden, dasselbe Versprechen, derselbe Preis.",
    },
    {
      en: "The scene advances without losing the book: pressure, choice, consequence.",
      it: "La scena avanza senza perdere il libro: pressione, scelta, conseguenza.",
      es: "La escena avanza sin perder el libro: presion, eleccion, consecuencia.",
      fr: "La scene avance sans perdre le livre: pression, choix, consequence.",
      de: "Die Szene schreitet voran, ohne das Buch zu verlieren: Druck, Wahl, Folge.",
    },
  ],
  steps: [
    { en: "Book structure", it: "Struttura libro", es: "Estructura libro", fr: "Structure livre", de: "Buchstruktur" },
    { en: "Narrative memory", it: "Memoria narrativa", es: "Memoria narrativa", fr: "Memoire narrative", de: "Narratives Gedachtnis" },
    { en: "Chapter writing", it: "Scrittura capitolo", es: "Escritura capitulo", fr: "Ecriture chapitre", de: "Kapitel schreiben" },
    { en: "Cover and export ready", it: "Cover ed export pronti", es: "Portada y export listos", fr: "Couverture et export prets", de: "Cover und Export bereit" },
  ],
};

const testimonials = [
  {
    name: "Giulia Ferri",
    role: { en: "Romance author", it: "Autrice romance", es: "Autora romance", fr: "Autrice romance", de: "Romance-Autorin" },
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    quote: {
      en: "It felt less like opening a tool and more like entering the room where the book already knew what it wanted to become.",
      it: "Non sembrava di aprire un tool. Sembrava di entrare nella stanza dove il libro sapeva gia cosa voleva diventare.",
      es: "No se sintio como abrir una herramienta. Fue entrar en la sala donde el libro ya sabia en que queria convertirse.",
      fr: "Ce n'etait pas ouvrir un outil. C'etait entrer dans la piece ou le livre savait deja ce qu'il voulait devenir.",
      de: "Es fuhlte sich nicht wie ein Tool an, sondern wie der Raum, in dem das Buch schon wusste, was es werden will.",
    },
    metric: { en: "Story direction", it: "Direzione narrativa", es: "Direccion narrativa", fr: "Direction narrative", de: "Erzahlrichtung" },
  },
  {
    name: "Marco L.",
    role: { en: "Non-fiction creator", it: "Autore non-fiction", es: "Autor non-fiction", fr: "Auteur non-fiction", de: "Non-fiction Autor" },
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    quote: {
      en: "The voice stopped drifting. Every chapter felt like the same author returning to the desk with a sharper intention.",
      it: "La voce ha smesso di disperdersi. Ogni capitolo sembrava lo stesso autore che tornava alla scrivania con piu intenzione.",
      es: "La voz dejo de dispersarse. Cada capitulo parecia el mismo autor volviendo al escritorio con mas intencion.",
      fr: "La voix a cesse de se disperser. Chaque chapitre semblait le meme auteur revenant au bureau avec plus d'intention.",
      de: "Die Stimme driftete nicht mehr. Jedes Kapitel wirkte wie derselbe Autor, der mit klarerer Absicht zuruckkehrt.",
    },
    metric: { en: "Voice continuity", it: "Continuita di voce", es: "Continuidad de voz", fr: "Continuite de voix", de: "Stimmkontinuitat" },
  },
  {
    name: "Elena Ruiz",
    role: { en: "KDP publisher", it: "Publisher KDP", es: "Publisher KDP", fr: "Editeur KDP", de: "KDP Publisher" },
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    quote: {
      en: "For the first time, title, cover, keywords and export felt like parts of the same book instead of separate emergencies.",
      it: "Per la prima volta titolo, cover, keyword ed export sembravano parti dello stesso libro, non emergenze separate.",
      es: "Por primera vez titulo, portada, keywords y export parecieron partes del mismo libro, no urgencias separadas.",
      fr: "Pour la premiere fois, titre, couverture, mots-cles et export semblaient appartenir au meme livre, pas a des urgences separees.",
      de: "Zum ersten Mal wirkten Titel, Cover, Keywords und Export wie Teile desselben Buches, nicht wie einzelne Notfalle.",
    },
    metric: { en: "Publishing coherence", it: "Coerenza editoriale", es: "Coherencia editorial", fr: "Coherence editoriale", de: "Publishing-Koharenz" },
  },
];

const landingPlans: Record<string, Record<UILanguage, {
  name: string;
  description: string;
  period: string;
  features: string[];
}>> = {
  free: {
    en: { name: "Free", period: "forever", description: "Step inside the OS and start the first real book signal.", features: ["1 active book", "Up to 10,000 words", "Core book creation", "Limited chapter generation"] },
    it: { name: "Gratis", period: "per sempre", description: "Entra nell'OS e avvia il primo vero segnale libro.", features: ["1 libro attivo", "Fino a 10.000 parole", "Creazione libro essenziale", "Generazione capitoli limitata"] },
    es: { name: "Gratis", period: "para siempre", description: "Entra al OS y activa la primera senal real de libro.", features: ["1 libro activo", "Hasta 10.000 palabras", "Creacion libro esencial", "Generacion limitada"] },
    fr: { name: "Gratuit", period: "a vie", description: "Entrez dans l'OS et lancez le premier vrai signal livre.", features: ["1 livre actif", "Jusqu'a 10 000 mots", "Creation livre essentielle", "Generation limitee"] },
    de: { name: "Kostenlos", period: "dauerhaft", description: "Betritt das OS und starte das erste echte Buchsignal.", features: ["1 aktives Buch", "Bis 10.000 Worter", "Essenzielle Bucherstellung", "Begrenzte Kapitelgenerierung"] },
  },
  pro_monthly: {
    en: { name: "Pro", period: "/month", description: "For authors who want continuity, revision and export in one serious room.", features: ["10 books per month", "Up to 80,000 words", "Full Book Engine", "EPUB, PDF, DOCX export"] },
    it: { name: "Pro", period: "/mese", description: "Per autori che vogliono continuita, revisione ed export in una stanza seria.", features: ["10 libri al mese", "Fino a 80.000 parole", "Book Engine completo", "Export EPUB, PDF, DOCX"] },
    es: { name: "Pro", period: "/mes", description: "Para autores que quieren continuidad, revision y export en una sala seria.", features: ["10 libros al mes", "Hasta 80.000 palabras", "Book Engine completo", "Export EPUB, PDF, DOCX"] },
    fr: { name: "Pro", period: "/mois", description: "Pour auteurs qui veulent continuite, revision et export dans une piece serieuse.", features: ["10 livres par mois", "Jusqu'a 80 000 mots", "Book Engine complet", "Export EPUB, PDF, DOCX"] },
    de: { name: "Pro", period: "/Monat", description: "Fur Autoren, die Kontinuitat, Revision und Export in einem ernsten Raum wollen.", features: ["10 Bucher pro Monat", "Bis 80.000 Worter", "Voller Book Engine", "EPUB, PDF, DOCX Export"] },
  },
  premium_monthly: {
    en: { name: "Premium", period: "/month", description: "For authors and publishers who want the full creative and market layer.", features: ["Unlimited books with fair use", "Up to 200,000 words", "Advanced KDP analysis", "Priority support"] },
    it: { name: "Premium", period: "/mese", description: "Per autori ed editori che vogliono il livello creativo e mercato completo.", features: ["Libri illimitati con fair use", "Fino a 200.000 parole", "Analisi KDP avanzata", "Supporto prioritario"] },
    es: { name: "Premium", period: "/mes", description: "Para autores y editores que quieren la capa creativa y mercado completa.", features: ["Libros ilimitados con fair use", "Hasta 200.000 palabras", "Analisis KDP avanzado", "Soporte prioritario"] },
    fr: { name: "Premium", period: "/mois", description: "Pour auteurs et editeurs qui veulent la couche creative et marche complete.", features: ["Livres illimites avec fair use", "Jusqu'a 200 000 mots", "Analyse KDP avancee", "Support prioritaire"] },
    de: { name: "Premium", period: "/Monat", description: "Fur Autoren und Verlage mit voller Kreativ- und Marktebene.", features: ["Unbegrenzte Bucher mit Fair Use", "Bis 200.000 Worter", "Erweiterte KDP Analyse", "Priorisierter Support"] },
  },
};

export function ScriptoraLanding({
  mounted,
  devOn,
  canStart,
  isSignedIn,
  onEnter,
  onLogoClick,
}: ScriptoraLandingProps) {
  const lang = useUILanguage();
  const copy = landingCopy[lang] ?? landingCopy.en;
  const showLiveProduct = canStart && (isSignedIn || devOn);
  const primaryPlans = paymentsConfig.plans.filter((plan) =>
    ["free", "pro_monthly", "premium_monthly"].includes(plan.id),
  );

  return (
    <main className="scriptora-landing min-h-screen overflow-hidden bg-[#02030a] text-white">
      <div className="scriptora-landing-bg" aria-hidden="true" />

      <header className="scriptora-landing-nav">
        <button
          type="button"
          onClick={onLogoClick}
          className="scriptora-landing-brand"
          aria-label="SCRIPTORA"
          title="SCRIPTORA"
        >
          <span className="scriptora-landing-brand-mark">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Scriptora OS</span>
          {devOn && <span className="scriptora-landing-dev">DEV</span>}
        </button>

        <nav className="hidden items-center gap-6 text-xs font-semibold text-white/58 md:flex">
          <a href="#how-to-use">{copy.navHow}</a>
          <a href="#workflow">{copy.workflowLabel}</a>
          <a href="#ecosystem">{copy.navTools}</a>
          <a href="#testimonials">{copy.testimonialsLabel}</a>
          <a href="#pricing">{copy.navPricing}</a>
        </nav>

        <div className="scriptora-landing-actions">
          <label className="scriptora-landing-language" aria-label={copy.languageLabel}>
            <Globe2 className="h-3.5 w-3.5" />
            <select
              value={lang}
              onChange={(event) => setUILanguage(event.target.value as UILanguage)}
              aria-label={copy.languageLabel}
            >
              {UI_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onEnter} className="scriptora-landing-nav-cta">
            {copy.enter}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <section className="scriptora-landing-hero">
        <div
          className={`scriptora-landing-hero-copy transition-all duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="scriptora-landing-kicker">
            <span />
            {copy.kicker}
          </div>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroText}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onEnter} className="scriptora-landing-primary">
              {copy.primary}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#preview" className="scriptora-landing-secondary">
              {copy.secondary}
            </a>
          </div>
          <div className="scriptora-landing-proof">
            <span>{isSignedIn ? copy.proofSigned : copy.proofGuest}</span>
            <span>{canStart ? copy.proofConsentReady : copy.proofConsentNeeded}</span>
            <span>{copy.proofStable}</span>
          </div>
        </div>

        <div
          className={`scriptora-landing-hero-visual transition-all delay-150 duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          id="preview"
        >
          <div className="scriptora-product-stage">
            <DashboardPreview lang={lang} live={showLiveProduct} />
          </div>
        </div>
      </section>

      <section id="live-generation" className="scriptora-landing-section scriptora-live-generation-section">
        <div className="scriptora-live-generation-header">
          <div>
            <div className="scriptora-landing-section-label">{L(liveGenerationCopy.label, lang)}</div>
            <h2>{L(liveGenerationCopy.title, lang)}</h2>
          </div>
          <p>{L(liveGenerationCopy.text, lang)}</p>
        </div>
        <LiveGenerationVideo lang={lang} />
      </section>

      <section id="manifesto" className="scriptora-landing-section">
        <div className="scriptora-landing-section-label">{copy.manifestoLabel}</div>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <h2>{copy.manifestoTitle}</h2>
          <div className="space-y-4 text-lg leading-8 text-white/66">
            {copy.manifestoLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to-use" className="scriptora-landing-section scriptora-use-section">
        <div className="scriptora-landing-section-label">{copy.howLabel}</div>
        <div className="scriptora-use-header">
          <h2>{copy.howTitle}</h2>
          <p>{copy.howText}</p>
        </div>
        <div className="scriptora-use-grid">
          {useGuide.map((item) => (
            <article key={item.step} className="scriptora-use-card">
              <div className="scriptora-use-image">
                <ProductPreview variant={item.screen} lang={lang} live={showLiveProduct} compact />
                <span>{item.badge}</span>
              </div>
              <div className="scriptora-use-body">
                <div className="scriptora-use-step">
                  <span>{item.step}</span>
                  <item.icon className="h-4 w-4" />
                </div>
                <h3>{L(item.title, lang)}</h3>
                <p>{L(item.text, lang)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="scriptora-landing-section">
        <div className="scriptora-landing-section-label">{copy.workflowLabel}</div>
        <div className="scriptora-workflow-grid">
          {workflow.map((item) => (
            <article key={item.step} className="scriptora-workflow-card">
              <span>{item.step}</span>
              <h3>{L(item.title, lang)}</h3>
              <p>{L(item.text, lang)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ecosystem" className="scriptora-landing-section">
        <div className="scriptora-landing-section-label">{copy.ecosystemLabel}</div>
        <div className="space-y-5">
          {systems.map((system) => (
            <article key={system.eyebrow} className="scriptora-system-row">
              <div>
                <p>{system.eyebrow}</p>
                <h3>{L(system.title, lang)}</h3>
                <span>{L(system.text, lang)}</span>
              </div>
              <div className="scriptora-system-tools">
                {system.tools.map((tool) => (
                  <span key={tool.label}>
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="testimonials" className="scriptora-landing-section scriptora-testimonials-section">
        <div className="scriptora-landing-section-label">{copy.testimonialsLabel}</div>
        <div className="scriptora-testimonials-header">
          <h2>{copy.testimonialsTitle}</h2>
          <p>{copy.testimonialsText}</p>
        </div>
        <div className="scriptora-testimonials-grid">
          {testimonials.map((item) => (
            <article key={item.name} className="scriptora-testimonial-card">
              <div className="scriptora-testimonial-person">
                <img src={item.photo} alt={item.name} loading="lazy" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{L(item.role, lang)}</span>
                </div>
              </div>
              <p>{L(item.quote, lang)}</p>
              <div className="scriptora-testimonial-metric">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {L(item.metric, lang)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="scriptora-landing-section">
        <div className="scriptora-landing-split">
          <div>
            <div className="scriptora-landing-section-label">{copy.writerLabel}</div>
            <h2>{copy.writerTitle}</h2>
            <p>{copy.writerText}</p>
          </div>
          <div className="scriptora-live-demo">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-white/52">
              <span>{copy.livePreview}</span>
              <span>{copy.chapterMemory}</span>
            </div>
            <h3>{copy.liveTitle}</h3>
            <p>{copy.liveText}</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-violet-300" />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="scriptora-landing-section">
        <div className="scriptora-landing-section-label">{copy.pricingLabel}</div>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="max-w-2xl">{copy.pricingTitle}</h2>
          <p className="max-w-md text-sm leading-6 text-white/58">{copy.pricingText}</p>
        </div>
        <div className="scriptora-pricing-grid">
          {primaryPlans.map((plan) => {
            const planText = landingPlans[plan.id]?.[lang] ?? landingPlans[plan.id]?.en;
            return (
              <article key={plan.id} className={`scriptora-pricing-card ${plan.highlight || plan.premium ? "is-highlight" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{planText?.name ?? plan.name}</h3>
                    <p>{planText?.description ?? plan.description}</p>
                  </div>
                  {(plan.highlight || plan.premium) && <Crown className="h-4 w-4 text-fuchsia-200" />}
                </div>
                <div className="mt-6">
                  <strong>{plan.price}</strong>
                  <span>{planText?.period ?? plan.period}</span>
                </div>
                <ul>
                  {(planText?.features ?? plan.features.slice(0, 4).map((feature) => feature.label)).map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="scriptora-landing-final">
        <div className="scriptora-landing-section-label">Scriptora OS</div>
        <h2>{copy.finalTitle}</h2>
        <p>{copy.finalText}</p>
        <button type="button" onClick={onEnter} className="scriptora-landing-primary">
          {copy.primary}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </main>
  );
}

function LiveGenerationVideo({ lang }: { lang: UILanguage }) {
  const copy = liveGenerationCopy;

  return (
    <div className="scriptora-live-video" aria-label={L(copy.playerLabel, lang)}>
      <div className="scriptora-live-video-chrome">
        <div className="scriptora-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="scriptora-live-video-status">
          <Sparkles className="h-3.5 w-3.5" />
          {L(copy.badge, lang)}
        </div>
        <span>Scriptora OS</span>
      </div>

      <div className="scriptora-live-video-frame">
        <aside className="scriptora-live-chapter-rail">
          <div className="scriptora-live-book-head">
            <span><BookOpen className="h-4 w-4" /></span>
            <div>
              <strong>{L(copy.bookTitle, lang)}</strong>
              <em>{L(copy.workspace, lang)}</em>
            </div>
          </div>
          <div className="scriptora-live-chapter-list">
            {copy.chapters.map((chapter, index) => (
              <div key={chapter.label.en} className={index === 3 ? "is-active" : ""}>
                <span>{L(chapter.label, lang)}</span>
                <em>{L(chapter.status, lang)}</em>
              </div>
            ))}
          </div>
        </aside>

        <section className="scriptora-live-editor">
          <div className="scriptora-live-editor-head">
            <div>
              <span>{L(copy.sceneLabel, lang)}</span>
              <h3>{L(copy.chapterTitle, lang)}</h3>
            </div>
            <div className="scriptora-live-pulse">
              <i />
              {L(copy.badge, lang)}
            </div>
          </div>

          <div className="scriptora-live-manuscript">
            {copy.lines.map((line, index) => (
              <p key={line.en} className={`scriptora-live-manuscript-line is-line-${index + 1}`}>
                {L(line, lang)}
              </p>
            ))}
            <span className="scriptora-live-cursor" aria-hidden="true" />
          </div>

          <div className="scriptora-live-player-bar" aria-hidden="true">
            <div className="scriptora-live-progress-track">
              <span />
            </div>
            <strong>03:42</strong>
          </div>
        </section>

        <aside className="scriptora-live-inspector">
          <div className="scriptora-live-inspector-card is-strong">
            <span>{L(copy.inspectorTitle, lang)}</span>
            <strong>{L(copy.memoryLock, lang)}</strong>
          </div>
          <div className="scriptora-live-score-grid">
            <div>
              <span>{L(copy.continuity, lang)}</span>
              <strong>96%</strong>
            </div>
            <div>
              <span>{L(copy.quality, lang)}</span>
              <strong>91%</strong>
            </div>
            <div>
              <span>4,820</span>
              <strong>{L(copy.words, lang)}</strong>
            </div>
          </div>
          <div className="scriptora-live-step-stack">
            {copy.steps.map((step, index) => (
              <span key={step.en} className={index < 3 ? "is-done" : ""}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {L(step, lang)}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniAppScreen({
  variant,
  lang,
  compact = false,
}: {
  variant: AppPreviewVariant;
  lang: UILanguage;
  compact?: boolean;
}) {
  const data = {
    dashboard: {
      icon: Layers3,
      eyebrow: "Scriptora OS",
      title: { en: "Dashboard", it: "Dashboard", es: "Dashboard", fr: "Dashboard", de: "Dashboard" },
      status: { en: "Ready", it: "Pronto", es: "Listo", fr: "Pret", de: "Bereit" },
      nav: [
        { en: "Home", it: "Home", es: "Home", fr: "Home", de: "Home" },
        { en: "Projects", it: "Progetti", es: "Proyectos", fr: "Projets", de: "Projekte" },
        { en: "Library", it: "Biblioteca", es: "Biblioteca", fr: "Bibliotheque", de: "Bibliothek" },
      ],
      metrics: [
        { en: "Active book", it: "Libro attivo", es: "Libro activo", fr: "Livre actif", de: "Aktives Buch" },
        { en: "AI Quality", it: "Qualita AI", es: "Calidad IA", fr: "Qualite IA", de: "KI-Qualitat" },
        { en: "Streak", it: "Streak", es: "Racha", fr: "Serie", de: "Serie" },
      ],
      tools: [
        { en: "New Book", it: "Nuovo Libro", es: "Nuevo Libro", fr: "Nouveau Livre", de: "Neues Buch" },
        { en: "Cover Studio", it: "Cover Studio", es: "Cover Studio", fr: "Cover Studio", de: "Cover Studio" },
        { en: "Author Identity", it: "Identita autore", es: "Identidad autor", fr: "Identite auteur", de: "Autorenidentitat" },
      ],
      lines: [
        { en: "Continue where you left off", it: "Continua da dove avevi lasciato", es: "Continua donde lo dejaste", fr: "Reprendre la ou vous etiez", de: "Dort weitermachen" },
        { en: "Essential workspace active", it: "Workspace essenziale attivo", es: "Workspace esencial activo", fr: "Workspace essentiel actif", de: "Kompakter Workspace aktiv" },
      ],
    },
    character: {
      icon: Users,
      eyebrow: "Canon lock",
      title: { en: "Character Studio", it: "Character Studio", es: "Character Studio", fr: "Character Studio", de: "Character Studio" },
      status: { en: "Cast saved", it: "Cast salvato", es: "Reparto guardado", fr: "Casting sauvegarde", de: "Figuren gespeichert" },
      nav: [
        { en: "Idea", it: "Idea", es: "Idea", fr: "Idee", de: "Idee" },
        { en: "Characters", it: "Protagonisti", es: "Personajes", fr: "Personnages", de: "Figuren" },
        { en: "Plot", it: "Trama", es: "Trama", fr: "Intrigue", de: "Plot" },
      ],
      metrics: [
        { en: "Genre", it: "Genere", es: "Genero", fr: "Genre", de: "Genre" },
        { en: "Tone", it: "Tono", es: "Tono", fr: "Ton", de: "Ton" },
        { en: "Saga", it: "Saga", es: "Saga", fr: "Saga", de: "Saga" },
      ],
      tools: [
        { en: "Manual names", it: "Nomi manuali", es: "Nombres manuales", fr: "Noms manuels", de: "Manuelle Namen" },
        { en: "Dynamics", it: "Dinamiche", es: "Dinamicas", fr: "Dynamiques", de: "Dynamiken" },
        { en: "Use in book", it: "Usa nel libro", es: "Usar en libro", fr: "Utiliser", de: "Im Buch nutzen" },
      ],
      lines: [
        { en: "Canonical cast and narrative memory", it: "Cast canonico e memoria narrativa", es: "Reparto canonico y memoria", fr: "Casting canonique et memoire", de: "Kanonische Figuren und Gedachtnis" },
        { en: "Title and subtitle stay coherent", it: "Titolo e sottotitolo restano coerenti", es: "Titulo y subtitulo coherentes", fr: "Titre et sous-titre coherents", de: "Titel und Untertitel bleiben konsistent" },
      ],
    },
    writer: {
      icon: PenLine,
      eyebrow: "Writer Studio",
      title: { en: "Live preview", it: "Anteprima viva", es: "Vista live", fr: "Apercu live", de: "Live-Vorschau" },
      status: { en: "Live chapter", it: "Capitolo live", es: "Capitulo live", fr: "Chapitre live", de: "Live-Kapitel" },
      nav: [
        { en: "Editor", it: "Editor", es: "Editor", fr: "Editor", de: "Editor" },
        { en: "Memory", it: "Memoria", es: "Memoria", fr: "Memoire", de: "Gedachtnis" },
        { en: "Rewrite", it: "Rewrite", es: "Rewrite", fr: "Rewrite", de: "Rewrite" },
      ],
      metrics: [
        { en: "Hook", it: "Hook", es: "Hook", fr: "Hook", de: "Hook" },
        { en: "Pacing", it: "Pacing", es: "Pacing", fr: "Pacing", de: "Pacing" },
        { en: "Continuity", it: "Continuita", es: "Continuidad", fr: "Continuite", de: "Kontinuitat" },
      ],
      tools: [
        { en: "Generate", it: "Genera", es: "Generar", fr: "Generer", de: "Generieren" },
        { en: "Analyze", it: "Analizza", es: "Analizar", fr: "Analyser", de: "Analysieren" },
        { en: "Rewrite", it: "Riscrivi", es: "Reescribir", fr: "Reecrire", de: "Umschreiben" },
      ],
      lines: [
        { en: "Text appears while the chapter is written", it: "Il testo appare durante la scrittura", es: "El texto aparece durante la escritura", fr: "Le texte apparait pendant l'ecriture", de: "Text erscheint wahrend des Schreibens" },
        { en: "Scene pressure and continuity stay visible", it: "Pressione di scena e continuita restano visibili", es: "Tension y continuidad visibles", fr: "Tension et continuite visibles", de: "Szenendruck und Kontinuitat sichtbar" },
      ],
    },
    publishing: {
      icon: Rocket,
      eyebrow: "Publishing OS",
      title: { en: "Market shelf", it: "Scaffale mercato", es: "Estante mercado", fr: "Rayon marche", de: "Marktregal" },
      status: { en: "Export ready", it: "Export pronto", es: "Export listo", fr: "Export pret", de: "Export bereit" },
      nav: [
        { en: "KDP", it: "KDP", es: "KDP", fr: "KDP", de: "KDP" },
        { en: "Keywords", it: "Keyword", es: "Keywords", fr: "Mots-cles", de: "Keywords" },
        { en: "Export", it: "Export", es: "Export", fr: "Export", de: "Export" },
      ],
      metrics: [
        { en: "EPUB", it: "EPUB", es: "EPUB", fr: "EPUB", de: "EPUB" },
        { en: "KDP", it: "KDP", es: "KDP", fr: "KDP", de: "KDP" },
        { en: "Lulu", it: "Lulu", es: "Lulu", fr: "Lulu", de: "Lulu" },
      ],
      tools: [
        { en: "Cover Studio", it: "Cover Studio", es: "Cover Studio", fr: "Cover Studio", de: "Cover Studio" },
        { en: "Metadata", it: "Metadata", es: "Metadata", fr: "Metadata", de: "Metadaten" },
        { en: "Download", it: "Download", es: "Descarga", fr: "Download", de: "Download" },
      ],
      lines: [
        { en: "Cover, keywords and final formats", it: "Copertina, keyword e formati finali", es: "Portada, keywords y formatos", fr: "Couverture, mots-cles et formats", de: "Cover, Keywords und Formate" },
        { en: "Editorial packaging in the same OS", it: "Packaging editoriale dentro lo stesso OS", es: "Packaging editorial en el mismo OS", fr: "Packaging editorial dans le meme OS", de: "Editoriales Packaging im selben OS" },
      ],
    },
  }[variant];

  const Icon = data.icon;

  return (
    <div className={`scriptora-mini-screen is-${variant} ${compact ? "is-compact" : ""}`} aria-hidden="true">
      <div className="scriptora-mini-topbar">
        <span><Icon className="h-3.5 w-3.5" /></span>
        <div>
          <strong>{L(data.title, lang)}</strong>
          <em>{data.eyebrow}</em>
        </div>
        <b>{L(data.status, lang)}</b>
      </div>
      <div className="scriptora-mini-body">
        <aside>
          {data.nav.map((item, index) => (
            <i key={item.en} className={index === 0 ? "is-active" : ""}>{L(item, lang)}</i>
          ))}
        </aside>
        <section>
          <div className="scriptora-mini-metrics">
            {data.metrics.map((item) => (
              <span key={item.en}>{L(item, lang)}</span>
            ))}
          </div>
          <div className="scriptora-mini-tools">
            {data.tools.map((item) => (
              <span key={item.en}>{L(item, lang)}</span>
            ))}
          </div>
          <div className="scriptora-mini-lines">
            {data.lines.map((line) => (
              <p key={line.en}>{L(line, lang)}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductPreview({
  variant,
  lang,
  live,
  compact = false,
}: {
  variant: AppPreviewVariant;
  lang: UILanguage;
  live: boolean;
  compact?: boolean;
}) {
  const screenshot = productScreenshots[variant];
  if (screenshot) {
    return <RealProductScreenshot src={screenshot} label={variant} compact={compact} />;
  }
  if (live) {
    return <LiveProductFrame src={productRoutes[variant]} label={variant} compact={compact} />;
  }
  return <MiniAppScreen variant={variant} lang={lang} compact={compact} />;
}

function RealProductScreenshot({
  src,
  label,
  compact = false,
}: {
  src: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`scriptora-real-product-shot ${compact ? "is-compact" : ""}`}>
      <img src={src} alt={`Scriptora OS ${label} screenshot`} loading="lazy" />
    </div>
  );
}

function RealProductVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  return (
    <div className="scriptora-real-product-video">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={`Scriptora OS ${label} video walkthrough`}
      >
        <source src={src} type="video/webm" />
      </video>
    </div>
  );
}

function LiveProductFrame({
  src,
  label,
  compact = false,
}: {
  src: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`scriptora-live-product-frame ${compact ? "is-compact" : ""}`}>
      <iframe
        src={src}
        title={`Scriptora OS ${label} live preview`}
        loading="lazy"
        tabIndex={-1}
      />
    </div>
  );
}

function DashboardPreview({ lang, live }: { lang: UILanguage; live: boolean }) {
  const screenshot = productScreenshots.dashboard;
  if (productTourVideo && screenshot) {
    return <RealProductVideo src={productTourVideo} poster={screenshot} label="dashboard" />;
  }
  if (screenshot) {
    return <RealProductScreenshot src={screenshot} label="dashboard" />;
  }
  if (live) {
    return <LiveProductFrame src="/dashboard" label="dashboard" />;
  }

  const labels = {
    stable: { en: "Stable", it: "Stabile", es: "Estable", fr: "Stable", de: "Stabil" },
    aiStudio: { en: "AI Book Studio", it: "Studio libri AI", es: "Estudio libros IA", fr: "Studio livres IA", de: "KI-Buchstudio" },
    activeBook: { en: "Active book", it: "Libro attivo", es: "Libro activo", fr: "Livre actif", de: "Aktives Buch" },
    manuscriptOpen: { en: "Manuscript open", it: "Manoscritto aperto", es: "Manuscrito abierto", fr: "Manuscrit ouvert", de: "Manuskript offen" },
    aiQuality: { en: "AI Quality", it: "Qualita AI", es: "Calidad IA", fr: "Qualite IA", de: "KI-Qualitat" },
    analysisReady: { en: "Analysis ready", it: "Analisi pronta", es: "Analisis listo", fr: "Analyse prete", de: "Analyse bereit" },
    kdp: { en: "KDP", it: "KDP", es: "KDP", fr: "KDP", de: "KDP" },
    marketLayer: { en: "Market layer", it: "Livello mercato", es: "Capa mercado", fr: "Couche marche", de: "Marktebene" },
    bottom: { en: "Author Identity, Background Atmosphere and Publishing Shelf stay connected.", it: "Identita autore, atmosfera e scaffale pubblicazione restano collegati.", es: "Identidad autor, atmosfera y publicacion quedan conectadas.", fr: "Identite auteur, atmosphere et publication restent reliees.", de: "Autorenidentitat, Atmosphare und Publishing bleiben verbunden." },
  };
  const nav = [
    { en: "Dashboard", it: "Dashboard", es: "Dashboard", fr: "Dashboard", de: "Dashboard" },
    { en: "Writer Studio", it: "Writer Studio", es: "Writer Studio", fr: "Writer Studio", de: "Writer Studio" },
    { en: "Projects", it: "Progetti", es: "Proyectos", fr: "Projets", de: "Projekte" },
    { en: "Library", it: "Biblioteca", es: "Biblioteca", fr: "Bibliotheque", de: "Bibliothek" },
    { en: "Export", it: "Export", es: "Export", fr: "Export", de: "Export" },
  ];

  return (
    <div className="scriptora-dashboard-preview" aria-label="Scriptora OS dashboard preview">
      <aside>
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/16 text-cyan-200">
            <BookOpen className="h-4 w-4" />
          </span>
          <strong>Scriptora OS</strong>
        </div>
        {nav.map((item, index) => (
          <span key={item.en} className={index === 0 ? "is-active" : ""}>
            {L(item, lang)}
          </span>
        ))}
      </aside>
      <div className="min-w-0 flex-1 p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase text-cyan-200/72">{L(labels.aiStudio, lang)}</p>
            <h2>Scriptora OS</h2>
          </div>
          <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
            {L(labels.stable, lang)}
          </span>
        </div>
        <div className="scriptora-dashboard-stats">
          <span><strong>{L(labels.activeBook, lang)}</strong><em>{L(labels.manuscriptOpen, lang)}</em></span>
          <span><strong>{L(labels.aiQuality, lang)}</strong><em>{L(labels.analysisReady, lang)}</em></span>
          <span><strong>{L(labels.kdp, lang)}</strong><em>{L(labels.marketLayer, lang)}</em></span>
        </div>
        <div className="scriptora-dashboard-card-grid">
          {previewCards.map((card) => (
            <div key={card.label}>
              <span><card.icon className="h-4 w-4" /></span>
              <strong>{card.label}</strong>
              <p>{L(card.text, lang)}</p>
            </div>
          ))}
        </div>
        <div className="scriptora-dashboard-bottom">
          <Layers3 className="h-4 w-4 text-fuchsia-200" />
          <span>{L(labels.bottom, lang)}</span>
          <Globe2 className="h-4 w-4 text-cyan-200" />
        </div>
      </div>
    </div>
  );
}
