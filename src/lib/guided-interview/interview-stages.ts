import type { GuidedInterviewState, InterviewQuestion, InterviewQuickSuggestion } from "./types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { inferBookProfileFromText } from "./dna-inference";
import {
  countForgeUserAnswers,
  FORGE_OPENING_QUESTION_ID,
  getForgeOpeningGreeting,
  isFirstForgeAssistantMessage,
  isTechnicalPrematureContent,
} from "./opening-experience";

export type InterviewStage =
  | "welcome"
  | "spark"
  | "direction"
  | "promise"
  | "audience"
  | "genre-dna"
  | "character"
  | "plot"
  | "structure"
  | "title"
  | "index";

const GENERIC_PLACEHOLDER =
  "Parla liberamente: idea, note, voce, caos… Scriptora organizzerà il resto.";

const UNCERTAIN_PATTERNS =
  /^(non lo so|non so|boh|forse|dipende|aiutami|guidami|non sono sicur|non saprei|fammi vedere|alternative)/i;

export const OPENING_QUICK_CHOICES: InterviewQuickSuggestion[] = [
  { label: "Ho solo un'idea confusa", value: "Ho solo un'idea confusa, ancora sfocata." },
  { label: "Partiamo da un personaggio", value: "Voglio partire da un personaggio che non riesco a togliermi dalla testa." },
  { label: "Partiamo da una scena", value: "Voglio partire da una scena precisa che vedo già davanti a me." },
  { label: "Partiamo da un titolo", value: "Ho già un titolo o un'immagine-titolo da cui partire." },
  { label: "Guidami tu", value: "Non lo so ancora — guidami tu con domande semplici." },
];

const GENRE_DIRECTION_CHOICES: Record<string, InterviewQuickSuggestion[]> = {
  "dark-romance": [
    { label: "Ossessione elegante", value: "Ossessione elegante, magnetica, moralmente ambigua." },
    { label: "Relazione tossica", value: "Relazione tossica ma irresistibile, con conseguenze reali." },
    { label: "Segreti criminali", value: "Segreti criminali e desiderio proibito." },
    { label: "Trauma e guarigione", value: "Trauma e guarigione lenta, con attrazione pericolosa." },
    { label: "Desiderio proibito", value: "Desiderio proibito che non può essere ignorato." },
  ],
  thriller: [
    { label: "Bugia centrale", value: "Una bugia centrale che contamina tutto." },
    { label: "Minaccia esterna", value: "Una minaccia esterna che si avvicina." },
    { label: "Indagine", value: "Un'indagine dove ogni indizio mente." },
    { label: "Paranoia psicologica", value: "Paranoia psicologica — il lettore non sa chi credere." },
    { label: "Countdown", value: "Un conto alla rovescia che non perdona ritardi." },
  ],
  horror: [
    { label: "Paura soprannaturale", value: "Paura soprannaturale, con regole precise da infrangere." },
    { label: "Orrore psicologico", value: "Orrore psicologico — la mente è il vero nemico." },
    { label: "Minaccia sociale", value: "Una minaccia sociale che corrompe il quotidiano." },
    { label: "Regola dell'orrore", value: "C'è una regola dell'orrore: se la infrangi, paghi." },
    { label: "Atmosfera gotica", value: "Atmosfera gotica, lenta, piena di presagi." },
  ],
  romance: [
    { label: "Slow burn", value: "Slow burn — desiderio trattenuto fino all'ultimo." },
    { label: "Seconda possibilità", value: "Seconda possibilità, con ferite che non sono guarite." },
    { label: "Forbidden", value: "Amore proibito, con conseguenze che contano." },
    { label: "Enemies to lovers", value: "Da nemici a amanti, con tensione costante." },
    { label: "Guarigione", value: "Amore come guarigione lenta e vulnerabile." },
  ],
  "self-help": [
    { label: "Metodo pratico", value: "Metodo pratico, con step concreti e risultati misurabili." },
    { label: "Motivazionale", value: "Motivazionale ma concreto, senza frasi vuote." },
    { label: "Trauma/healing", value: "Percorso da blocco a guarigione, con esercizi reali." },
    { label: "Business", value: "Business e produttività per chi è sotto pressione." },
    { label: "Spirituale ma concreto", value: "Spirituale ma concreto — senza fuffa." },
  ],
  poetry: [
    { label: "Dolore", value: "Dolore intimo, viscerale, senza filtri." },
    { label: "Rinascita", value: "Rinascita dopo la perdita — luce fragile." },
    { label: "Amore perduto", value: "Amore perduto che torna come ossessione." },
    { label: "Spirituale", value: "Spirituale, simbolico, vicino al mistero." },
    { label: "Frammenti intimi", value: "Frammenti intimi, come note trovate in un cassetto." },
  ],
  fantasy: [
    { label: "Ferita del mondo", value: "Un mondo con una ferita antica che chiede di essere guarita." },
    { label: "Potere con prezzo", value: "Un potere che ha un prezzo terribile." },
    { label: "Regola infrangibile", value: "Una regola del regno che non può essere infranta." },
    { label: "Mondo unico", value: "Un mondo che non deve sembrare fantasy generico." },
    { label: "Viaggio epico", value: "Un viaggio epico con trasformazione inevitabile." },
  ],
  memoir: [
    { label: "Confessione", value: "Deve confessare una verità che ho tenuto nascosta." },
    { label: "Guarigione", value: "Deve guarire raccontando ciò che è successo." },
    { label: "Denuncia", value: "Deve denunciare qualcosa che non può restare silenzioso." },
    { label: "Ispirazione", value: "Deve ispirare chi ha vissuto qualcosa di simile." },
    { label: "Verità che cambia", value: "Una verità che cambia significato nel tempo." },
  ],
};

