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

const GUIDE_ENABLED_KEY = "scriptora-global-step-guide";
const GUIDE_COLLAPSED_KEY = "scriptora-global-step-guide-collapsed";

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
        title: "Scriptora Home",
        subtitle: "Use the dashboard as your launchpad, then enter the right studio.",
        steps: ["Choose author identity and app language.", "Start a new bestseller or open an existing project.", "Pick the right studio: Writer, Cover, Analyzer, KDP, or Export.", "Return here to monitor progress and continue work."],
      },
      writer: {
        title: "Writer Studio",
        subtitle: "This page has a deeper guide above the editor.",
        steps: ["Open the chapter index on the left.", "Select the section or chapter to work on.", "Generate, edit, analyze, or rewrite the text.", "Export only when the manuscript is complete."],
      },
      newbook: { title: "Create New Book", subtitle: "Set the book rules before Scriptora starts writing.", steps: ["Choose title, subtitle, author, and book language.", "Set genre, category, tone, length, and chapter count.", "Check author identity before launch.", "Create the book, then continue inside Writer Studio."] },
      bestseller: {
        title: "Bestseller Engine",
        subtitle: "Turn a book promise into a complete commercial structure.",
        steps: ["Describe the promise and target reader.", "Let Scriptora build title, market, blueprint, and chapters.", "Review the live preview and saved runs.", "Use the result as a project in Writer Studio."],
        cta: "Open Writer Studio",
        ctaPath: "/app",
      },
      idea: { title: "Generate a New Bestseller", subtitle: "Start from an idea and let Scriptora prepare the commercial flow.", steps: ["Write the book idea in plain language.", "Choose the book language for this project.", "Preview the detected genre, promise, title, and chapters.", "Launch full generation or open advanced Bestseller Engine."] },
      kdp: {
        title: "KDP Intelligence",
        subtitle: "Shape the product before publishing.",
        steps: ["Start from the book idea or niche.", "Analyze market direction and reader promise.", "Create title, packaging, metadata, and positioning.", "Use the final pack for Amazon KDP decisions."],
      },
      keyword: {
        title: "Keyword Gold",
        subtitle: "Build metadata without guessing.",
        steps: ["Enter title and subtitle.", "Run the base analysis.", "Review keywords, BISAC, categories, and positioning.", "Copy or reuse the metadata in your publishing workflow."],
      },
      radar: {
        title: "Bestseller Radar",
        subtitle: "Read market movement before committing.",
        steps: ["Choose niche, genre, or platform focus.", "Refresh live trend signals.", "Review demand, competition, and playlist ideas.", "Import promising angles into a book project."],
      },
      downloads: {
        title: "Export and Downloads",
        subtitle: "Prepare installable and publishing assets.",
        steps: ["Finish the manuscript first.", "Choose EPUB, PDF, DOCX, or app download.", "Check formatting before publishing.", "Save the final asset in your project library."],
      },
      pricing: {
        title: "Plans",
        subtitle: "Understand what is unlocked in each plan.",
        steps: ["Compare Free, Beta, Pro, and Premium.", "Check which functions are locked or unlocked.", "Upgrade when you need export, advanced AI, or more books.", "Return to the dashboard after choosing."],
        cta: "Back to dashboard",
        ctaPath: "/dashboard",
      },
      usage: {
        title: "Usage and Dev tools",
        subtitle: "Control plan simulation, limits, and test state.",
        steps: ["Check active plan and limits.", "Use beta/dev controls only for testing.", "Keep Premium projects safe.", "Return to Scriptora when testing is complete."],
        cta: "Back to dashboard",
        ctaPath: "/dashboard",
      },
      title: { title: "Title Intelligence", subtitle: "Find a title that sells the promise, not just the plot.", steps: ["Start from the current concept.", "Generate or compare title options.", "Read score, hook, and positioning.", "Use the best title before creating the book."] },
      cover: { title: "Cover Studio", subtitle: "Build the visual package around the book promise.", steps: ["Choose format: EPUB, KDP, Lulu, or custom.", "Set genre, mood, colors, and text style.", "Upload or generate the background image.", "Export or save the cover for the project."] },
      author: { title: "Author Identity Pro", subtitle: "Create the global author profile Scriptora uses under the hood.", steps: ["Create or choose the author identity.", "Set pen name, copyright, bio, and public author note.", "Lock voice DNA, signature moves, forbidden moves, and recurring themes.", "Save it as active so every new book uses the right author."] },
      character: { title: "Character Studio", subtitle: "Create a canon the book can follow.", steps: ["Write or generate the story idea.", "Define names, roles, wounds, and continuity.", "Lock the character bible.", "Send the cast into New Book or Writer Studio."] },
      manuscript: { title: "Manuscript Analyzer", subtitle: "Turn an existing draft into an editorial roadmap.", steps: ["Upload or paste the manuscript.", "Run the analysis.", "Read book score and chapter scores.", "Create a rewrite project from the advice."] },
      notepad: { title: "Block Notes", subtitle: "Capture sparks before they disappear.", steps: ["Write raw notes, ideas, scenes, or hooks.", "Keep them near the current book.", "Use them when creating chapters.", "Clean old notes when the project is stable."] },
      export: { title: "Export Studio", subtitle: "Package the finished book with control.", steps: ["Choose the completed project.", "Pick EPUB, PDF, or DOCX.", "Check missing sections before export.", "Download and store the final file."] },
      settings: { title: "Settings", subtitle: "Control the studio without touching the book language.", steps: ["Choose app language.", "Choose atmosphere and writing font.", "Keep book language inside New Book.", "Close settings when the workspace feels right."] },
      library: { title: "Library", subtitle: "Manage books already created in Scriptora.", steps: ["Open active drafts or completed books.", "Export only complete projects.", "Delete only what you no longer need.", "Return to Writer Studio to continue writing."] },
      beta: { title: "Beta Access", subtitle: "Activate testing access only when you have the beta code.", steps: ["Enter the beta tester code.", "Activate access.", "Check the plan badge after activation.", "Return to the dashboard and test unlocked features."] },
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
        title: "Home Scriptora",
        subtitle: "Usa la dashboard come launchpad, poi entra nello studio giusto.",
        steps: ["Scegli identità autore e lingua app.", "Crea un nuovo bestseller o apri un progetto esistente.", "Scegli lo studio corretto: Writer, Cover, Analyzer, KDP o Export.", "Torna qui per monitorare avanzamento e continuare il lavoro."],
      },
      writer: {
        title: "Writer Studio",
        subtitle: "Questa pagina ha una guida più precisa sopra l'editor.",
        steps: ["Apri l'indice capitoli a sinistra.", "Seleziona la sezione o il capitolo da lavorare.", "Genera, modifica, analizza o riscrivi il testo.", "Esporta solo quando il manoscritto è completo."],
      },
      newbook: { title: "Crea Nuovo Libro", subtitle: "Imposta le regole del libro prima che Scriptora inizi a scrivere.", steps: ["Scegli titolo, sottotitolo, autore e lingua del libro.", "Imposta genere, categoria, tono, lunghezza e numero capitoli.", "Controlla l'identità autore prima del lancio.", "Crea il libro, poi continua dentro Writer Studio."] },
      bestseller: {
        title: "Bestseller Engine",
        subtitle: "Trasforma una promessa editoriale in una struttura commerciale completa.",
        steps: ["Descrivi promessa e lettore target.", "Lascia che Scriptora costruisca titolo, mercato, blueprint e capitoli.", "Controlla anteprima live e run salvate.", "Usa il risultato come progetto in Writer Studio."],
        cta: "Apri Writer Studio",
        ctaPath: "/app",
      },
      idea: { title: "Genera un nuovo bestseller", subtitle: "Parti da un'idea e lascia che Scriptora prepari il flusso commerciale.", steps: ["Scrivi l'idea del libro in linguaggio naturale.", "Scegli la lingua di scrittura di questo progetto.", "Guarda anteprima di genere, promessa, titolo e capitoli.", "Avvia la generazione completa o apri Bestseller Engine avanzato."] },
      kdp: {
        title: "KDP Intelligence",
        subtitle: "Dai forma al prodotto prima della pubblicazione.",
        steps: ["Parti dall'idea libro o dalla nicchia.", "Analizza direzione mercato e promessa lettore.", "Crea titolo, packaging, metadata e posizionamento.", "Usa il pack finale per decidere su Amazon KDP."],
      },
      keyword: {
        title: "Keyword Gold",
        subtitle: "Costruisci metadata senza andare a intuito.",
        steps: ["Inserisci titolo e sottotitolo.", "Esegui l'analisi base.", "Rivedi keyword, BISAC, categorie e posizionamento.", "Copia o riusa i metadata nel flusso di pubblicazione."],
      },
      radar: {
        title: "Bestseller Radar",
        subtitle: "Leggi il movimento del mercato prima di puntare.",
        steps: ["Scegli nicchia, genere o piattaforma.", "Ricarica i segnali trend live.", "Valuta domanda, concorrenza e idee playlist.", "Importa gli angoli promettenti in un progetto libro."],
      },
      downloads: {
        title: "Export e Download",
        subtitle: "Prepara asset installabili e file editoriali.",
        steps: ["Completa prima il manoscritto.", "Scegli EPUB, PDF, DOCX o download app.", "Controlla la formattazione prima di pubblicare.", "Salva l'asset finale nella libreria progetto."],
      },
      pricing: {
        title: "Piani",
        subtitle: "Capisci cosa viene sbloccato in ogni piano.",
        steps: ["Confronta Free, Beta, Pro e Premium.", "Controlla quali funzioni sono bloccate o attive.", "Fai upgrade quando servono export, AI avanzata o più libri.", "Torna alla dashboard dopo la scelta."],
        cta: "Torna alla dashboard",
        ctaPath: "/dashboard",
      },
      usage: {
        title: "Usage e Dev tools",
        subtitle: "Controlla simulazione piano, limiti e stato test.",
        steps: ["Controlla piano attivo e limiti.", "Usa beta/dev solo per test.", "Mantieni sicuri i progetti Premium.", "Torna a Scriptora quando il test è completo."],
        cta: "Torna alla dashboard",
        ctaPath: "/dashboard",
      },
      title: { title: "Title Intelligence", subtitle: "Trova un titolo che vende la promessa, non solo la trama.", steps: ["Parti dal concept attuale.", "Genera o confronta titoli alternativi.", "Leggi score, hook e posizionamento.", "Usa il titolo migliore prima di creare il libro."] },
      cover: { title: "Cover Studio", subtitle: "Costruisci il packaging visivo attorno alla promessa del libro.", steps: ["Scegli formato: EPUB, KDP, Lulu o custom.", "Imposta genere, mood, colori e stile testo.", "Carica o genera lo sfondo copertina.", "Esporta o salva la cover nel progetto."] },
      author: { title: "Author Identity Pro", subtitle: "Crea il profilo autore globale che Scriptora usa nel cofano.", steps: ["Crea o scegli l'identità autore.", "Imposta pen name, copyright, bio e nota pubblica.", "Blocca voice DNA, firma stilistica, divieti e temi ricorrenti.", "Salvala come attiva così ogni nuovo libro usa l'autore giusto."] },
      character: { title: "Character Studio", subtitle: "Crea un canone che il libro può seguire.", steps: ["Scrivi o genera l'idea della storia.", "Definisci nomi, ruoli, ferite e continuità.", "Blocca la bible dei personaggi.", "Invia il cast a Nuovo Libro o Writer Studio."] },
      manuscript: { title: "Manuscript Analyzer", subtitle: "Trasforma una bozza esistente in roadmap editoriale.", steps: ["Carica o incolla il manoscritto.", "Esegui l'analisi.", "Leggi voto libro e voto capitoli.", "Crea un progetto di riscrittura dai consigli."] },
      notepad: { title: "Block Notes", subtitle: "Cattura idee prima che spariscano.", steps: ["Scrivi note, scene, hook o appunti grezzi.", "Tienili vicino al libro attuale.", "Usali durante la creazione dei capitoli.", "Ripulisci le note vecchie quando il progetto è stabile."] },
      export: { title: "Export Studio", subtitle: "Impacchetta il libro finito con controllo.", steps: ["Scegli il progetto completato.", "Seleziona EPUB, PDF o DOCX.", "Controlla eventuali sezioni mancanti.", "Scarica e conserva il file finale."] },
      settings: { title: "Impostazioni", subtitle: "Controlla lo studio senza toccare la lingua del libro.", steps: ["Scegli lingua app.", "Scegli atmosfera e font di scrittura.", "Lascia la lingua libro dentro Nuovo Libro.", "Chiudi quando il workspace ti somiglia."] },
      library: { title: "Biblioteca", subtitle: "Gestisci i libri già creati in Scriptora.", steps: ["Apri bozze attive o libri completati.", "Esporta solo progetti completi.", "Elimina solo ciò che non serve più.", "Torna in Writer Studio per continuare."] },
      beta: { title: "Accesso Beta", subtitle: "Attiva l'accesso tester solo se hai il codice beta.", steps: ["Inserisci il codice beta tester.", "Attiva l'accesso.", "Controlla il badge piano dopo l'attivazione.", "Torna alla dashboard e prova le funzioni sbloccate."] },
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
      dashboard: { title: "Home Scriptora", subtitle: "Usa el panel como launchpad y entra al estudio correcto.", steps: ["Elige identidad de autor e idioma de app.", "Crea un bestseller nuevo o abre un proyecto.", "Elige Writer, Cover, Analyzer, KDP o Export.", "Vuelve aquí para seguir progreso y continuar."] },
      writer: { title: "Writer Studio", subtitle: "Esta página tiene una guía más precisa sobre el editor.", steps: ["Abre el índice de capítulos a la izquierda.", "Selecciona sección o capítulo.", "Genera, edita, analiza o reescribe.", "Exporta solo cuando el manuscrito esté completo."] },
      newbook: { title: "Crear Nuevo Libro", subtitle: "Define reglas antes de que Scriptora escriba.", steps: ["Elige título, subtítulo, autor e idioma.", "Define género, categoría, tono, longitud y capítulos.", "Revisa identidad de autor.", "Crea el libro y continúa en Writer Studio."] },
      bestseller: { title: "Bestseller Engine", subtitle: "Convierte una promesa editorial en estructura comercial.", steps: ["Describe promesa y lector objetivo.", "Scriptora crea título, mercado, blueprint y capítulos.", "Revisa vista live y runs guardadas.", "Usa el resultado en Writer Studio."], cta: "Abrir Writer Studio", ctaPath: "/app" },
      idea: { title: "Generar un nuevo bestseller", subtitle: "Parte de una idea y deja que Scriptora prepare el flujo.", steps: ["Escribe la idea del libro.", "Elige idioma de escritura.", "Previsualiza género, promesa, título y capítulos.", "Lanza generación o abre Bestseller Engine avanzado."] },
      kdp: { title: "KDP Intelligence", subtitle: "Forma el producto antes de publicar.", steps: ["Parte de idea o nicho.", "Analiza mercado y promesa.", "Crea título, packaging, metadata y posicionamiento.", "Usa el pack para Amazon KDP."] },
      keyword: { title: "Keyword Gold", subtitle: "Construye metadata sin adivinar.", steps: ["Introduce título y subtítulo.", "Ejecuta análisis base.", "Revisa keywords, BISAC, categorías y posicionamiento.", "Reutiliza metadata al publicar."] },
      radar: { title: "Bestseller Radar", subtitle: "Lee movimiento de mercado antes de apostar.", steps: ["Elige nicho, género o plataforma.", "Recarga señales trend.", "Evalúa demanda, competencia e ideas.", "Importa ángulos prometedores."] },
      downloads: { title: "Export y descargas", subtitle: "Prepara assets y archivos editoriales.", steps: ["Termina el manuscrito.", "Elige EPUB, PDF, DOCX o app.", "Revisa formato.", "Guarda el asset final."] },
      pricing: { title: "Planes", subtitle: "Entiende qué desbloquea cada plan.", steps: ["Compara Free, Beta, Pro y Premium.", "Comprueba funciones bloqueadas.", "Sube de plan para export, IA avanzada o más libros.", "Vuelve al panel."], cta: "Volver al panel", ctaPath: "/dashboard" },
      usage: { title: "Uso y Dev tools", subtitle: "Controla simulación, límites y pruebas.", steps: ["Comprueba plan y límites.", "Usa beta/dev solo para test.", "Protege proyectos Premium.", "Vuelve a Scriptora."], cta: "Volver al panel", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence", subtitle: "Encuentra un título que venda la promesa.", steps: ["Parte del concepto.", "Genera o compara títulos.", "Lee score, hook y posicionamiento.", "Usa el mejor título antes de crear el libro."] },
      cover: { title: "Cover Studio", subtitle: "Crea el packaging visual del libro.", steps: ["Elige EPUB, KDP, Lulu o custom.", "Define género, mood, colores y texto.", "Sube o genera el fondo.", "Exporta o guarda la portada."] },
      author: { title: "Author Identity Pro", subtitle: "Crea el perfil global que Scriptora usa internamente.", steps: ["Crea o elige identidad.", "Define pen name, copyright, bio y nota.", "Bloquea voz, firma, prohibiciones y temas.", "Guarda como activa para nuevos libros."] },
      character: { title: "Character Studio", subtitle: "Crea canon para la historia.", steps: ["Escribe o genera la idea.", "Define nombres, roles y continuidad.", "Bloquea la biblia.", "Envía el cast a Nuevo Libro."] },
      manuscript: { title: "Manuscript Analyzer", subtitle: "Convierte un borrador en roadmap editorial.", steps: ["Sube o pega el manuscrito.", "Ejecuta análisis.", "Lee score de libro y capítulos.", "Crea proyecto de reescritura."] },
      notepad: { title: "Block Notes", subtitle: "Captura ideas rápidas.", steps: ["Escribe notas o escenas.", "Guárdalas cerca del libro.", "Úsalas en capítulos.", "Limpia notas viejas."] },
      export: { title: "Export Studio", subtitle: "Empaqueta el libro terminado.", steps: ["Elige proyecto completo.", "Selecciona EPUB, PDF o DOCX.", "Revisa secciones faltantes.", "Descarga el archivo final."] },
      settings: { title: "Configuración", subtitle: "Controla el estudio sin tocar el idioma del libro.", steps: ["Elige idioma de app.", "Elige atmósfera y fuente.", "El idioma del libro queda en Nuevo Libro.", "Cierra cuando esté listo."] },
      library: { title: "Biblioteca", subtitle: "Gestiona libros creados.", steps: ["Abre borradores o completados.", "Exporta proyectos completos.", "Elimina solo lo innecesario.", "Vuelve a Writer Studio."] },
      beta: { title: "Acceso Beta", subtitle: "Activa acceso tester con el código beta.", steps: ["Introduce el código beta.", "Activa acceso.", "Comprueba el badge del plan.", "Vuelve al panel y prueba funciones."] },
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
      dashboard: { title: "Accueil Scriptora", subtitle: "Utilisez le dashboard comme launchpad, puis ouvrez le bon studio.", steps: ["Choisissez identité auteur et langue app.", "Créez un bestseller ou ouvrez un projet.", "Choisissez Writer, Cover, Analyzer, KDP ou Export.", "Revenez ici pour suivre et continuer."] },
      writer: { title: "Writer Studio", subtitle: "Cette page a un guide plus précis au-dessus de l'éditeur.", steps: ["Ouvrez l'index des chapitres à gauche.", "Sélectionnez section ou chapitre.", "Générez, modifiez, analysez ou réécrivez.", "Exportez quand le manuscrit est complet."] },
      newbook: { title: "Créer un Nouveau Livre", subtitle: "Définissez les règles avant que Scriptora écrive.", steps: ["Choisissez titre, sous-titre, auteur et langue.", "Réglez genre, catégorie, ton, longueur et chapitres.", "Vérifiez l'identité auteur.", "Créez le livre puis continuez dans Writer Studio."] },
      bestseller: { title: "Bestseller Engine", subtitle: "Transformez une promesse éditoriale en structure commerciale.", steps: ["Décrivez promesse et lecteur cible.", "Scriptora crée titre, marché, blueprint et chapitres.", "Vérifiez aperçu live et runs.", "Utilisez le résultat dans Writer Studio."], cta: "Ouvrir Writer Studio", ctaPath: "/app" },
      idea: { title: "Générer un nouveau bestseller", subtitle: "Partez d'une idée et laissez Scriptora préparer le flux.", steps: ["Écrivez l'idée du livre.", "Choisissez la langue d'écriture.", "Prévisualisez genre, promesse, titre et chapitres.", "Lancez la génération ou ouvrez Bestseller Engine avancé."] },
      kdp: { title: "KDP Intelligence", subtitle: "Façonnez le produit avant publication.", steps: ["Partez de l'idée ou niche.", "Analysez marché et promesse.", "Créez titre, packaging, metadata et positionnement.", "Utilisez le pack pour Amazon KDP."] },
      keyword: { title: "Keyword Gold", subtitle: "Construisez les metadata sans deviner.", steps: ["Entrez titre et sous-titre.", "Lancez l'analyse.", "Révisez keywords, BISAC, catégories.", "Réutilisez les metadata."] },
      radar: { title: "Bestseller Radar", subtitle: "Lisez le marché avant de choisir.", steps: ["Choisissez niche, genre ou plateforme.", "Rechargez les signaux trend.", "Évaluez demande, concurrence et idées.", "Importez les angles prometteurs."] },
      downloads: { title: "Export et téléchargements", subtitle: "Préparez assets et fichiers éditoriaux.", steps: ["Terminez le manuscrit.", "Choisissez EPUB, PDF, DOCX ou app.", "Vérifiez le format.", "Sauvegardez l'asset final."] },
      pricing: { title: "Plans", subtitle: "Comprenez ce que chaque plan débloque.", steps: ["Comparez Free, Beta, Pro et Premium.", "Vérifiez les fonctions verrouillées.", "Upgrade pour export, IA avancée ou plus de livres.", "Revenez au dashboard."], cta: "Retour dashboard", ctaPath: "/dashboard" },
      usage: { title: "Usage et Dev tools", subtitle: "Contrôlez simulation, limites et tests.", steps: ["Vérifiez plan et limites.", "Utilisez beta/dev seulement pour test.", "Gardez les projets Premium en sécurité.", "Revenez à Scriptora."], cta: "Retour dashboard", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence", subtitle: "Trouvez un titre qui vend la promesse.", steps: ["Partez du concept.", "Générez ou comparez les titres.", "Lisez score, hook et positionnement.", "Utilisez le meilleur titre."] },
      cover: { title: "Cover Studio", subtitle: "Créez le packaging visuel du livre.", steps: ["Choisissez EPUB, KDP, Lulu ou custom.", "Réglez genre, mood, couleurs et texte.", "Importez ou générez le fond.", "Exportez ou sauvegardez la couverture."] },
      author: { title: "Author Identity Pro", subtitle: "Créez le profil global utilisé par Scriptora.", steps: ["Créez ou choisissez l'identité.", "Définissez nom d'auteur, copyright, bio et note.", "Verrouillez voix, signature, interdits et thèmes.", "Enregistrez comme actif pour les nouveaux livres."] },
      character: { title: "Character Studio", subtitle: "Créez le canon de l'histoire.", steps: ["Écrivez ou générez l'idée.", "Définissez noms, rôles et continuité.", "Verrouillez la bible.", "Envoyez vers Nouveau Livre."] },
      manuscript: { title: "Manuscript Analyzer", subtitle: "Transformez un brouillon en roadmap.", steps: ["Importez ou collez le manuscrit.", "Lancez l'analyse.", "Lisez scores livre et chapitres.", "Créez le projet de réécriture."] },
      notepad: { title: "Block Notes", subtitle: "Capturez les idées rapides.", steps: ["Écrivez notes ou scènes.", "Gardez-les près du livre.", "Utilisez-les dans les chapitres.", "Nettoyez les anciennes notes."] },
      export: { title: "Export Studio", subtitle: "Emballez le livre terminé.", steps: ["Choisissez un projet complet.", "Sélectionnez EPUB, PDF ou DOCX.", "Vérifiez les sections manquantes.", "Téléchargez le fichier final."] },
      settings: { title: "Paramètres", subtitle: "Contrôlez le studio sans changer la langue du livre.", steps: ["Choisissez langue app.", "Choisissez ambiance et police.", "La langue du livre reste dans Nouveau Livre.", "Fermez quand c'est prêt."] },
      library: { title: "Bibliothèque", subtitle: "Gérez les livres créés.", steps: ["Ouvrez brouillons ou terminés.", "Exportez les projets complets.", "Supprimez seulement l'inutile.", "Revenez à Writer Studio."] },
      beta: { title: "Accès Beta", subtitle: "Activez l'accès testeur avec le code beta.", steps: ["Entrez le code beta.", "Activez l'accès.", "Vérifiez le badge du plan.", "Revenez au dashboard et testez."] },
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
      dashboard: { title: "Scriptora Home", subtitle: "Nutze das Dashboard als Launchpad und öffne das richtige Studio.", steps: ["Wähle Autorenidentität und App-Sprache.", "Erstelle einen Bestseller oder öffne ein Projekt.", "Wähle Writer, Cover, Analyzer, KDP oder Export.", "Kehre hierher zurück, um weiterzuarbeiten."] },
      writer: { title: "Writer Studio", subtitle: "Diese Seite hat einen genaueren Guide über dem Editor.", steps: ["Öffne den Kapitelindex links.", "Wähle Bereich oder Kapitel.", "Generiere, bearbeite, analysiere oder schreibe um.", "Exportiere erst, wenn das Manuskript fertig ist."] },
      newbook: { title: "Neues Buch erstellen", subtitle: "Regeln setzen, bevor Scriptora schreibt.", steps: ["Titel, Untertitel, Autor und Sprache wählen.", "Genre, Kategorie, Ton, Länge und Kapitel setzen.", "Autorenidentität prüfen.", "Buch erstellen und im Writer Studio fortfahren."] },
      bestseller: { title: "Bestseller Engine", subtitle: "Vom Buchversprechen zur kommerziellen Struktur.", steps: ["Beschreibe Versprechen und Ziel-Leser.", "Scriptora erstellt Titel, Markt, Blueprint und Kapitel.", "Prüfe Live-Vorschau und gespeicherte Runs.", "Nutze das Ergebnis im Writer Studio."], cta: "Writer Studio öffnen", ctaPath: "/app" },
      idea: { title: "Neuen Bestseller generieren", subtitle: "Starte mit einer Idee und Scriptora bereitet den Flow vor.", steps: ["Buchidee schreiben.", "Buchsprache wählen.", "Genre, Versprechen, Titel und Kapitel prüfen.", "Generierung starten oder erweiterten Bestseller Engine öffnen."] },
      kdp: { title: "KDP Intelligence", subtitle: "Forme das Produkt vor der Veröffentlichung.", steps: ["Starte mit Idee oder Nische.", "Analysiere Markt und Versprechen.", "Erstelle Titel, Packaging, Metadata und Positionierung.", "Nutze den Pack für Amazon KDP."] },
      keyword: { title: "Keyword Gold", subtitle: "Metadata ohne Raten erstellen.", steps: ["Titel und Untertitel eingeben.", "Basisanalyse starten.", "Keywords, BISAC, Kategorien prüfen.", "Metadata wiederverwenden."] },
      radar: { title: "Bestseller Radar", subtitle: "Marktbewegung lesen, bevor du dich festlegst.", steps: ["Nische, Genre oder Plattform wählen.", "Trendsignale laden.", "Nachfrage, Wettbewerb und Ideen prüfen.", "Starke Ansätze importieren."] },
      downloads: { title: "Export und Downloads", subtitle: "Assets und Buchdateien vorbereiten.", steps: ["Manuskript abschließen.", "EPUB, PDF, DOCX oder App wählen.", "Format prüfen.", "Finales Asset speichern."] },
      pricing: { title: "Tarife", subtitle: "Verstehen, was jeder Tarif freischaltet.", steps: ["Free, Beta, Pro und Premium vergleichen.", "Gesperrte Funktionen prüfen.", "Upgrade für Export, KI oder mehr Bücher.", "Zurück zum Dashboard."], cta: "Zurück zum Dashboard", ctaPath: "/dashboard" },
      usage: { title: "Usage und Dev tools", subtitle: "Simulation, Limits und Tests steuern.", steps: ["Plan und Limits prüfen.", "Beta/dev nur für Tests nutzen.", "Premium-Projekte schützen.", "Zurück zu Scriptora."], cta: "Zurück zum Dashboard", ctaPath: "/dashboard" },
      title: { title: "Title Intelligence", subtitle: "Finde einen Titel, der das Versprechen verkauft.", steps: ["Vom Konzept starten.", "Titel erzeugen oder vergleichen.", "Score, Hook und Positionierung lesen.", "Besten Titel vor Buchstart nutzen."] },
      cover: { title: "Cover Studio", subtitle: "Visuelles Packaging für das Buch erstellen.", steps: ["EPUB, KDP, Lulu oder custom wählen.", "Genre, Stimmung, Farben und Text setzen.", "Hintergrund hochladen oder generieren.", "Cover exportieren oder speichern."] },
      author: { title: "Author Identity Pro", subtitle: "Erstelle das globale Autorenprofil im Hintergrund.", steps: ["Identität erstellen oder wählen.", "Pen name, Copyright, Bio und Notiz setzen.", "Voice DNA, Signatur, Verbote und Themen sichern.", "Als aktiv speichern für neue Bücher."] },
      character: { title: "Character Studio", subtitle: "Kanon für die Geschichte erstellen.", steps: ["Idee schreiben oder generieren.", "Namen, Rollen und Kontinuität definieren.", "Figuren-Bibel sichern.", "In Neues Buch senden."] },
      manuscript: { title: "Manuscript Analyzer", subtitle: "Entwurf in Editorial-Roadmap verwandeln.", steps: ["Manuskript hochladen oder einfügen.", "Analyse starten.", "Buch- und Kapitel-Scores lesen.", "Rewrite-Projekt erstellen."] },
      notepad: { title: "Block Notes", subtitle: "Ideen schnell sichern.", steps: ["Notizen oder Szenen schreiben.", "Beim Buch behalten.", "In Kapiteln nutzen.", "Alte Notizen aufräumen."] },
      export: { title: "Export Studio", subtitle: "Fertiges Buch verpacken.", steps: ["Fertiges Projekt wählen.", "EPUB, PDF oder DOCX wählen.", "Fehlende Bereiche prüfen.", "Finale Datei laden."] },
      settings: { title: "Einstellungen", subtitle: "Studio steuern, ohne Buchsprache zu ändern.", steps: ["App-Sprache wählen.", "Atmosphäre und Schrift wählen.", "Buchsprache bleibt in Neues Buch.", "Schließen, wenn alles passt."] },
      library: { title: "Bibliothek", subtitle: "Erstellte Bücher verwalten.", steps: ["Entwürfe oder fertige Bücher öffnen.", "Nur fertige Projekte exportieren.", "Nur Unnötiges löschen.", "Zurück ins Writer Studio."] },
      beta: { title: "Beta-Zugang", subtitle: "Testerzugang mit Beta-Code aktivieren.", steps: ["Beta-Code eingeben.", "Zugang aktivieren.", "Plan-Badge prüfen.", "Zurück zum Dashboard und Funktionen testen."] },
    },
  },
};

