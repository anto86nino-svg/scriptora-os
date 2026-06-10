export interface ProfessionalDictionaryEntry {
  word: string;
  simple: string;
  technical: string;
  example: string;
  field?: string;
}

const PROFESSIONAL_DICTIONARY: Record<string, ProfessionalDictionaryEntry> = {
  "causa": {
    word: "Causa",
    simple: "È il motivo per cui succede qualcosa.",
    technical: "In ambito storico, scientifico o logico indica il fattore che produce o contribuisce a produrre un effetto.",
    example: "Per studiare una guerra, devi distinguere cause immediate e cause profonde.",
    field: "Metodo di studio",
  },
  "conseguenza": {
    word: "Conseguenza",
    simple: "È ciò che accade dopo un fatto importante.",
    technical: "È l'effetto generato da una causa, spesso collegato a eventi successivi in una catena logica o storica.",
    example: "Una conseguenza della guerra può essere una crisi economica o un cambiamento politico.",
    field: "Metodo di studio",
  },
  "contesto": {
    word: "Contesto",
    simple: "È la situazione intorno a un fatto.",
    technical: "Indica l'insieme di condizioni storiche, sociali, culturali, economiche o politiche che aiutano a interpretare un evento.",
    example: "Per capire un trattato, devi conoscere il contesto in cui è stato firmato.",
    field: "Metodo di studio",
  },
  "processo": {
    word: "Processo",
    simple: "È una serie di passaggi collegati.",
    technical: "Indica una trasformazione graduale composta da fasi, cause, sviluppi ed effetti.",
    example: "L'industrializzazione è un processo, non un evento isolato.",
    field: "Metodo di studio",
  },
  "fenomeno": {
    word: "Fenomeno",
    simple: "È qualcosa che accade e può essere osservato o studiato.",
    technical: "In scienze, storia e sociologia indica un fatto complesso analizzabile attraverso dati, cause e conseguenze.",
    example: "La migrazione è un fenomeno sociale.",
    field: "Scienze umane",
  },
  "sistema": {
    word: "Sistema",
    simple: "È un insieme di parti che funzionano insieme.",
    technical: "Indica una struttura composta da elementi interdipendenti, dove il cambiamento di una parte può influenzare le altre.",
    example: "Il sistema politico comprende istituzioni, leggi e rapporti di potere.",
    field: "Scienze sociali",
  },
  "struttura": {
    word: "Struttura",
    simple: "È il modo in cui qualcosa è organizzato.",
    technical: "Indica l'organizzazione interna di un testo, una società, un organismo, un sistema o un ragionamento.",
    example: "Per studiare bene un capitolo, guarda prima la sua struttura.",
    field: "Metodo di studio",
  },
  "ipotesi": {
    word: "Ipotesi",
    simple: "È un'idea da verificare.",
    technical: "È una spiegazione provvisoria formulata prima della verifica tramite prove, dati o ragionamento.",
    example: "Lo scienziato formula un'ipotesi e poi la testa con un esperimento.",
    field: "Scienze",
  },
  "tesi": {
    word: "Tesi",
    simple: "È l'idea principale che vuoi dimostrare.",
    technical: "In un testo argomentativo o accademico è l'affermazione centrale sostenuta da prove e ragionamenti.",
    example: "La tesi del saggio deve essere chiara già nell'introduzione.",
    field: "Scrittura accademica",
  },
  "argomentazione": {
    word: "Argomentazione",
    simple: "È il modo in cui spieghi e difendi un'idea.",
    technical: "È una sequenza logica di affermazioni, prove ed esempi usata per sostenere una tesi.",
    example: "Una buona argomentazione non dice solo cosa pensi, ma perché.",
    field: "Scrittura accademica",
  },
  "analisi": {
    word: "Analisi",
    simple: "Significa dividere un argomento in parti per capirlo meglio.",
    technical: "È un processo di scomposizione e interpretazione di dati, testi, eventi o concetti.",
    example: "Fare l'analisi di un testo significa capire tema, struttura, stile e significato.",
    field: "Metodo di studio",
  },
  "sintesi": {
    word: "Sintesi",
    simple: "È riassumere le cose importanti.",
    technical: "È la ricostruzione essenziale di un contenuto dopo aver individuato concetti centrali e relazioni.",
    example: "Dopo aver studiato, fai una sintesi di dieci righe.",
    field: "Metodo di studio",
  },
  "paradigma": {
    word: "Paradigma",
    simple: "È un modello di riferimento.",
    technical: "Indica un insieme di idee, regole o esempi che guidano il modo in cui si interpreta una realtà o una disciplina.",
    example: "Un nuovo paradigma scientifico cambia il modo di vedere un problema.",
    field: "Accademico",
  },
  "ideologia": {
    word: "Ideologia",
    simple: "È un insieme di idee su società, politica o mondo.",
    technical: "Sistema coerente di valori, convinzioni e interpretazioni che orienta scelte politiche, sociali o culturali.",
    example: "Per capire un partito politico devi conoscere la sua ideologia.",
    field: "Storia/Politica",
  },
  "egemonia": {
    word: "Egemonia",
    simple: "È il predominio di qualcuno sugli altri.",
    technical: "Indica una forma di superiorità politica, culturale, economica o militare esercitata da uno Stato, gruppo o classe.",
    example: "Una potenza può avere egemonia economica senza controllare direttamente un territorio.",
    field: "Storia/Politica",
  },
  "sovranità": {
    word: "Sovranità",
    simple: "È il potere di governare in modo autonomo.",
    technical: "Indica l'autorità suprema di uno Stato sul proprio territorio e sulle proprie decisioni politiche.",
    example: "La sovranità nazionale riguarda il potere dello Stato di decidere per sé.",
    field: "Diritto/Politica",
  },
  "democrazia": {
    word: "Democrazia",
    simple: "È un sistema in cui il popolo partecipa al governo.",
    technical: "Forma di governo fondata su rappresentanza, diritti, partecipazione politica e legittimazione popolare.",
    example: "In una democrazia, le elezioni libere sono essenziali.",
    field: "Politica",
  },
  "economia": {
    word: "Economia",
    simple: "Studia come si producono e si usano risorse e denaro.",
    technical: "Disciplina che analizza produzione, distribuzione e consumo di beni e servizi.",
    example: "Una crisi economica può influenzare lavoro, prezzi e famiglie.",
    field: "Economia",
  },
  "inflazione": {
    word: "Inflazione",
    simple: "È l'aumento generale dei prezzi.",
    technical: "Processo economico in cui il livello medio dei prezzi cresce, riducendo il potere d'acquisto della moneta.",
    example: "Se l'inflazione aumenta, con gli stessi soldi compri meno cose.",
    field: "Economia",
  },
  "metabolismo": {
    word: "Metabolismo",
    simple: "È il modo in cui il corpo usa energia.",
    technical: "Insieme delle reazioni chimiche che permettono agli organismi di trasformare sostanze in energia e materiali utili.",
    example: "Il metabolismo trasforma il cibo in energia.",
    field: "Biologia",
  },
  "ecosistema": {
    word: "Ecosistema",
    simple: "È un ambiente con esseri viventi che interagiscono.",
    technical: "Sistema formato da organismi viventi e fattori fisici che scambiano energia e materia.",
    example: "Un bosco è un ecosistema.",
    field: "Scienze",
  },
  "molecola": {
    word: "Molecola",
    simple: "È un gruppo di atomi uniti.",
    technical: "Unità chimica composta da due o più atomi legati tra loro.",
    example: "L'acqua è una molecola formata da idrogeno e ossigeno.",
    field: "Chimica",
  },
  "energia": {
    word: "Energia",
    simple: "È la capacità di compiere lavoro o produrre cambiamento.",
    technical: "Grandezza fisica associata alla possibilità di generare movimento, calore, luce o trasformazioni.",
    example: "Una batteria immagazzina energia chimica.",
    field: "Fisica",
  },
  "algoritmo": {
    word: "Algoritmo",
    simple: "È una sequenza di istruzioni per risolvere un problema.",
    technical: "Procedura finita e ordinata di passaggi logici o computazionali che produce un risultato.",
    example: "Una ricetta è simile a un algoritmo: segui passaggi e ottieni un risultato.",
    field: "Informatica",
  },
  "variabile": {
    word: "Variabile",
    simple: "È un elemento che può cambiare.",
    technical: "In matematica, scienze o programmazione indica una quantità o un valore non fisso.",
    example: "In un esperimento, la temperatura può essere una variabile.",
    field: "Matematica/Scienze",
  },
  "funzione": {
    word: "Funzione",
    simple: "È una relazione o un compito svolto da qualcosa.",
    technical: "In matematica è una relazione tra input e output; in altri contesti indica il ruolo di un elemento.",
    example: "La funzione del cuore è pompare sangue.",
    field: "Matematica/Scienze",
  },
};