const GUIDED_UNCERTAINTY_CHOICES: InterviewQuickSuggestion[] = [
  { label: "Fammi vedere alternative", value: "Fammi vedere alternative — non sono sicuro della direzione." },
  { label: "Voglio rispondere liberamente", value: "Preferisco rispondere liberamente, senza opzioni." },
  { label: "Guidami con esempi", value: "Non lo so — guidami con esempi concreti." },
];

function q(
  id: string,
  key: InterviewQuestion["key"],
  question: string,
  extras?: Partial<InterviewQuestion>,
): InterviewQuestion {
  return {
    id,
    key,
    question,
    placeholder: GENERIC_PLACEHOLDER,
    ...extras,
  };
}

function collectUserBlob(state: GuidedInterviewState): string {
  return state.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}

function hasField(state: GuidedInterviewState, key: string): boolean {
  const value = (state.extracted as Record<string, unknown>)?.[key];
  return typeof value === "string" && value.trim().length >= 8;
}

function inferredGenreBucket(state: GuidedInterviewState): string {
  const blob = collectUserBlob(state).toLowerCase();
  const genre =
    state.selectedGenre ||
    state.inferredProfile?.genre ||
    state.extracted?.genre ||
    "";

  const g = `${genre} ${blob}`.toLowerCase();
  if (/dark romance|romance oscur|ossessione|tossic|proibit/.test(g)) return "dark-romance";
  if (/thriller|mistero|indagine|paranoia|countdown/.test(g)) return "thriller";
  if (/horror|paura|bambino|soprannatur|gotic/.test(g)) return "horror";
  if (/poesi|verso|raccolta poet|lyric/.test(g)) return "poetry";
  if (/self-help|bloccato|metodo|guida pratica|trasformazione/.test(g)) return "self-help";
  if (/memoir|autobiograf|confession/.test(g)) return "memoir";
  if (/fantasy|regno|magia|epic/.test(g)) return "fantasy";
  if (/romance|amore|slow burn/.test(g)) return "romance";
  return "general";
}

function isUncertainAnswer(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return true;
  return UNCERTAIN_PATTERNS.test(t);
}

function lastUserAnswer(state: GuidedInterviewState): string {
  const users = state.messages.filter((m) => m.role === "user");
  return users[users.length - 1]?.content?.trim() ?? "";
}

