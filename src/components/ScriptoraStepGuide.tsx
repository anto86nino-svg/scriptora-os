import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronDown, Compass, EyeOff, HelpCircle, X } from "lucide-react";
import { type UILanguage, useUILanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type GuideRoute =
  | "dashboard"
  | "writer"
  | "newbook"
  | "bestseller"
  | "idea"
  | "kdp"
  | "keyword"
  | "radar"
  | "downloads"
  | "pricing"
  | "usage"
  | "title"
  | "cover"
  | "author"
  | "character"
  | "manuscript"
  | "notepad"
  | "export"
  | "settings"
  | "library"
  | "beta";

type GuideCopy = {
  label: string;
  hide: string;
  show: string;
  open: string;
  compact: string;
  current: string;
  routes: Record<GuideRoute, { title: string; subtitle: string; cta?: string; ctaPath?: string; steps: string[] }>;
};

const SCRIPTORA_GUIDED_FLOW_KEY = "scriptora-guided-flow";
const GUIDE_ENABLED_KEY = "scriptora-global-step-guide";
const GUIDE_COLLAPSED_KEY = "scriptora-global-step-guide-collapsed";

function readInitialGuideEnabled() {
  const stored = localStorage.getItem(SCRIPTORA_GUIDED_FLOW_KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  const legacy = localStorage.getItem(GUIDE_ENABLED_KEY);
  if (legacy === "on") return true;
  if (legacy === "off") return false;
  return false;
}

const copy: Record<UILanguage, GuideCopy> = {
  en: {
    label: "Step guide",
    hide: "Hide",
    show: "Show guide",
    open: "Open",
    compact: "Compact",
    current: "Current flow",
    routes: {
      dashboard: {
        title: "Scriptora OS Launchpad",
        subtitle: "Six operating systems — Launch, Writer, Editorial, Market, Publish, System — one intelligent workspace.",
        steps: ["Set author identity and app language in System OS.", "Launch a book: Quick Launch, Advanced Launch, or Manual Setup.", "Write in Writer OS; improve with Editorial OS; position with Market OS.", "Publish with Cover & Export Studio — Install App is separate from manuscript export."],
      },
      writer: {
        title: "Writer OS · Studio",
        subtitle: "One writing environment — generate, rewrite, and refine in the same desk.",
        steps: ["Open the chapter index on the left.", "Select the section or chapter to work on.", "Generate text, run Quick Scan, open Chapter Doctor, or rewrite from the chapter toolbar.", "When complete, move to Publish OS — Export Studio packages EPUB, PDF, or DOCX."],
      },
      newbook: { title: "Manual Setup · Launch OS", subtitle: "Define every rule before Scriptora writes a word.", steps: ["Choose title, subtitle, author, and book language.", "Set genre, category, tone, length, and chapter count.", "Check author identity before launch.", "Create the book, then continue in Writer OS."] },
      bestseller: {
        title: "Advanced Launch · Launch OS",
        subtitle: "Full commercial structure — market preview, blueprint, batch runs, saved launches.",
        steps: ["Describe the promise and target reader.", "Let Scriptora build title, market, blueprint, and chapters.", "Review the live preview and saved runs.", "Continue in Writer OS with the generated project."],
        cta: "Open Writer OS",
        ctaPath: "/app",
      },
      idea: { title: "Quick Launch · Launch OS", subtitle: "Describe your idea — Scriptora builds market, blueprint, and book structure.", steps: ["Write the book idea in plain language.", "Choose the book language for this project.", "Preview the detected genre, promise, title, and chapters.", "Launch generation here, or open Advanced Launch from the dashboard card."] },
      kdp: {
        title: "KDP Intelligence · Market OS",
        subtitle: "Position the product before Amazon publishing.",
        steps: ["Start from the book idea or niche.", "Analyze market direction and reader promise.", "Create title, packaging, metadata, and positioning.", "Use the final pack for KDP decisions — pair with Keyword Gold and Title Intelligence."],
      },
      keyword: {
        title: "Keyword Gold · Market OS",
        subtitle: "Metadata strategy inside the Market ecosystem.",
        steps: ["Enter title and subtitle.", "Run the base analysis.", "Review keywords, BISAC, categories, and positioning.", "Copy metadata into your KDP or publishing workflow."],
      },
      radar: {
        title: "Bestseller Radar · Market OS",
        subtitle: "Read demand and competition before you commit.",
        steps: ["Choose niche, genre, or platform focus.", "Refresh live trend signals.", "Review demand, competition, and playlist ideas.", "Import promising angles into a Launch OS project."],
      },
      downloads: {
        title: "Install App · System OS",
        subtitle: "Install Scriptora on your devices — not manuscript export.",
        steps: ["Use this page to install Scriptora on phone, tablet, or desktop.", "Export Studio (Publish OS) handles EPUB, PDF, and DOCX — not this page.", "When builds are available, download the installer for your platform.", "Return to the Launchpad to continue writing."],
      },
      pricing: {
        title: "Plans",
        subtitle: "Understand monthly plans and Scriptora credits.",
        steps: ["Compare Free, Starter, Pro Author, Studio, and Publisher.", "Check which premium editorial tools are included.", "Upgrade when you need more monthly credits or export depth.", "Return to the dashboard after choosing."],
        cta: "Back to dashboard",
        ctaPath: "/dashboard",
      },
      usage: {
        title: "Usage and Dev tools",
        subtitle: "Review AI activity, estimated volume, and dev simulation.",
        steps: ["Check active plan and monthly credit allowance.", "Use dev controls only for workspace testing.", "Keep Studio-tier production projects safe.", "Return to Scriptora when testing is complete."],
        cta: "Back to dashboard",
        ctaPath: "/dashboard",
      },
      title: { title: "Title Intelligence · Market OS", subtitle: "Find a title that sells the promise — part of the Market ecosystem.", steps: ["Start from the current concept.", "Generate or compare title options.", "Read score, hook, and positioning.", "Use the best title before Manual Setup or Quick Launch."] },
      cover: { title: "Cover Studio · Publish OS", subtitle: "Visual packaging for the finished book promise.", steps: ["Choose format: EPUB, KDP, Lulu, or custom.", "Set genre, mood, colors, and text style.", "Upload or generate the background image.", "Export or save the cover — then use Export Studio for the manuscript file."] },
      author: { title: "Author Identity · System OS", subtitle: "Global author profile Scriptora applies across Launch, Writer, and Publish.", steps: ["Create or choose the author identity.", "Set pen name, copyright, bio, and public author note.", "Lock voice DNA, signature moves, forbidden moves, and recurring themes.", "Save as active — every new Launch OS project inherits this voice."] },
      character: { title: "Character Studio · Writer OS", subtitle: "Canon and cast inside the writing environment.", steps: ["Write or generate the story idea.", "Define names, roles, wounds, and continuity.", "Lock the character bible.", "Send the cast into Manual Setup or Writer OS."] },
      manuscript: { title: "Manuscript Lab · Editorial OS", subtitle: "Book-level Quick Scan — scores and a rewrite roadmap.", steps: ["Upload or paste the manuscript.", "Run the editorial analysis.", "Read book score and chapter scores.", "Open in Writer OS · Rewrite with saved editorial advice."] },
      notepad: { title: "Block Notes", subtitle: "Capture sparks before they disappear.", steps: ["Write raw notes, ideas, scenes, or hooks.", "Keep them near the current book.", "Use them when creating chapters.", "Clean old notes when the project is stable."] },
      export: { title: "Export Studio · Publish OS", subtitle: "Package the finished manuscript — EPUB, PDF, or DOCX.", steps: ["Choose the completed project.", "Pick EPUB, PDF, or DOCX.", "Check missing sections before export.", "Download the file — Install App is for the Scriptora app, not this export."] },
      settings: { title: "Settings · System OS", subtitle: "Workspace controls — app language, atmosphere, and studio preferences.", steps: ["Choose app language.", "Choose atmosphere and writing font.", "Book language is set in Manual Setup · Launch OS.", "Close settings when the workspace feels right."] },
      library: { title: "Completed or Finish Book · Publish OS", subtitle: "Finished manuscripts and paused drafts — export or resume.", steps: ["Open completed or paused books from the publishing shelf.", "Export finished projects via Export Studio.", "Resume paused drafts when you are ready to continue.", "Your active manuscript stays on the home screen."] },
      beta: { title: "Editorial Preview", subtitle: "Activate invite-only preview access when you have an editorial code.", steps: ["Enter your editorial preview code.", "Activate access.", "Check the plan badge after activation.", "Return to the dashboard and explore unlocked tools."] },
    },
  },
  it: {
    label: "Guida step",
    hide: "Nascondi",
    show: "Mostra guida",
    open: "Apri",
    compact: "Compatta",
    current: "Flusso attuale",
    routes: {
      dashboard: {
        title: "Launchpad Scriptora OS",
        subtitle: "Sei sistemi operativi — Launch, Writer, Editorial, Market, Publish, System — un workspace intelligente.",
        steps: ["Imposta identità autore e lingua app in System OS.", "Lancia un libro: Launch rapido, Launch avanzato o Setup manuale.", "Scrivi in Writer OS; migliora con Editorial OS; posiziona con Market OS.", "Pubblica con Cover & Export Studio — Installa app è separato dall'export manoscritto."],
      },
      writer: {
        title: "Writer OS · Studio",
        subtitle: "Un ambiente di scrittura — genera, riscrivi e rifinisci nella stessa scrivania.",
        steps: ["Apri l'indice capitoli a sinistra.", "Seleziona la sezione o il capitolo da lavorare.", "Genera testo, Quick Scan, Chapter Doctor o rewrite dalla toolbar del capitolo.", "Quando è completo, passa a Publish OS — Export Studio per EPUB, PDF o DOCX."],
      },
      newbook: { title: "Setup manuale · Launch OS", subtitle: "Definisci ogni regola prima che Scriptora scriva.", steps: ["Scegli titolo, sottotitolo, autore e lingua del libro.", "Imposta genere, categoria, tono, lunghezza e numero capitoli.", "Controlla l'identità autore prima del lancio.", "Crea il libro, poi continua in Writer OS."] },
      bestseller: {
        title: "Launch avanzato · Launch OS",
        subtitle: "Struttura commerciale completa — anteprima mercato, blueprint, batch e run salvate.",
        steps: ["Descrivi promessa e lettore target.", "Lascia che Scriptora costruisca titolo, mercato, blueprint e capitoli.", "Controlla anteprima live e run salvate.", "Continua in Writer OS con il progetto generato."],
        cta: "Apri Writer OS",
        ctaPath: "/app",
      },
      idea: { title: "Launch rapido · Launch OS", subtitle: "Descrivi l'idea — Scriptora costruisce mercato, blueprint e struttura.", steps: ["Scrivi l'idea del libro in linguaggio naturale.", "Scegli la lingua di scrittura di questo progetto.", "Guarda anteprima di genere, promessa, titolo e capitoli.", "Avvia la generazione qui, o apri Launch avanzato dalla card dashboard."] },
      kdp: {
        title: "KDP Intelligence · Market OS",
        subtitle: "Posiziona il prodotto prima della pubblicazione Amazon.",
        steps: ["Parti dall'idea libro o dalla nicchia.", "Analizza direzione mercato e promessa lettore.", "Crea titolo, packaging, metadata e posizionamento.", "Usa il pack per KDP — abbina Keyword Gold e Title Intelligence."],
      },
      keyword: {
        title: "Keyword Gold · Market OS",
        subtitle: "Strategia metadata nell'ecosistema Market.",
        steps: ["Inserisci titolo e sottotitolo.", "Esegui l'analisi base.", "Rivedi keyword, BISAC, categorie e posizionamento.", "Copia i metadata nel flusso KDP o di pubblicazione."],
      },
      radar: {
        title: "Bestseller Radar · Market OS",
        subtitle: "Leggi domanda e concorrenza prima di puntare.",
        steps: ["Scegli nicchia, genere o piattaforma.", "Ricarica i segnali trend live.", "Valuta domanda, concorrenza e idee playlist.", "Importa angoli promettenti in un progetto Launch OS."],
      },
      downloads: {
        title: "Installa app · System OS",
        subtitle: "Installa Scriptora sui tuoi dispositivi — non è l'export del manuscritto.",
        steps: ["Usa questa pagina per installare Scriptora su telefono, tablet o desktop.", "Export Studio (Publish OS) gestisce EPUB, PDF e DOCX — non questa pagina.", "Quando le build saranno disponibili, scarica l'installer per la tua piattaforma.", "Torna al Launchpad per continuare a scrivere."],
      },
      pricing: {
        title: "Piani",
        subtitle: "Capisci piani mensili e crediti Scriptora.",
        steps: ["Confronta Free, Starter, Pro Author, Studio e Publisher.", "Controlla quali strumenti editoriali premium sono inclusi.", "Fai upgrade quando servono più crediti mensili o export avanzato.", "Torna alla dashboard dopo la scelta."],
        cta: "Torna alla dashboard",
        ctaPath: "/dashboard",
      },
      usage: {
        title: "Usage e Dev tools",
        subtitle: "Rivedi attività AI, volume stimato e simulazione dev.",
        steps: ["Controlla piano attivo e allowance mensile di crediti.", "Usa i controlli dev solo per test del workspace.", "Mantieni sicuri i progetti di produzione Studio.", "Torna a Scriptora quando il test è completo."],
        cta: "Torna alla dashboard",
        ctaPath: "/dashboard",
      },
      title: { title: "Title Intelligence · Market OS", subtitle: "Titolo che vende la promessa — parte dell'ecosistema Market.", steps: ["Parti dal concept attuale.", "Genera o confronta titoli alternativi.", "Leggi score, hook e posizionamento.", "Usa il titolo migliore prima di Setup manuale o Launch rapido."] },
      cover: { title: "Cover Studio · Publish OS", subtitle: "Packaging visivo per la promessa del libro finito.", steps: ["Scegli formato: EPUB, KDP, Lulu o custom.", "Imposta genere, mood, colori e stile testo.", "Carica o genera lo sfondo copertina.", "Esporta o salva la cover — poi Export Studio per il file manoscritto."] },
      author: { title: "Author Identity · System OS", subtitle: "Profilo autore globale applicato a Launch, Writer e Publish.", steps: ["Crea o scegli l'identità autore.", "Imposta pen name, copyright, bio e nota pubblica.", "Blocca voice DNA, firma stilistica, divieti e temi ricorrenti.", "Salvala come attiva — ogni nuovo progetto Launch OS eredita questa voce."] },
      character: { title: "Character Studio · Writer OS", subtitle: "Cast e canone dentro l'ambiente di scrittura.", steps: ["Scrivi o genera l'idea della storia.", "Definisci nomi, ruoli, ferite e continuità.", "Blocca la bible dei personaggi.", "Invia il cast a Setup manuale o Writer OS."] },
      manuscript: { title: "Manuscript Lab · Editorial OS", subtitle: "Quick Scan a livello libro — score e roadmap di rewrite.", steps: ["Carica o incolla il manuscritto.", "Esegui l'analisi editoriale.", "Leggi voto libro e voto capitoli.", "Apri in Writer OS · Rewrite con i consigli editoriali salvati."] },
      notepad: { title: "Block Notes", subtitle: "Cattura idee prima che spariscano.", steps: ["Scrivi note, scene, hook o appunti grezzi.", "Tienili vicino al libro attuale.", "Usali durante la creazione dei capitoli.", "Ripulisci le note vecchie quando il progetto è stabile."] },
      export: { title: "Export Studio · Publish OS", subtitle: "Impacchetta il manoscritto finito — EPUB, PDF o DOCX.", steps: ["Scegli il progetto completato.", "Seleziona EPUB, PDF o DOCX.", "Controlla eventuali sezioni mancanti.", "Scarica il file — Installa app è per l'app Scriptora, non questo export."] },
      settings: { title: "Impostazioni · System OS", subtitle: "Controlli workspace — lingua app, atmosfera e preferenze studio.", steps: ["Scegli lingua app.", "Scegli atmosfera e font di scrittura.", "La lingua libro si imposta in Setup manuale · Launch OS.", "Chiudi quando il workspace ti somiglia."] },
      library: { title: "Completati o da finire · Publish OS", subtitle: "Manoscritti finiti e bozze in pausa — export o ripresa.", steps: ["Apri libri completati o in pausa dallo scaffale publishing.", "Esporta i progetti finiti via Export Studio.", "Riprendi le bozze messe da parte quando vuoi.", "Il manoscritto attivo resta in home."] },
      beta: { title: "Anteprima editoriale", subtitle: "Attiva l'accesso su invito solo se hai un codice editoriale.", steps: ["Inserisci il codice anteprima editoriale.", "Attiva l'accesso.", "Controlla il badge piano dopo l'attivazione.", "Torna alla dashboard e esplora gli strumenti sbloccati."] },
    },
  },
  es: {
    label: "Guía paso",
    hide: "Ocultar",
    show: "Mostrar guía",
    open: "Abrir",
    compact: "Compactar",
    current: "Flujo actual",
    routes: {
      dashboard: { title: "Launchpad Scriptora OS", subtitle: "Seis sistemas — Launch, Writer, Editorial, Market, Publish, System — un workspace inteligente.", steps: ["Configura identidad de autor e idioma en System OS.", "Lanza un libro: Lanzamiento rápido, Avanzado o Manual.", "Escribe en Writer OS; mejora con Editorial OS; posiciona con Market OS.", "Publica con Cover y Export Studio — Instalar app es distinto del export del manuscrito."] },
      writer: { title: "Writer OS · Studio", subtitle: "Un entorno de escritura — genera, reescribe y refina en el mismo escritorio.", steps: ["Abre el índice de capítulos a la izquierda.", "Selecciona sección o capítulo.", "Genera texto, Quick Scan, Chapter Doctor o reescribe desde la barra del capítulo.", "Al terminar, pasa a Publish OS — Export Studio empaqueta EPUB, PDF o DOCX."] },
      newbook: { title: "Configuración manual · Launch OS", subtitle: "Define cada regla antes de que Scriptora escriba.", steps: ["Elige título, subtítulo, autor e idioma.", "Define género, categoría, tono, longitud y capítulos.", "Revisa identidad de autor.", "Crea el libro y continúa en Writer OS."] },
      bestseller: { title: "Lanzamiento avanzado · Launch OS", subtitle: "Estructura comercial completa — vista previa de mercado, blueprint y ejecuciones.", steps: ["Describe promesa y lector objetivo.", "Scriptora crea título, mercado, blueprint y capítulos.", "Revisa vista live y runs guardadas.", "Continúa en Writer OS con el proyecto generado."], cta: "Abrir Writer OS", ctaPath: "/app" },
      idea: { title: "Lanzamiento rápido · Launch OS", subtitle: "Describe tu idea — Scriptora construye mercado, blueprint y estructura.", steps: ["Escribe la idea del libro.", "Elige idioma de escritura.", "Previsualiza género, promesa, título y capítulos.", "Lanza aquí o abre Lanzamiento avanzado desde el panel."] },
      kdp: { title: "KDP Intelligence · Market OS", subtitle: "Posiciona el producto antes de publicar en Amazon.", steps: ["Parte de idea o nicho.", "Analiza mercado y promesa.", "Crea título, packaging, metadata y posicionamiento.", "Usa el pack para KDP — combina con Keyword Gold y Title Intelligence."] },
      keyword: { title: "Keyword Gold · Market OS", subtitle: "Estrategia de metadata en el ecosistema Market.", steps: ["Introduce título y subtítulo.", "Ejecuta análisis base.", "Revisa keywords, BISAC, categorías y posicionamiento.", "Reutiliza metadata en tu flujo KDP."] },
      radar: { title: "Bestseller Radar · Market OS", subtitle: "Lee demanda y competencia antes de apostar.", steps: ["Elige nicho, género o plataforma.", "Recarga señales trend.", "Evalúa demanda, competencia e ideas.", "Importa ángulos prometedores a un proyecto Launch OS."] },
      downloads: { title: "Instalar app · System OS", subtitle: "Instala Scriptora en tus dispositivos — no es exportación del manuscrito.", steps: ["Usa esta página para instalar Scriptora en móvil, tablet o escritorio.", "Export Studio (Publish OS) gestiona EPUB, PDF y DOCX — no esta página.", "Cuando haya builds, descarga el instalador de tu plataforma.", "Vuelve al Launchpad para seguir escribiendo."] },
      pricing: { title: "Planes", subtitle: "Entiende planes mensuales y créditos Scriptora.", steps: ["Compara Free, Starter, Pro Author, Studio y Publisher.", "Revisa herramientas editoriales premium incluidas.", "Sube de plan cuando necesites más créditos mensuales o export avanzado.", "Vuelve al panel."], cta: "Volver al panel", ctaPath: "/dashboard" },
      usage: { title: "Uso y Dev tools", subtitle: "Revisa actividad AI, volumen estimado y simulación dev.", steps: ["Comprueba plan activo y créditos mensuales.", "Usa controles dev solo para pruebas del workspace.", "Protege proyectos de producción Studio.", "Vuelve a Scriptora."], cta: "Volver al panel", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence · Market OS", subtitle: "Título que vende la promesa — ecosistema Market.", steps: ["Parte del concepto.", "Genera o compara títulos.", "Lee score, hook y posicionamiento.", "Usa el mejor título antes de Manual o Lanzamiento rápido."] },
      cover: { title: "Cover Studio · Publish OS", subtitle: "Packaging visual del libro terminado.", steps: ["Elige EPUB, KDP, Lulu o custom.", "Define género, mood, colores y texto.", "Sube o genera el fondo.", "Exporta la portada — luego Export Studio para el manuscrito."] },
      author: { title: "Author Identity · System OS", subtitle: "Perfil global aplicado a Launch, Writer y Publish.", steps: ["Crea o elige identidad.", "Define pen name, copyright, bio y nota.", "Bloquea voz, firma, prohibiciones y temas.", "Guarda como activa — cada Launch OS hereda esta voz."] },
      character: { title: "Character Studio · Writer OS", subtitle: "Cast y canon dentro del entorno de escritura.", steps: ["Escribe o genera la idea.", "Define nombres, roles y continuidad.", "Bloquea la biblia.", "Envía el cast a Manual o Writer OS."] },
      manuscript: { title: "Manuscript Lab · Editorial OS", subtitle: "Quick Scan a nivel libro — puntuaciones y ruta de reescritura.", steps: ["Sube o pega el manuscrito.", "Ejecuta análisis editorial.", "Lee score de libro y capítulos.", "Abre en Writer OS · Rewrite con consejos guardados."] },
      notepad: { title: "Block Notes", subtitle: "Captura ideas rápidas.", steps: ["Escribe notas o escenas.", "Guárdalas cerca del libro.", "Úsalas en capítulos.", "Limpia notas viejas."] },
      export: { title: "Export Studio · Publish OS", subtitle: "Empaqueta el manuscrito terminado — EPUB, PDF o DOCX.", steps: ["Elige proyecto completo.", "Selecciona EPUB, PDF o DOCX.", "Revisa secciones faltantes.", "Descarga el archivo — Instalar app es para la app, no este export."] },
      settings: { title: "Configuración · System OS", subtitle: "Controles del workspace — idioma, atmósfera y preferencias.", steps: ["Elige idioma de app.", "Elige atmósfera y fuente.", "El idioma del libro se define en Manual · Launch OS.", "Cierra cuando esté listo."] },
      library: { title: "Libros completados · Publish OS", subtitle: "Manuscritos terminados listos para Export Studio.", steps: ["Abre libros completados del estante.", "Exporta solo proyectos completos vía Export Studio.", "Elimina solo lo innecesario.", "Vuelve a Writer OS para borradores activos."] },
      beta: { title: "Anteprima editorial", subtitle: "Activa acceso por invitación con tu código editorial.", steps: ["Introduce el código de anteprima editorial.", "Activa acceso.", "Comprueba el badge del plan.", "Vuelve al panel y explora herramientas desbloqueadas."] },
    },
  },
  fr: {
    label: "Guide étapes",
    hide: "Masquer",
    show: "Afficher guide",
    open: "Ouvrir",
    compact: "Compacter",
    current: "Flux actuel",
    routes: {
      dashboard: { title: "Launchpad Scriptora OS", subtitle: "Six systèmes — Launch, Writer, Editorial, Market, Publish, System — un workspace intelligent.", steps: ["Configurez identité auteur et langue dans System OS.", "Lancez un livre : Lancement rapide, Avancé ou Manuel.", "Écrivez dans Writer OS ; améliorez avec Editorial OS ; positionnez avec Market OS.", "Publiez avec Cover et Export Studio — Installer l'app est distinct de l'export manuscrit."] },
      writer: { title: "Writer OS · Studio", subtitle: "Un environnement d'écriture — générez, réécrivez et peaufinez au même bureau.", steps: ["Ouvrez l'index des chapitres à gauche.", "Sélectionnez section ou chapitre.", "Générez, Quick Scan, Chapter Doctor ou réécrivez depuis la barre du chapitre.", "Quand c'est prêt, passez à Publish OS — Export Studio pour EPUB, PDF ou DOCX."] },
      newbook: { title: "Configuration manuelle · Launch OS", subtitle: "Définissez chaque règle avant que Scriptora écrive.", steps: ["Choisissez titre, sous-titre, auteur et langue.", "Réglez genre, catégorie, ton, longueur et chapitres.", "Vérifiez l'identité auteur.", "Créez le livre puis continuez dans Writer OS."] },
      bestseller: { title: "Lancement avancé · Launch OS", subtitle: "Structure commerciale complète — aperçu marché, blueprint et exécutions.", steps: ["Décrivez promesse et lecteur cible.", "Scriptora crée titre, marché, blueprint et chapitres.", "Vérifiez aperçu live et runs.", "Continuez dans Writer OS avec le projet généré."], cta: "Ouvrir Writer OS", ctaPath: "/app" },
      idea: { title: "Lancement rapide · Launch OS", subtitle: "Décrivez votre idée — Scriptora construit marché, blueprint et structure.", steps: ["Écrivez l'idée du livre.", "Choisissez la langue d'écriture.", "Prévisualisez genre, promesse, titre et chapitres.", "Lancez ici ou ouvrez Lancement avancé depuis le dashboard."] },
      kdp: { title: "KDP Intelligence · Market OS", subtitle: "Positionnez le produit avant publication Amazon.", steps: ["Partez de l'idée ou niche.", "Analysez marché et promesse.", "Créez titre, packaging, metadata et positionnement.", "Utilisez le pack KDP — associez Keyword Gold et Title Intelligence."] },
      keyword: { title: "Keyword Gold · Market OS", subtitle: "Stratégie metadata dans l'écosystème Market.", steps: ["Entrez titre et sous-titre.", "Lancez l'analyse.", "Révisez keywords, BISAC, catégories.", "Réutilisez les metadata dans votre flux KDP."] },
      radar: { title: "Bestseller Radar · Market OS", subtitle: "Lisez demande et concurrence avant de choisir.", steps: ["Choisissez niche, genre ou plateforme.", "Rechargez les signaux trend.", "Évaluez demande, concurrence et idées.", "Importez les angles prometteurs dans un projet Launch OS."] },
      downloads: { title: "Installer l'app · System OS", subtitle: "Installez Scriptora sur vos appareils — pas l'export du manuscrit.", steps: ["Utilisez cette page pour installer Scriptora sur mobile, tablette ou desktop.", "Export Studio (Publish OS) gère EPUB, PDF et DOCX — pas cette page.", "Quand les builds seront disponibles, téléchargez l'installateur.", "Revenez au Launchpad pour continuer à écrire."] },
      pricing: { title: "Plans", subtitle: "Comprenez les forfaits mensuels et les crédits Scriptora.", steps: ["Comparez Free, Starter, Pro Author, Studio et Publisher.", "Vérifiez les outils éditoriaux premium inclus.", "Upgrade pour plus de crédits mensuels ou d'export avancé.", "Revenez au dashboard."], cta: "Retour dashboard", ctaPath: "/dashboard" },
      usage: { title: "Usage et Dev tools", subtitle: "Consultez l'activité IA, le volume estimé et la simulation dev.", steps: ["Vérifiez le forfait actif et les crédits mensuels.", "Utilisez les contrôles dev seulement pour tester le workspace.", "Protégez les projets de production Studio.", "Revenez à Scriptora."], cta: "Retour dashboard", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence · Market OS", subtitle: "Titre qui vend la promesse — écosystème Market.", steps: ["Partez du concept.", "Générez ou comparez les titres.", "Lisez score, hook et positionnement.", "Utilisez le meilleur titre avant Manuel ou Lancement rapide."] },
      cover: { title: "Cover Studio · Publish OS", subtitle: "Packaging visuel du livre terminé.", steps: ["Choisissez EPUB, KDP, Lulu ou custom.", "Réglez genre, mood, couleurs et texte.", "Importez ou générez le fond.", "Exportez la couverture — puis Export Studio pour le manuscrit."] },
      author: { title: "Author Identity · System OS", subtitle: "Profil global appliqué à Launch, Writer et Publish.", steps: ["Créez ou choisissez l'identité.", "Définissez nom d'auteur, copyright, bio et note.", "Verrouillez voix, signature, interdits et thèmes.", "Enregistrez comme actif — chaque Launch OS hérite de cette voix."] },
      character: { title: "Character Studio · Writer OS", subtitle: "Cast et canon dans l'environnement d'écriture.", steps: ["Écrivez ou générez l'idée.", "Définissez noms, rôles et continuité.", "Verrouillez la bible.", "Envoyez vers Manuel ou Writer OS."] },
      manuscript: { title: "Manuscript Lab · Editorial OS", subtitle: "Quick Scan au niveau livre — scores et parcours de réécriture.", steps: ["Importez ou collez le manuscrit.", "Lancez l'analyse éditoriale.", "Lisez scores livre et chapitres.", "Ouvrez dans Writer OS · Rewrite avec les conseils enregistrés."] },
      notepad: { title: "Block Notes", subtitle: "Capturez les idées rapides.", steps: ["Écrivez notes ou scènes.", "Gardez-les près du livre.", "Utilisez-les dans les chapitres.", "Nettoyez les anciennes notes."] },
      export: { title: "Export Studio · Publish OS", subtitle: "Emballez le manuscrit terminé — EPUB, PDF ou DOCX.", steps: ["Choisissez un projet complet.", "Sélectionnez EPUB, PDF ou DOCX.", "Vérifiez les sections manquantes.", "Téléchargez — Installer l'app est pour l'app, pas cet export."] },
      settings: { title: "Paramètres · System OS", subtitle: "Contrôles workspace — langue, ambiance et préférences.", steps: ["Choisissez langue app.", "Choisissez ambiance et police.", "La langue du livre se définit dans Manuel · Launch OS.", "Fermez quand c'est prêt."] },
      library: { title: "Livres terminés · Publish OS", subtitle: "Manuscrits finis prêts pour Export Studio.", steps: ["Ouvrez les livres terminés de l'étagère.", "Exportez les projets complets via Export Studio.", "Supprimez seulement l'inutile.", "Revenez à Writer OS pour les brouillons actifs."] },
      beta: { title: "Aperçu éditorial", subtitle: "Activez l'accès sur invitation avec votre code éditorial.", steps: ["Entrez le code d'aperçu éditorial.", "Activez l'accès.", "Vérifiez le badge du forfait.", "Revenez au dashboard et explorez les outils débloqués."] },
    },
  },
  de: {
    label: "Schritt-Guide",
    hide: "Ausblenden",
    show: "Guide zeigen",
    open: "Öffnen",
    compact: "Kompakt",
    current: "Aktueller Ablauf",
    routes: {
      dashboard: { title: "Scriptora OS Launchpad", subtitle: "Sechs Systeme — Launch, Writer, Editorial, Market, Publish, System — ein intelligenter Workspace.", steps: ["Autorenidentität und App-Sprache in System OS setzen.", "Buch starten: Schnell-Launch, Erweiterter Launch oder Manuelles Setup.", "In Writer OS schreiben; mit Editorial OS verbessern; mit Market OS positionieren.", "Mit Cover & Export Studio veröffentlichen — App installieren ist nicht Manuskript-Export."] },
      writer: { title: "Writer OS · Studio", subtitle: "Eine Schreibumgebung — generieren, umschreiben und verfeinern am selben Tisch.", steps: ["Kapitelindex links öffnen.", "Bereich oder Kapitel wählen.", "Text generieren, Quick Scan, Chapter Doctor oder Rewrite in der Kapitel-Toolbar.", "Wenn fertig: Publish OS — Export Studio für EPUB, PDF oder DOCX."] },
      newbook: { title: "Manuelles Setup · Launch OS", subtitle: "Jede Regel festlegen, bevor Scriptora schreibt.", steps: ["Titel, Untertitel, Autor und Sprache wählen.", "Genre, Kategorie, Ton, Länge und Kapitel setzen.", "Autorenidentität prüfen.", "Buch erstellen und in Writer OS fortfahren."] },
      bestseller: { title: "Erweiterter Launch · Launch OS", subtitle: "Volle Kommerzstruktur — Marktvorschau, Blueprint und Batch-Läufe.", steps: ["Versprechen und Ziel-Leser beschreiben.", "Scriptora erstellt Titel, Markt, Blueprint und Kapitel.", "Live-Vorschau und gespeicherte Runs prüfen.", "In Writer OS mit dem generierten Projekt fortfahren."], cta: "Writer OS öffnen", ctaPath: "/app" },
      idea: { title: "Schnell-Launch · Launch OS", subtitle: "Idee beschreiben — Scriptora baut Markt, Blueprint und Struktur.", steps: ["Buchidee schreiben.", "Buchsprache wählen.", "Genre, Versprechen, Titel und Kapitel prüfen.", "Hier starten oder Erweiterten Launch vom Dashboard öffnen."] },
      kdp: { title: "KDP Intelligence · Market OS", subtitle: "Produkt vor Amazon-Veröffentlichung positionieren.", steps: ["Mit Idee oder Nische starten.", "Markt und Versprechen analysieren.", "Titel, Packaging, Metadata und Positionierung erstellen.", "KDP-Pack nutzen — mit Keyword Gold und Title Intelligence kombinieren."] },
      keyword: { title: "Keyword Gold · Market OS", subtitle: "Metadata-Strategie im Market-Ökosystem.", steps: ["Titel und Untertitel eingeben.", "Basisanalyse starten.", "Keywords, BISAC, Kategorien prüfen.", "Metadata im KDP-Workflow wiederverwenden."] },
      radar: { title: "Bestseller Radar · Market OS", subtitle: "Nachfrage und Wettbewerb lesen, bevor du dich festlegst.", steps: ["Nische, Genre oder Plattform wählen.", "Trendsignale laden.", "Nachfrage, Wettbewerb und Ideen prüfen.", "Starke Ansätze in ein Launch-OS-Projekt importieren."] },
      downloads: { title: "App installieren · System OS", subtitle: "Scriptora auf Geräten installieren — kein Manuskript-Export.", steps: ["Diese Seite für Installation auf Handy, Tablet oder Desktop.", "Export Studio (Publish OS) für EPUB, PDF und DOCX — nicht diese Seite.", "Wenn Builds verfügbar sind, Installer für deine Plattform laden.", "Zurück zum Launchpad zum Weiterschreiben."] },
      pricing: { title: "Tarife", subtitle: "Monatspläne und Scriptora-Credits verstehen.", steps: ["Free, Starter, Pro Author, Studio und Publisher vergleichen.", "Enthaltene Premium-Redaktionstools prüfen.", "Upgrade bei mehr monatlichen Credits oder erweitertem Export.", "Zurück zum Dashboard."], cta: "Zurück zum Dashboard", ctaPath: "/dashboard" },
      usage: { title: "Usage und Dev tools", subtitle: "KI-Aktivität, geschätztes Volumen und Dev-Simulation prüfen.", steps: ["Aktiven Plan und monatliche Credits prüfen.", "Dev-Steuerung nur für Workspace-Tests nutzen.", "Studio-Produktionsprojekte schützen.", "Zurück zu Scriptora."], cta: "Zurück zum Dashboard", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence · Market OS", subtitle: "Titel, der das Versprechen verkauft — Market-Ökosystem.", steps: ["Vom Konzept starten.", "Titel erzeugen oder vergleichen.", "Score, Hook und Positionierung lesen.", "Besten Titel vor Manuellem Setup oder Schnell-Launch nutzen."] },
      cover: { title: "Cover Studio · Publish OS", subtitle: "Visuelles Packaging für das fertige Buch.", steps: ["EPUB, KDP, Lulu oder custom wählen.", "Genre, Stimmung, Farben und Text setzen.", "Hintergrund hochladen oder generieren.", "Cover exportieren — dann Export Studio für die Manuskriptdatei."] },
      author: { title: "Author Identity · System OS", subtitle: "Globales Autorenprofil für Launch, Writer und Publish.", steps: ["Identität erstellen oder wählen.", "Pen name, Copyright, Bio und Notiz setzen.", "Voice DNA, Signatur, Verbote und Themen sichern.", "Als aktiv speichern — jedes Launch-OS-Projekt erbt diese Stimme."] },
      character: { title: "Character Studio · Writer OS", subtitle: "Cast und Kanon in der Schreibumgebung.", steps: ["Idee schreiben oder generieren.", "Namen, Rollen und Kontinuität definieren.", "Figuren-Bibel sichern.", "An Manuelles Setup oder Writer OS senden."] },
      manuscript: { title: "Manuscript Lab · Editorial OS", subtitle: "Quick Scan auf Buch-Ebene — Scores und Rewrite-Pfad.", steps: ["Manuskript hochladen oder einfügen.", "Editoriale Analyse starten.", "Buch- und Kapitel-Scores lesen.", "In Writer OS · Rewrite mit gespeicherten Hinweisen öffnen."] },
      notepad: { title: "Block Notes", subtitle: "Ideen schnell sichern.", steps: ["Notizen oder Szenen schreiben.", "Beim Buch behalten.", "In Kapiteln nutzen.", "Alte Notizen aufräumen."] },
      export: { title: "Export Studio · Publish OS", subtitle: "Fertiges Manuskript verpacken — EPUB, PDF oder DOCX.", steps: ["Fertiges Projekt wählen.", "EPUB, PDF oder DOCX wählen.", "Fehlende Bereiche prüfen.", "Datei laden — App installieren ist für die App, nicht dieser Export."] },
      settings: { title: "Einstellungen · System OS", subtitle: "Workspace-Steuerung — Sprache, Atmosphäre und Präferenzen.", steps: ["App-Sprache wählen.", "Atmosphäre und Schrift wählen.", "Buchsprache wird in Manuelles Setup · Launch OS gesetzt.", "Schließen, wenn alles passt."] },
      library: { title: "Fertige Bücher · Publish OS", subtitle: "Abgeschlossene Manuskripte bereit für Export Studio.", steps: ["Fertige Bücher vom Regal öffnen.", "Nur fertige Projekte via Export Studio exportieren.", "Nur Unnötiges löschen.", "Zurück zu Writer OS für aktive Entwürfe."] },
      beta: { title: "Redaktionsvorschau", subtitle: "Einladungszugang mit Redaktionscode aktivieren.", steps: ["Redaktionsvorschau-Code eingeben.", "Zugang aktivieren.", "Plan-Badge prüfen.", "Zurück zum Dashboard und freigeschaltete Tools erkunden."] },
    },
  },
};

export function ScriptoraStepGuide() {
  const lang = useUILanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(readInitialGuideEnabled);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
const [isMinimized, setIsMinimized] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(GUIDE_COLLAPSED_KEY) === "yes");
  const [overrideRoute, setOverrideRoute] = useState<GuideRoute | null>(null);

  const route = useMemo<GuideRoute | null>(() => {
    const path = location.pathname;
    if (path === "/dashboard") return "dashboard";
    if (path === "/app") return "writer";
    if (path === "/auto-bestseller") return "bestseller";
    if (path === "/kdp-launch") return "kdp";
    if (path === "/keyword-gold") return "keyword";
    if (path === "/bestseller-radar") return "radar";
    if (path === "/downloads") return "downloads";
    if (path === "/pricing") return "pricing";
    if (path === "/usage") return "usage";
    return null;
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(SCRIPTORA_GUIDED_FLOW_KEY, enabled ? "on" : "off");
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem(GUIDE_COLLAPSED_KEY, collapsed ? "yes" : "no");
  }, [collapsed]);

  useEffect(() => {
    const syncGuideState = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean; resetCollapsed?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setEnabled(detail.enabled);
        if (detail.enabled && detail.resetCollapsed !== false) {
          setCollapsed(false);
        }
      }
    };

    const syncGuideContext = (event: Event) => {
      const next = (event as CustomEvent<{ route?: GuideRoute | null }>).detail?.route || null;
      setOverrideRoute(next);
    };

    window.addEventListener("scriptora-guided-flow-change", syncGuideState as EventListener);
    window.addEventListener("scriptora-guide-context", syncGuideContext as EventListener);
    return () => {
      window.removeEventListener("scriptora-guided-flow-change", syncGuideState as EventListener);
      window.removeEventListener("scriptora-guide-context", syncGuideContext as EventListener);
    };
  }, []);

  const activeRoute = overrideRoute || route;
  if (!activeRoute) return null;

  const text = copy[lang] || copy.en;
  const guide = text.routes[activeRoute] || copy.en.routes[activeRoute];

  if (!enabled) {
    return <>{/* moved near music toolbar */}</>;
  }

  if (!isGuideOpen && isMinimized) {
    return (
      <button
        onClick={() => {
          setIsGuideOpen(true);
          setIsMinimized(false);
        }}
        className="fixed bottom-5 right-5 z-[9999] rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl"
      >
        ✨ {text.show}
      </button>
    );
  }

  if (!isGuideOpen) {
    return null;
  }

  if (collapsed) {
    return <>{/* moved near music toolbar */}</>;
  }

  return (
    <aside className="scriptora-step-guide" aria-label={text.label}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
            <Compass className="h-3.5 w-3.5" />
            {text.current}
          </p>
          <h2 className="mt-1 text-sm font-bold text-foreground">{guide.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{guide.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setCollapsed(true)}
            className="scriptora-step-guide-icon"
            title={text.compact}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
  setIsMinimized(true);
  setIsGuideOpen(false);
}}
            className="scriptora-step-guide-icon"
            title={text.hide}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ol className="mt-3 space-y-2">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-2">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                index === 0 ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-cyan-100",
              )}
            >
              {index === guide.steps.length - 1 ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
            </span>
            <span className="text-[11px] leading-snug text-foreground/82">{step}</span>
          </li>
        ))}
      </ol>

      {guide.cta && guide.ctaPath && (
        <button
          onClick={() => navigate(guide.ctaPath!)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-950 transition-colors hover:bg-slate-100"
        >
          {guide.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        onClick={() => {
  setIsMinimized(true);
  setIsGuideOpen(false);
}}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <EyeOff className="h-3 w-3" />
        {text.hide}
      </button>
    </aside>
  );
}