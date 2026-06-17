export interface GenreTruthLockInput {
  genre?: string;
  bookTypeId?: string;
  category?: string;
  subcategory?: string;
  subgenre?: string;
  level1BookType?: string;
}

function norm(value?: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-")
    .trim();
}

function bag(input: GenreTruthLockInput): string {
  return [
    input.genre,
    input.bookTypeId,
    input.category,
    input.subcategory,
    input.subgenre,
    input.level1BookType,
  ].map(norm).join(" ");
}

export function resolveGenreTruthFamily(input: GenreTruthLockInput):
  | "dark-romance"
  | "romance"
  | "thriller"
  | "horror"
  | "fantasy"
  | "poetry"
  | "business"
  | "self-help"
  | "manual"
  | "education"
  | "nonfiction"
  | "fiction"
  | "general" {
  const text = bag(input);

  if (/dark[- ]?romance|romance oscuro|ossession|possessiv|proibito/.test(text)) return "dark-romance";
  if (/romance|slow burn|enemies to lovers|amore|relazione/.test(text)) return "romance";
  if (/thriller|suspense|crime|noir|mistero|indagine|detective/.test(text)) return "thriller";
  if (/horror|gothic|gotico|terrore|incubo|occult/.test(text)) return "horror";
  if (/fantasy|magia|regno|epic|epico|lore|drago|mondo immaginario/.test(text)) return "fantasy";
  if (/poetry|poesia|poet|versi|lirica|raccolta poetica/.test(text)) return "poetry";
  if (/business|startup|marketing|vendite|leadership|imprenditor/.test(text)) return "business";
  if (/self[- ]?help|crescita personale|mindset|benessere|abitudini|trasformazione personale/.test(text)) return "self-help";
  if (/manual|manuale|guida|how[- ]?to|tutorial|istruzioni|passo per passo/.test(text)) return "manual";
  if (/education|educational|studio|didattic|scuola|universit|esame|student/.test(text)) return "education";
  if (/non[- ]?fiction|saggio|divulgativo|filosofia|argomentativo|essay/.test(text)) return "nonfiction";
  if (/fiction|narrativa|romanzo|novel|racconto|literary/.test(text)) return "fiction";

  return "general";
}

