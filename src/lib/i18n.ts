export type UILanguage = "en" | "it" | "es" | "fr" | "de";

export const UI_LANGUAGES: { value: UILanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

const translations: Record<string, Record<UILanguage, string>> = {
  // Sidebar
  new_book: { en: "New Book", it: "Nuovo Libro", es: "Nuevo Libro", fr: "Nouveau Livre", de: "Neues Buch" },
  projects: { en: "Projects", it: "Progetti", es: "Proyectos", fr: "Projets", de: "Projekte" },
  blueprint: { en: "Blueprint", it: "Struttura", es: "Estructura", fr: "Structure", de: "Struktur" },
  front_matter: { en: "Front Matter", it: "Premessa", es: "Preliminares", fr: "Liminaires", de: "Vorspann" },
  back_matter: { en: "Back Matter", it: "Postfazione", es: "Apéndice", fr: "Annexes", de: "Nachspann" },
  chapters: { en: "Chapters", it: "Capitoli", es: "Capítulos", fr: "Chapitres", de: "Kapitel" },
  category: { en: "Category", it: "Categoria", es: "Categoría", fr: "Catégorie", de: "Kategorie" },

  // TopBar
  lang: { en: "Lang", it: "Lingua", es: "Idioma", fr: "Langue", de: "Sprache" },
  genre: { en: "Genre", it: "Genere", es: "Género", fr: "Genre", de: "Genre" },
  book: { en: "Book", it: "Libro", es: "Libro", fr: "Livre", de: "Buch" },
  cat: { en: "Cat", it: "Cat", es: "Cat", fr: "Cat", de: "Kat" },
  ch_len: { en: "Ch.Len", it: "Lung.Cap", es: "Long.Cap", fr: "Long.Ch", de: "Kap.Län" },
  tone: { en: "Tone", it: "Tono", es: "Tono", fr: "Ton", de: "Ton" },
  cover: { en: "Cover", it: "Copertina", es: "Portada", fr: "Couverture", de: "Cover" },
  generating: { en: "Generating...", it: "Generazione...", es: "Generando...", fr: "Génération...", de: "Generierung..." },
  settings: { en: "Settings", it: "Impostazioni", es: "Configuración", fr: "Paramètres", de: "Einstellungen" },

  // Editor
  edit: { en: "Edit", it: "Modifica", es: "Editar", fr: "Éditer", de: "Bearbeiten" },
  preview: { en: "Preview", it: "Anteprima", es: "Vista previa", fr: "Aperçu", de: "Vorschau" },
  generate: { en: "Generate", it: "Genera", es: "Generar", fr: "Générer", de: "Generieren" },
  regenerate: { en: "Regenerate", it: "Rigenera", es: "Regenerar", fr: "Régénérer", de: "Regenerieren" },
  rewrite: { en: "Rewrite", it: "Riscrivi", es: "Reescribir", fr: "Réécrire", de: "Umschreiben" },
  evaluate: { en: "AI Evaluate", it: "Valuta IA", es: "Evaluar IA", fr: "Évaluer IA", de: "KI-Bewertung" },
  chapter_length: { en: "Chapter Length", it: "Lunghezza Capitolo", es: "Longitud del Capítulo", fr: "Longueur du Chapitre", de: "Kapitellänge" },
  short: { en: "Short", it: "Breve", es: "Corto", fr: "Court", de: "Kurz" },
  medium: { en: "Medium", it: "Medio", es: "Medio", fr: "Moyen", de: "Mittel" },
  long: { en: "Long", it: "Lungo", es: "Largo", fr: "Long", de: "Lang" },
  subchapters: { en: "Subchapters", it: "Sottocapitoli", es: "Subcapítulos", fr: "Sous-chapitres", de: "Unterkapitel" },
  add_subchapter: { en: "Add Subchapter", it: "Aggiungi Sottocapitolo", es: "Añadir Subcapítulo", fr: "Ajouter Sous-chapitre", de: "Unterkapitel hinzufügen" },
  themes: { en: "Themes", it: "Temi", es: "Temas", fr: "Thèmes", de: "Themen" },
  emotional_arc: { en: "Emotional Arc", it: "Arco Emotivo", es: "Arco Emocional", fr: "Arc Émotionnel", de: "Emotionaler Bogen" },
  chapter_outlines: { en: "Chapter Outlines", it: "Schema Capitoli", es: "Esquemas de Capítulos", fr: "Plans de Chapitres", de: "Kapitelübersichten" },
  ai_quality_rating: { en: "AI Quality Rating", it: "Valutazione Qualità IA", es: "Puntuación de Calidad IA", fr: "Évaluation Qualité IA", de: "KI-Qualitätsbewertung" },
  whats_missing: { en: "What's Missing", it: "Cosa Manca", es: "Qué Falta", fr: "Ce Qui Manque", de: "Was Fehlt" },
  how_to_improve: { en: "How to Improve", it: "Come Migliorare", es: "Cómo Mejorar", fr: "Comment Améliorer", de: "Verbesserungen" },
  editing: { en: "Editing", it: "In modifica", es: "Editando", fr: "Édition", de: "Bearbeitung" },
  click_to_edit: { en: "Click to edit", it: "Clicca per modificare", es: "Clic para editar", fr: "Cliquer pour modifier", de: "Zum Bearbeiten klicken" },
  empty_click_to_add: { en: "Empty — click to add content", it: "Vuoto — clicca per aggiungere", es: "Vacío — clic para añadir", fr: "Vide — cliquer pour ajouter", de: "Leer — klicken zum Hinzufügen" },

  // New Book Dialog
  create_new_book: { en: "Create New Book", it: "Crea Nuovo Libro", es: "Crear Nuevo Libro", fr: "Créer un Nouveau Livre", de: "Neues Buch Erstellen" },
  title: { en: "Title", it: "Titolo", es: "Título", fr: "Titre", de: "Titel" },
  subtitle: { en: "Subtitle", it: "Sottotitolo", es: "Subtítulo", fr: "Sous-titre", de: "Untertitel" },
  book_length: { en: "Book Length", it: "Lunghezza Libro", es: "Longitud del Libro", fr: "Longueur du Livre", de: "Buchlänge" },
  language: { en: "Language", it: "Lingua", es: "Idioma", fr: "Langue", de: "Sprache" },
  writing_style: { en: "Writing Style DNA", it: "Stile di Scrittura", es: "Estilo de Escritura", fr: "Style d'Écriture", de: "Schreibstil" },
  num_chapters: { en: "Chapters", it: "Capitoli", es: "Capítulos", fr: "Chapitres", de: "Kapitel" },
  default_length: { en: "Default Length", it: "Lunghezza Default", es: "Longitud Default", fr: "Longueur Défaut", de: "Standardlänge" },
  cancel: { en: "Cancel", it: "Annulla", es: "Cancelar", fr: "Annuler", de: "Abbrechen" },
  create_book: { en: "Create Book", it: "Crea Libro", es: "Crear Libro", fr: "Créer Livre", de: "Buch Erstellen" },
  enabled: { en: "Enabled", it: "Attivato", es: "Activado", fr: "Activé", de: "Aktiviert" },

  // Focus mode
  focus_mode: { en: "Focus Mode", it: "Modalità Focus", es: "Modo Enfoque", fr: "Mode Focus", de: "Fokusmodus" },
  exit_focus: { en: "Exit Focus", it: "Esci dal Focus", es: "Salir del Enfoque", fr: "Quitter le Focus", de: "Fokus verlassen" },

  // Molly (your AI writing companion — friendly assistant)
  ai_coach: { en: "Molly", it: "Molly", es: "Molly", fr: "Molly", de: "Molly" },
  analyze: { en: "Analyze", it: "Analizza", es: "Analizar", fr: "Analyser", de: "Analysieren" },
  clarity: { en: "Clarity", it: "Chiarezza", es: "Claridad", fr: "Clarté", de: "Klarheit" },
  emotional_impact: { en: "Emotional Impact", it: "Impatto Emotivo", es: "Impacto Emocional", fr: "Impact Émotionnel", de: "Emotionale Wirkung" },
  structure: { en: "Structure", it: "Struttura", es: "Estructura", fr: "Structure", de: "Struktur" },
  heart_score: { en: "Heart Score", it: "Punteggio Emotivo", es: "Puntuación Emocional", fr: "Score Émotionnel", de: "Herz-Score" },
  analyze_and_rewrite: { en: "Analyze & Rewrite", it: "Analizza e Riscrivi", es: "Analizar y Reescribir", fr: "Analyser et Réécrire", de: "Analysieren & Umschreiben" },
  core_problem: { en: "Core Problem", it: "Problema Principale", es: "Problema Principal", fr: "Problème Principal", de: "Kernproblem" },
  rewrite_strategy: { en: "Rewrite Strategy", it: "Strategia di Riscrittura", es: "Estrategia de Reescritura", fr: "Stratégie de Réécriture", de: "Umschreibstrategie" },
  upgrade_notes: { en: "Upgrade Notes", it: "Note di Miglioramento", es: "Notas de Mejora", fr: "Notes d'Amélioration", de: "Upgrade-Hinweise" },
  improved_text: { en: "Improved Text", it: "Testo Migliorato", es: "Texto Mejorado", fr: "Texte Amélioré", de: "Verbesserter Text" },
  apply_rewrite: { en: "Apply Rewrite", it: "Applica Riscrittura", es: "Aplicar Reescritura", fr: "Appliquer la Réécriture", de: "Umschreibung Anwenden" },
  applied: { en: "Applied ✓", it: "Applicato ✓", es: "Aplicado ✓", fr: "Appliqué ✓", de: "Angewendet ✓" },
  select_chapter_to_analyze: { en: "Select a chapter to analyze.", it: "Seleziona un capitolo da analizzare.", es: "Selecciona un capítulo para analizar.", fr: "Sélectionnez un chapitre à analyser.", de: "Wähle ein Kapitel zur Analyse." },
  quality_threshold: { en: "Quality Threshold", it: "Soglia Qualità", es: "Umbral de Calidad", fr: "Seuil de Qualité", de: "Qualitätsschwelle" },
  max_passes: { en: "Max Passes", it: "Passaggi Max", es: "Pases Máx", fr: "Passes Max", de: "Max Durchläufe" },
  auto_apply: { en: "Auto-Apply", it: "Auto-Applica", es: "Auto-Aplicar", fr: "Auto-Appliquer", de: "Auto-Anwenden" },
  run_multi_pass: { en: "Run Multi-Pass Rewrite", it: "Avvia Riscrittura Multi-Pass", es: "Ejecutar Reescritura Multi-Pase", fr: "Lancer Réécriture Multi-Passes", de: "Multi-Pass Umschreibung Starten" },
  pass: { en: "Pass", it: "Passaggio", es: "Pase", fr: "Passe", de: "Durchlauf" },
  processing_pass: { en: "Processing pass", it: "Elaborazione passaggio", es: "Procesando pase", fr: "Traitement passe", de: "Verarbeite Durchlauf" },
  final_score: { en: "Final Score", it: "Punteggio Finale", es: "Puntuación Final", fr: "Score Final", de: "Endergebnis" },
  threshold_reached: { en: "Threshold reached!", it: "Soglia raggiunta!", es: "¡Umbral alcanzado!", fr: "Seuil atteint !", de: "Schwelle erreicht!" },
  improvement_summary: { en: "Improvement Summary", it: "Riepilogo Miglioramenti", es: "Resumen de Mejoras", fr: "Résumé des Améliorations", de: "Verbesserungsübersicht" },
  version_history: { en: "Version History", it: "Cronologia Versioni", es: "Historial de Versiones", fr: "Historique des Versions", de: "Versionshistorie" },
  original: { en: "Original", it: "Originale", es: "Original", fr: "Original", de: "Original" },
  details: { en: "Details", it: "Dettagli", es: "Detalles", fr: "Détails", de: "Details" },
  issues_found: { en: "Issues found", it: "Problemi trovati", es: "Problemas encontrados", fr: "Problèmes trouvés", de: "Gefundene Probleme" },
  fixes_applied: { en: "Fixes applied", it: "Correzioni applicate", es: "Correcciones aplicadas", fr: "Corrections appliquées", de: "Angewandte Korrekturen" },
  final_version: { en: "Final Version", it: "Versione Finale", es: "Versión Final", fr: "Version Finale", de: "Endversion" },
  apply_final_version: { en: "Apply Final Version", it: "Applica Versione Finale", es: "Aplicar Versión Final", fr: "Appliquer Version Finale", de: "Endversion Anwenden" },

  // Settings
  interface_language: { en: "Interface Language", it: "Lingua Interfaccia", es: "Idioma de Interfaz", fr: "Langue d'Interface", de: "Oberflächensprache" },
  font: { en: "Font", it: "Carattere", es: "Fuente", fr: "Police", de: "Schrift" },
  font_size: { en: "Font Size", it: "Dimensione", es: "Tamaño", fr: "Taille", de: "Größe" },
  line_spacing: { en: "Line Spacing", it: "Interlinea", es: "Interlineado", fr: "Interligne", de: "Zeilenabstand" },

  // General
  complete_msg: { en: "Book generation complete — Ready to export!", it: "Generazione completata — Pronto per l'esportazione!", es: "Generación completa — ¡Listo para exportar!", fr: "Génération terminée — Prêt à exporter !", de: "Buchgenerierung abgeschlossen — Exportbereit!" },
  table_of_contents: { en: "Table of Contents", it: "Indice", es: "Índice", fr: "Table des Matières", de: "Inhaltsverzeichnis" },
  no_project: { en: "Create a new book or select a project to begin writing.", it: "Crea un nuovo libro o seleziona un progetto per iniziare.", es: "Crea un nuevo libro o selecciona un proyecto para empezar.", fr: "Créez un livre ou sélectionnez un projet pour commencer.", de: "Erstelle ein neues Buch oder wähle ein Projekt zum Starten." },
  select_project_prompt: { en: "Create or select a project to begin.", it: "Crea o seleziona un progetto.", es: "Crea o selecciona un proyecto.", fr: "Créez ou sélectionnez un projet.", de: "Erstelle oder wähle ein Projekt." },
  // Progress messages
  progress_analyzing: { en: "Analyzing structure...", it: "Analizzando la struttura...", es: "Analizando estructura...", fr: "Analyse de la structure...", de: "Struktur wird analysiert..." },
  progress_writing: { en: "Writing chapter...", it: "Scrivendo il capitolo...", es: "Escribiendo capítulo...", fr: "Écriture du chapitre...", de: "Kapitel wird geschrieben..." },
  progress_enhancing: { en: "Enhancing narrative...", it: "Migliorando la narrativa...", es: "Mejorando la narrativa...", fr: "Amélioration du récit...", de: "Erzählung wird verbessert..." },
  progress_refining: { en: "Refining style...", it: "Raffinando lo stile...", es: "Refinando el estilo...", fr: "Affinement du style...", de: "Stil wird verfeinert..." },
  progress_finalizing: { en: "Finalizing...", it: "Finalizzando...", es: "Finalizando...", fr: "Finalisation...", de: "Abschluss..." },
  generation_failed: { en: "Generation failed — retry?", it: "Generazione fallita — riprovare?", es: "Generación fallida — ¿reintentar?", fr: "Génération échouée — réessayer ?", de: "Generierung fehlgeschlagen — erneut versuchen?" },
  retry: { en: "Retry", it: "Riprova", es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen" },
  stop_generation: { en: "Stop generation", it: "Ferma generazione", es: "Detener generación", fr: "Arrêter la génération", de: "Generierung stoppen" },

  // Home
  home_subtitle: { en: "Create, Optimize, Publish", it: "Crea, Ottimizza, Pubblica", es: "Crea, Optimiza, Publica", fr: "Créer, Optimiser, Publier", de: "Erstellen, Optimieren, Veröffentlichen" },
  write: { en: "Write Book", it: "Scrivi Libro", es: "Escribir Libro", fr: "Écrire un Livre", de: "Buch Schreiben" },
  write_desc: { en: "Open the editor and continue writing", it: "Apri l'editor e continua a scrivere", es: "Abre el editor y sigue escribiendo", fr: "Ouvrez l'éditeur et continuez à écrire", de: "Editor öffnen und weiterschreiben" },
  new_book_desc: { en: "Start a new AI-powered book project", it: "Inizia un nuovo progetto libro con IA", es: "Inicia un nuevo proyecto de libro con IA", fr: "Commencez un nouveau projet de livre IA", de: "Neues KI-Buchprojekt starten" },
  projects_desc: { en: "Browse and manage your book library", it: "Sfoglia e gestisci la tua libreria", es: "Explora y gestiona tu biblioteca", fr: "Parcourir et gérer votre bibliothèque", de: "Bibliothek durchsuchen und verwalten" },
  publish: { en: "Publish Mode", it: "Modalità Pubblicazione", es: "Modo Publicación", fr: "Mode Publication", de: "Veröffentlichungsmodus" },
  publish_desc: { en: "Description, keywords, cover — all in one", it: "Descrizione, keyword, copertina — tutto in uno", es: "Descripción, palabras clave, portada — todo en uno", fr: "Description, mots-clés, couverture — tout-en-un", de: "Beschreibung, Keywords, Cover — alles in einem" },
  title_intelligence: { en: "Title Domination Studio", it: "Title Domination Studio", es: "Inteligencia de Títulos", fr: "Intelligence de Titres", de: "Titel-Intelligenz" },
  title_intelligence_desc: { en: "Find high-converting titles for KDP", it: "Trova titoli ad alta conversione per KDP", es: "Encuentra títulos de alta conversión para KDP", fr: "Trouvez des titres à forte conversion pour KDP", de: "Hochkonvertierende Titel für KDP finden" },
  export_label: { en: "Export", it: "Esporta", es: "Exportar", fr: "Exporter", de: "Exportieren" },
  export_desc: { en: "Download EPUB, PDF, or DOCX", it: "Scarica EPUB, PDF o DOCX", es: "Descarga EPUB, PDF o DOCX", fr: "Téléchargez EPUB, PDF ou DOCX", de: "EPUB, PDF oder DOCX herunterladen" },
  continue_project: { en: "Continue where you left off", it: "Continua da dove avevi lasciato", es: "Continúa donde lo dejaste", fr: "Reprenez où vous en étiez", de: "Dort weitermachen, wo Sie aufgehört haben" },
  last_project: { en: "Last Project", it: "Ultimo Progetto", es: "Último Proyecto", fr: "Dernier Projet", de: "Letztes Projekt" },
  my_projects: { en: "My Projects", it: "I Miei Progetti", es: "Mis Proyectos", fr: "Mes Projets", de: "Meine Projekte" },
  no_projects_yet: { en: "No projects yet", it: "Nessun progetto", es: "Sin proyectos aún", fr: "Aucun projet", de: "Noch keine Projekte" },
  home: { en: "Home", it: "Home", es: "Inicio", fr: "Accueil", de: "Start" },

  // Publish Panel
  publish_mode: { en: "Publish Mode", it: "Modalità Pubblicazione", es: "Modo Publicación", fr: "Mode Publication", de: "Veröffentlichungsmodus" },
  prepare_kdp: { en: "Prepare your book for Amazon KDP", it: "Prepara il tuo libro per Amazon KDP", es: "Prepara tu libro para Amazon KDP", fr: "Préparez votre livre pour Amazon KDP", de: "Bereiten Sie Ihr Buch für Amazon KDP vor" },
  book_description: { en: "Book Description", it: "Descrizione Libro", es: "Descripción del Libro", fr: "Description du Livre", de: "Buchbeschreibung" },
  keyword_strategy: { en: "Keyword Strategy", it: "Strategia Keyword", es: "Estrategia de Palabras Clave", fr: "Stratégie de Mots-clés", de: "Keyword-Strategie" },
  title_optimizer: { en: "Title Optimizer", it: "Ottimizzatore Titoli", es: "Optimizador de Títulos", fr: "Optimiseur de Titres", de: "Titel-Optimierer" },
  cover_generator: { en: "Cover Generator", it: "Generatore Copertina", es: "Generador de Portada", fr: "Générateur de Couverture", de: "Cover-Generator" },
  title_shadow_engine: { en: "Title Domination Studio (Shadow Engine)", it: "Title Domination Studio (Shadow Engine)", es: "Inteligencia de Títulos (Shadow Engine)", fr: "Intelligence de Titres (Shadow Engine)", de: "Titel-Intelligenz (Shadow Engine)" },
  publish_checklist: { en: "Publish Checklist", it: "Checklist Pubblicazione", es: "Lista de Verificación", fr: "Liste de Contrôle", de: "Veröffentlichungs-Checkliste" },
  regenerate_btn: { en: "Regenerate", it: "Rigenera", es: "Regenerar", fr: "Régénérer", de: "Regenerieren" },
  generate_btn: { en: "Generate", it: "Genera", es: "Generar", fr: "Générer", de: "Generieren" },
  book_completed: { en: "Book completed", it: "Libro completato", es: "Libro completado", fr: "Livre terminé", de: "Buch abgeschlossen" },
  description_ready: { en: "Description ready", it: "Descrizione pronta", es: "Descripción lista", fr: "Description prête", de: "Beschreibung fertig" },
  keywords_ready: { en: "Keywords ready", it: "Keyword pronte", es: "Palabras clave listas", fr: "Mots-clés prêts", de: "Keywords fertig" },
  title_optimized: { en: "Title optimized", it: "Titolo ottimizzato", es: "Título optimizado", fr: "Titre optimisé", de: "Titel optimiert" },
  title_intel_ready: { en: "Title Domination Studio ready", it: "Title Domination Studio pronta", es: "Inteligencia de Títulos lista", fr: "Intelligence de Titres prête", de: "Titel-Intelligenz fertig" },
  cover_ready: { en: "Cover prompt ready", it: "Prompt copertina pronto", es: "Prompt de portada listo", fr: "Prompt de couverture prêt", de: "Cover-Prompt fertig" },
  export_ready: { en: "Export ready (EPUB/PDF/DOCX)", it: "Esportazione pronta (EPUB/PDF/DOCX)", es: "Exportación lista (EPUB/PDF/DOCX)", fr: "Export prêt (EPUB/PDF/DOCX)", de: "Export bereit (EPUB/PDF/DOCX)" },
  ready_to_publish: { en: "Ready to publish on Amazon KDP!", it: "Pronto per la pubblicazione su Amazon KDP!", es: "¡Listo para publicar en Amazon KDP!", fr: "Prêt à publier sur Amazon KDP !", de: "Bereit zur Veröffentlichung auf Amazon KDP!" },
  complete_all_items: { en: "Complete all items above before publishing.", it: "Completa tutti gli elementi sopra prima di pubblicare.", es: "Completa todos los elementos antes de publicar.", fr: "Complétez tous les éléments avant de publier.", de: "Alle Punkte oben abschließen." },
  primary_titles: { en: "Primary Titles", it: "Titoli Principali", es: "Títulos Principales", fr: "Titres Principaux", de: "Haupttitel" },
  shadow_titles: { en: "Shadow Titles (Indexing Only)", it: "Titoli Shadow (Solo Indicizzazione)", es: "Títulos Shadow (Solo Indexación)", fr: "Titres Shadow (Indexation)", de: "Shadow-Titel (Nur Indexierung)" },
  final_optimized: { en: "Final Optimized Version", it: "Versione Finale Ottimizzata", es: "Versión Final Optimizada", fr: "Version Finale Optimisée", de: "Finale Optimierte Version" },
  bestseller_pick: { en: "Bestseller Pick", it: "Scelta Bestseller", es: "Selección Bestseller", fr: "Choix Bestseller", de: "Bestseller-Auswahl" },

  // Sync status
  sync_saving: { en: "Cloud sync...", it: "Sync cloud...", es: "Sync cloud...", fr: "Sync cloud...", de: "Cloud-Sync..." },
  sync_saved: { en: "Cloud active", it: "Cloud attivo", es: "Cloud activo", fr: "Cloud actif", de: "Cloud aktiv" },
  sync_pending: { en: "Cloud pending", it: "Cloud in attesa", es: "Cloud pendiente", fr: "Cloud en attente", de: "Cloud wartet" },
  sync_offline: { en: "Offline (local only)", it: "Offline (solo locale)", es: "Sin conexión (solo local)", fr: "Hors ligne (local)", de: "Offline (nur lokal)" },

  // Toast messages
  toast_gen_retrying: { en: "Generation failed, retrying...", it: "Generazione fallita, nuovo tentativo...", es: "Generación fallida, reintentando...", fr: "Génération échouée, nouvelle tentative...", de: "Generierung fehlgeschlagen, neuer Versuch..." },
  toast_gen_failed: { en: "Generation failed. Please try again.", it: "Generazione fallita. Riprova.", es: "Generación fallida. Inténtalo de nuevo.", fr: "Génération échouée. Réessayez.", de: "Generierung fehlgeschlagen. Bitte erneut versuchen." },
  toast_saved_locally: { en: "Saved locally. Cloud sync pending.", it: "Salvato localmente. Sincronizzazione cloud in attesa.", es: "Guardado localmente. Sincronización pendiente.", fr: "Sauvegardé localement. Sync cloud en attente.", de: "Lokal gespeichert. Cloud-Sync ausstehend." },
};

let currentLang: UILanguage = (localStorage.getItem("nexora_ui_lang") as UILanguage) || "en";

export function setUILanguage(lang: UILanguage) {
  currentLang = lang;
  localStorage.setItem("nexora_ui_lang", lang);
}

export function getUILanguage(): UILanguage {
  return currentLang;
}

export function t(key: string): string {
  return translations[key]?.[currentLang] || translations[key]?.["en"] || key;
}