function isVagueAnswer(text: string): boolean {
  const t = text.trim();
  if (t.length < 20) return true;
  if (/^(una storia|un libro|amore|paura|dolore|fantasy|thriller|romance)\.?$/i.test(t)) return true;
  return false;
}

export function resolveInterviewStage(state: GuidedInterviewState): InterviewStage {
  const answers = countForgeUserAnswers(state);
  if (answers === 0) return "welcome";
  if (answers === 1) return "spark";
  if (answers === 2) return "direction";
  if (!hasField(state, "promise")) return "promise";
  if (!hasField(state, "targetReader")) return "audience";
  if (!hasField(state, "emotionalTone") && !hasField(state, "genreDNA")) return "genre-dna";

  const mode = detectEditorialBookMode(state);
  if (mode === "fiction" && !hasField(state, "protagonistWound") && !hasField(state, "centralConflict")) {
    return "character";
  }
  if (mode === "fiction" && !hasField(state, "narrativeDrive")) return "plot";
  if (!hasField(state, "structurePreference")) return "structure";
  if (!hasField(state, "bookTitle")) return "title";
  if (state.forgePhase === "review") return "index";
  return "genre-dna";
}

export function getWelcomeInterviewQuestion(state?: GuidedInterviewState): InterviewQuestion {
  const hasIdea =
    Boolean(state?.extracted?.promise?.trim()) ||
    Boolean(state?.extracted?.centralConflict?.trim());

  return q(FORGE_OPENING_QUESTION_ID, "openingSpark", getForgeOpeningGreeting({ hasExistingIdea: hasIdea }), {
    quickSuggestions: OPENING_QUICK_CHOICES,
  });
}