export function buildGenreTruthLock(input: GenreTruthLockInput): string {
  const family = resolveGenreTruthFamily(input);

  const header = [
    "GENRE TRUTH LOCK:",
    "Rispetta il contratto editoriale del libro. Non trasformare il genere in un altro formato solo perché compaiono parole emotive, filosofiche, pratiche o commerciali.",
  ];

  const fictionBase = [
    "FAMILY LOCK FICTION/NARRATIVE:",
    "Questo libro deve essere costruito come narrativa: protagonisti, desiderio, conflitto, scene, svolte, conseguenze, tensione progressiva, climax e payoff.",
    "I capitoli devono essere archi narrativi, non lezioni.",
    "Vietato trasformare il blueprint in saggio, manuale, lista di concetti, autori teorici o struttura argomentativa.",
  ];

  switch (family) {
    case "dark-romance":
      return [
        ...header,
        "ROMANZO DARK ROMANCE OBBLIGATORIO:",
        "Deve restare un romanzo dark romance adulto: attrazione proibita, ossessione, potere, segreti, ferite emotive, confini morali, slow burn, rischio, vulnerabilità e payoff intenso.",
        "Ogni capitolo deve avanzare relazione, desiderio, pericolo, segreto o conflitto tra i protagonisti.",
        "Vietato trasformarlo in filosofia, self-help, analisi psicologica astratta, lezioni o esperimenti mentali.",
        "Sottocapitoli solo se narrativamente utili; non usarli come lezioni teoriche.",
      ].join("\n");

    case "romance":
      return [
        ...header,
        "ROMANZO ROMANCE OBBLIGATORIO:",
        "Deve restare un romanzo romance: chimica, vulnerabilità, ostacolo relazionale, desiderio crescente, conflitto emotivo, micro-payoff e payoff finale.",
        "Ogni capitolo deve muovere la relazione e la trasformazione emotiva dei protagonisti.",
        "Vietato trasformarlo in saggio sull'amore, manuale relazionale o riflessione generica.",
      ].join("\n");

    case "thriller":
      return [
        ...header,
        "THRILLER LOCK:",
        "Deve restare thriller: minaccia, mistero, sospetto, pressione, escalation, indizi, false piste, twist e resa dei conti.",
        "Ogni capitolo deve aumentare domanda, rischio o urgenza.",
        "Vietato trasformarlo in saggio psicologico, memoir o romanzo contemplativo senza tensione.",
      ].join("\n");

    case "horror":
      return [
        ...header,
        "HORROR LOCK:",
        "Deve restare horror: atmosfera, paura, minaccia, perturbante, escalation, vulnerabilità, rivelazione inquietante e conseguenze.",
        "Ogni capitolo deve aumentare disagio, mistero o terrore.",
        "Vietato trasformarlo in thriller generico, saggio sul trauma o descrizione atmosferica senza minaccia.",
      ].join("\n");

    case "fantasy":
      return [
        ...header,
        "FANTASY LOCK:",
        "Deve restare fantasy: mondo, regole, lore, potere, viaggio, conflitto, antagonista, meraviglia, costo della magia e trasformazione dell'eroe.",
        "Ogni capitolo deve avanzare missione, mondo, scelta, minaccia o rivelazione.",
        "Vietato trasformarlo in allegoria astratta, manuale di worldbuilding o saggio spirituale.",
      ].join("\n");

    case "poetry":
      return [
        ...header,
        "POETRY LOCK:",
        "Deve restare raccolta poetica: sezioni poetiche, immagini, ritmo, silenzi, progressione emotiva, ricorrenze simboliche.",
        "La struttura deve rispettare versi, frammenti, sezioni o cicli poetici.",
        "Vietato trasformarla in saggio, romanzo lineare o manuale motivazionale.",
      ].join("\n");

    case "self-help":
      return [
        ...header,
        "SELF-HELP LOCK:",
        "Deve restare self-help: promessa chiara, problema del lettore, metodo, esempi concreti, esercizi, trasformazione e passi applicabili.",
        "Ogni capitolo deve dare valore pratico e avanzare il percorso del lettore.",
        "Vietato trasformarlo in romanzo emotivo, memoir vago o filosofia senza applicazione.",
      ].join("\n");

    case "business":
      return [
        ...header,
        "BUSINESS LOCK:",
        "Deve restare business/nonfiction professionale: tesi, framework, casi, strategia, esempi, strumenti, decisioni e azioni applicabili.",
        "Ogni capitolo deve aumentare chiarezza operativa o vantaggio pratico.",
        "Vietato trasformarlo in memoir, motivazionale generico o romanzo aziendale.",
      ].join("\n");

    case "manual":
      return [
        ...header,
        "MANUAL LOCK:",
        "Deve restare manuale/guida pratica: spiegazione progressiva, step, esempi, errori comuni, checklist, strumenti e applicazione.",
        "Ogni capitolo deve insegnare qualcosa di usabile.",
        "Vietato trasformarlo in saggio contemplativo, romanzo o raccolta di riflessioni.",
      ].join("\n");

    case "education":
      return [
        ...header,
        "EDUCATION/STUDY LOCK:",
        "Deve restare educativo: spiegazioni chiare, progressione didattica, esempi, esercizi, ripasso, verifica e memoria.",
        "Ogni capitolo deve facilitare apprendimento e comprensione.",
        "Vietato trasformarlo in narrativa o saggio filosofico non didattico.",
      ].join("\n");

    case "nonfiction":
      return [
        ...header,
        "NONFICTION/SAGGIO LOCK:",
        "Deve restare nonfiction/saggio: tesi, argomentazione, esempi, casi, chiarezza, progressione logica e valore per il lettore.",
        "Ogni capitolo deve sostenere una domanda o una tesi.",
        "Vietato trasformarlo in romanzo mascherato o raccolta di scene senza argomentazione.",
      ].join("\n");

    case "fiction":
      return [...header, ...fictionBase].join("\n");

    default:
      return [
        ...header,
        "GENERAL LOCK:",
        "Prima di generare il blueprint, scegli una forma editoriale coerente con le risposte dell'autore e mantienila fino alla fine.",
        "Se il genere è incerto, non forzare saggio o romanzo: conserva coerenza con tipo libro, pubblico, promessa e tono dichiarati.",
      ].join("\n");
  }
}