export function ScriptoraStepGuide() {
  const lang = useUILanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(() => localStorage.getItem(GUIDE_ENABLED_KEY) !== "off");
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
    localStorage.setItem(GUIDE_ENABLED_KEY, enabled ? "on" : "off");
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem(GUIDE_COLLAPSED_KEY, collapsed ? "yes" : "no");
  }, [collapsed]);

  useEffect(() => {
    const syncGuideContext = (event: Event) => {
      const next = (event as CustomEvent<{ route?: GuideRoute | null }>).detail?.route || null;
      setOverrideRoute(next);
    };

    window.addEventListener("scriptora-guide-context", syncGuideContext as EventListener);
    return () => window.removeEventListener("scriptora-guide-context", syncGuideContext as EventListener);
  }, []);

  const activeRoute = overrideRoute || route;
  if (!activeRoute) return null;

  const text = copy[lang] || copy.en;
  const guide = text.routes[activeRoute] || copy.en.routes[activeRoute];

  if (!enabled) {
    return (
      <button
        onClick={() => {
          setEnabled(true);
          setCollapsed(false);
        }}
        className="scriptora-step-guide-button"
      >
        <HelpCircle className="h-4 w-4" />
        {text.show}
      </button>
    );
  }

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="scriptora-step-guide-button">
        <Compass className="h-4 w-4" />
        {text.label}
      </button>
    );
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
            onClick={() => setEnabled(false)}
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
        onClick={() => setEnabled(false)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <EyeOff className="h-3 w-3" />
        {text.hide}
      </button>
    </aside>
  );
}