function buildDirectionQuestion(state: GuidedInterviewState): InterviewQuestion {
  const inference = inferBookProfileFromText(collectUserBlob(state), state.extracted ?? {});
  const candidates = [
    inference.subgenre,
    inference.genre,
    state.inferredProfile?.subgenre,
    state.inferredProfile?.genre,
  ].filter(Boolean) as string[];

  const unique = Array.from(new Set(candidates)).slice(0, 3);
  const options =
    unique.length >= 2
      ? unique.join(", ")
      : "dark romance psicologico, thriller emotivo o romanzo drammatico";

  return q(
    "stage-direction",
    "genreDNA",
    `Da quello che mi racconti può andare in queste direzioni: ${options}. Quale ti sembra più vicina — o quale ti fa più paura?`,
    {
      quickSuggestions: [
        ...(GENRE_DIRECTION_CHOICES[inferredGenreBucket(state)] ?? GENRE_DIRECTION_CHOICES["dark-romance"]).slice(0, 3),
        { label: "Fammi vedere alternative", value: "Fammi vedere altre direzioni possibili." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildGenreDnaQuestion(state: GuidedInterviewState): InterviewQuestion {
  const bucket = inferredGenreBucket(state);
  const mode = detectEditorialBookMode(state);

  const genreQuestions: Record<string, InterviewQuestion> = {
    "dark-romance": q(
      "stage-genre-dark-romance",
      "genreDNA",
      "Qual è il desiderio proibito che tiene in piedi questa storia — e qual è il limite che non deve essere superato troppo facilmente?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES["dark-romance"] },
    ),
    thriller: q(
      "stage-genre-thriller",
      "centralConflict",
      "Qual è la minaccia — e chi mente? Cosa scopriamo troppo tardi?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES.thriller },
    ),
    horror: q(
      "stage-genre-horror",
      "setting",
      "Di cosa deve avere paura il lettore — e qual è la regola dell'orrore che qualcuno infrangerà?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES.horror },
    ),
    poetry: q(
      "stage-genre-poetry",
      "emotionalTone",
      "Qual è il campo emotivo dominante di questa raccolta — e che voce poetica deve avere?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES.poetry },
    ),
    "self-help": q(
      "stage-genre-self-help",
      "promise",
      "Quale trasformazione concreta promette — e perché il lettore dovrebbe fidarsi che non sia fuffa?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES["self-help"] },
    ),
    fantasy: q(
      "stage-genre-fantasy",
      "setting",
      "Qual è la ferita del mondo — e quale potere ha un prezzo che nessuno vuole pagare?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES.fantasy },
    ),
    memoir: q(
      "stage-genre-memoir",
      "promise",
      "Qual è la verità che vuoi raccontare — e il libro deve confessare, guarire, denunciare o ispirare?",
      { quickSuggestions: GENRE_DIRECTION_CHOICES.memoir },
    ),
  };

  if (mode === "poetry") return genreQuestions.poetry;
  if (mode === "nonfiction") return genreQuestions["self-help"];
  return genreQuestions[bucket] ?? q(
    "stage-genre-general",
    "genreDNA",
    "Che regole di genere non possiamo tradire — tono, limiti, promessa e ciò che il lettore si aspetta?",
  );
}

function buildSparkQuestion(state: GuidedInterviewState): InterviewQuestion {
  const last = lastUserAnswer(state);
  if (isUncertainAnswer(last) || isVagueAnswer(last)) {
    return q(
      "stage-spark-vague",
      "readerTransformation",
      "Ci siamo, ma è ancora troppo astratto. Fammi vedere una scena concreta: cosa vediamo nella prima immagine del libro?",
      {
        quickSuggestions: [
          ...OPENING_QUICK_CHOICES.slice(0, 3),
          ...GUIDED_UNCERTAINTY_CHOICES,
        ],
      },
    );
  }
  return q(
    "stage-spark",
    "readerTransformation",
    "Raccontami il libro come lo racconteresti a un amico — anche se è ancora confuso.",
    {
      quickSuggestions: [
        { label: "Un'immagine forte", value: "Parto da un'immagine forte che non riesco a togliermi dalla testa." },
        { label: "Un'emozione", value: "Parto da un'emozione che voglio lasciare al lettore." },
        { label: "Un personaggio", value: "Parto da un personaggio che non può restare uguale." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildCharacterQuestion(): InterviewQuestion {
  return q(
    "stage-character",
    "protagonistWound",
    "Chi è la persona che non può restare uguale alla fine — e quale bugia racconta a se stessa?",
    {
      quickSuggestions: [
        { label: "Protagonista ferito", value: "Un protagonista ferito che si racconta di essere forte." },
        { label: "Love interest magnetico", value: "Un love interest magnetico e pericoloso." },
        { label: "Antagonista", value: "Un antagonista che crede di avere ragione." },
        { label: "Alleato imprevisto", value: "Un alleato imprevisto che conosce il segreto." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildPlotQuestion(): InterviewQuestion {
  return q(
    "stage-plot",
    "narrativeDrive",
    "Quale scena vuoi assolutamente leggere in questo libro — e quale invece non vuoi mai vedere?",
    {
      quickSuggestions: [
        { label: "Finale che spezza", value: "Un finale che spezza il cuore ma resta giusto." },
        { label: "Finale liberatorio", value: "Un finale liberatorio, anche se costa qualcosa." },
        { label: "Twist tardivo", value: "Un twist che cambia tutto troppo tardi." },
        { label: "Midpoint devastante", value: "Un midpoint dove tutto sembra perduto." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildPromiseQuestion(): InterviewQuestion {
  return q(
    "stage-promise",
    "promise",
    "Che cosa deve provare il lettore alla fine — e quale promessa non deve tradire?",
    {
      quickSuggestions: [
        { label: "Ferire", value: "Deve ferire, in modo bello e inevitabile." },
        { label: "Guarire", value: "Deve guarire, anche se passa dal dolore." },
        { label: "Inquietare", value: "Deve inquietare e restare addosso." },
        { label: "Far desiderare", value: "Deve far desiderare qualcosa di proibito." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildAudienceQuestion(): InterviewQuestion {
  return q(
    "stage-audience",
    "targetReader",
    "Chi deve sentirsi chiamato in causa da questo libro — come se fosse scritto proprio per lui?",
    {
      quickSuggestions: [
        { label: "Emozione", value: "Per chi cerca emozione forte e vulnerabilità." },
        { label: "Fuga", value: "Per chi cerca fuga in un mondo o una storia intensa." },
        { label: "Trasformazione", value: "Per chi ha bisogno di cambiare davvero." },
        { label: "Ossessione", value: "Per chi cerca ossessione, tensione e confini morali." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

function buildStructureQuestion(): InterviewQuestion {
  return q(
    "stage-structure",
    "structurePreference",
    "Solo ora parliamo di forma: quanti capitoli immagini, che POV preferisci, e che lunghezza ha in mente?",
    {
      helper: "Struttura, lingua, POV e dettagli tecnici — dopo che il cuore del libro è chiaro.",
      quickSuggestions: [
        { label: "12-15 capitoli", value: "Circa 12-15 capitoli, ritmo sostenuto." },
        { label: "18-22 capitoli", value: "18-22 capitoli, slow burn o escalation graduale." },
        { label: "Prima persona", value: "Prima persona, intima e immersiva." },
        { label: "Terza persona", value: "Terza persona, più cinematografica." },
        { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
      ],
    },
  );
}

export function selectNextForgeQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  if (isFirstForgeAssistantMessage(state)) return null;

  const last = lastUserAnswer(state);
  if (last && isUncertainAnswer(last)) {
    const stage = resolveInterviewStage(state);
    const bucket = inferredGenreBucket(state);
    const genreChoices = GENRE_DIRECTION_CHOICES[bucket] ?? OPENING_QUICK_CHOICES;
    return q(
      `stage-uncertain-${stage}`,
      stage === "direction" ? "genreDNA" : "readerTransformation",
      "Nessun problema — ti propongo alcune strade. Quale ti risuona di più, anche solo un po'?",
      {
        quickSuggestions: [...genreChoices.slice(0, 4), ...GUIDED_UNCERTAINTY_CHOICES],
      },
    );
  }

  const stage = resolveInterviewStage(state);

  switch (stage) {
    case "welcome":
      return getWelcomeInterviewQuestion(state);
    case "spark":
      return buildSparkQuestion(state);
    case "direction":
      return buildDirectionQuestion(state);
    case "promise":
      return buildPromiseQuestion();
    case "audience":
      return buildAudienceQuestion();
    case "genre-dna":
      return buildGenreDnaQuestion(state);
    case "character":
      return buildCharacterQuestion();
    case "plot":
      return buildPlotQuestion();
    case "structure":
      return buildStructureQuestion();
    case "title":
      return q(
        "stage-title",
        "bookTitle",
        "Hai già un titolo in mente — o vuoi che ne troviamo uno provvisorio insieme?",
        {
          quickSuggestions: [
            { label: "Ho un titolo", value: "Ho già un titolo in mente." },
            { label: "Titolo provvisorio", value: "Teniamo un titolo provvisorio per ora." },
            { label: "Proponi tu", value: "Proponi tu tre titoli possibili." },
            { label: "Non lo so, guidami", value: "Non lo so ancora — guidami tu." },
          ],
        },
      );
    default:
      return null;
  }
}

export function getInterviewProgressLabel(state: GuidedInterviewState): string {
  const stage = resolveInterviewStage(state);
  const labels: Record<InterviewStage, string> = {
    welcome: "Stiamo costruendo: idea",
    spark: "Stiamo costruendo: idea",
    direction: "Stiamo costruendo: idea → cuore",
    promise: "Stiamo costruendo: cuore",
    audience: "Stiamo costruendo: cuore",
    "genre-dna": "Stiamo costruendo: cuore → personaggi",
    character: "Stiamo costruendo: personaggi",
    plot: "Stiamo costruendo: personaggi → struttura",
    structure: "Stiamo costruendo: struttura",
    title: "Stiamo costruendo: struttura",
    index: "Stiamo costruendo: struttura",
  };
  return labels[stage];
}

export function filterPrematureTechnicalQuestion(
  question: InterviewQuestion,
  state: GuidedInterviewState,
): InterviewQuestion | null {
  if (countForgeUserAnswers(state) < 3 && isTechnicalPrematureContent(question.question)) {
    return null;
  }
  if (countForgeUserAnswers(state) < 2 && isTechnicalPrematureContent(question.helper ?? "")) {
    return null;
  }
  return question;
}