function normalizeWord(word: string): string {
  return String(word || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}'’-]/gu, "")
    .trim();
}

function titleCase(word: string): string {
  const clean = String(word || "").trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1).toLowerCase() : "Termine";
}

function inferField(word: string): string {
  const w = normalizeWord(word);

  if (/(zione|mento|ita|ismo|logia|grafia|metria)$/.test(w)) return "Termine accademico";
  if (/(osi|asi|ite|oma|emia)$/.test(w)) return "Scienze/Biologia";
  if (/(crazia|archia|polis|stato|sovran|governo)$/.test(w)) return "Storia/Politica";
  if (/(grafico|equazione|funzione|variabile|coefficiente)$/.test(w)) return "Matematica";
  if (/(mercato|capitale|moneta|prezzo|credito|debito)$/.test(w)) return "Economia";
  return "Lessico avanzato";
}

function inferSimple(word: string): string {
  const nice = titleCase(word);
  const w = normalizeWord(word);

  if (w.endsWith("zione")) return `${nice} indica spesso un'azione, un processo o il risultato di qualcosa.`;
  if (w.endsWith("mento")) return `${nice} indica spesso un cambiamento, uno sviluppo o una fase di un processo.`;
  if (w.endsWith("ismo")) return `${nice} indica spesso una dottrina, un movimento, un sistema di idee o una tendenza.`;
  if (w.endsWith("logia")) return `${nice} indica spesso uno studio o una disciplina.`;
  if (w.endsWith("ita")) return `${nice} indica spesso una qualità, una condizione o una caratteristica.`;

  return `${nice} è una parola importante del testo: va capita, non solo memorizzata.`;
}

function inferTechnical(word: string): string {
  const nice = titleCase(word);
  const field = inferField(word);
  return `Nel contesto di studio, "${nice}" funziona come termine chiave di area ${field}: aiuta a riconoscere tema, relazioni logiche e possibili domande d'esame.`;
}

export function explainProfessionalWord(word: string): ProfessionalDictionaryEntry {
  const key = normalizeWord(word);
  const known = PROFESSIONAL_DICTIONARY[key];

  if (known) return known;

  const nice = titleCase(word);

  return {
    word: nice,
    simple: inferSimple(nice),
    technical: inferTechnical(nice),
    example: `Esempio: quando incontri "${nice}", prova a definirlo con parole tue e poi collegarlo al concetto principale del capitolo.`,
    field: inferField(nice),
  };
}

export function isLikelyDifficultWord(word: string): boolean {
  const key = normalizeWord(word);
  if (!key || key.length < 7) return false;
  if (PROFESSIONAL_DICTIONARY[key]) return true;
  return /(zione|mento|ismo|logia|grafia|metria|crazia|archia|ita|ale|ico|ica|osi|asi|ema|enza|anza)$/i.test(key);
}

export function extractProfessionalTerms(text: string, limit = 12): string[] {
  const words = text.toLowerCase().match(/[\p{L}][\p{L}'’-]{5,}/gu) || [];
  const counts = new Map<string, number>();

  for (const raw of words) {
    const clean = normalizeWord(raw);
    if (!clean || clean.length < 6) continue;
    const score = (counts.get(clean) || 0) + (isLikelyDifficultWord(clean) ? 3 : 1);
    counts.set(clean, score);
  }

  return [...counts.entries()]
    .filter(([word]) => isLikelyDifficultWord(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}
