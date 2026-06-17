import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { evaluateConceptReadiness } from "./concept-readiness-gate";

type HostExtraReason =
  | "missing-core"
  | "missing-world"
  | "missing-reader"
  | "missing-promise"
  | "missing-emotional-temperature"
  | "missing-genre-boundary";

function clean(value?: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function words(value?: unknown): number {
  const text = clean(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function weak(value?: unknown, minWords = 7): boolean {
  return words(value) < minWords;
}

function bag(state: GuidedInterviewState): string {
  const ex = state.extracted || {};
  return [
    state.selectedGenre,
    state.selectedBookType,
    state.inferredProfile?.genre,
    state.inferredProfile?.bookType,
    state.inferredProfile?.subgenre,
    ex.bookType,
    ex.genre,
    ex.subgenre,
    ex.genreDNA,
    ex.promise,
    ex.centralConflict,
    ex.setting,
    ex.targetReader,
  ].map(clean).join(" ").toLowerCase();
}

function isFictionLike(state: GuidedInterviewState): boolean {
  const text = bag(state);
  return /romanzo|narrativa|fiction|romance|dark romance|thriller|horror|fantasy|sci-fi|crime|noir|giallo|racconto|novel/.test(text);
}

function isRomanceLike(state: GuidedInterviewState): boolean {
  return /romance|dark romance|slow burn|amore|desiderio|relazione|ossessione|proibito|possessiv/.test(bag(state));
}

function isNonfictionLike(state: GuidedInterviewState): boolean {
  const text = bag(state);
  return /self-help|business|manuale|guida|saggio|nonfiction|non-fiction|studio|education|didattic|filosofia|divulgativo/.test(text);
}

function idSuffix(reason: HostExtraReason): string {
  return `human-host-${reason}`;
}

function hostQuestion(
  reason: HostExtraReason,
  key: InterviewQuestion["key"],
  question: string,
  placeholder: string,
): InterviewQuestion {
  return {
    id: idSuffix(reason),
    key,
    question,
    placeholder,
  } as InterviewQuestion;
}

/**
 * Adds extra questions only when the book DNA is still weak.
 * This keeps Book Forge conversational without turning it into a long form.
 */
export function getHumanHostExtraQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const ex = state.extracted || {};
  const result: InterviewQuestion[] = [];

  if (weak(ex.centralConflict, 8)) {
    result.push(
      hostQuestion(
        "missing-core",
        "centralConflict" as InterviewQuestion["key"],
        "Ok, ti porto al centro del libro: qual è la ferita, il desiderio o il problema che rende tutto inevitabile?",
        "Esempio: lei vuole scappare da lui, ma lui è l’unico che conosce il suo segreto. Oppure: il lettore vuole cambiare vita, ma continua a sabotarsi.",
      ),
    );
  }

  if (isFictionLike(state) && weak(ex.setting, 6)) {
    result.push(
      hostQuestion(
        "missing-world",
        "setting" as InterviewQuestion["key"],
        "Fammi entrare nella scena: dove respira questo libro? Che luogo, atmosfera o mondo deve sentire il lettore?",
        "Esempio: una villa isolata sul lago, una città notturna, un regno decadente, una scuola d’élite, una provincia piena di segreti.",
      ),
    );
  }

  if (isRomanceLike(state) && weak(ex.emotionalTone, 6)) {
    result.push(
      hostQuestion(
        "missing-emotional-temperature",
        "emotionalTone" as InterviewQuestion["key"],
        "Parliamo di temperatura emotiva: questa storia deve bruciare piano, fare male, sedurre, inquietare o spezzare il cuore?",
        "Esempio: slow burn tossico ma magnetico, desiderio proibito, tensione elegante, ferite emotive, payoff intenso.",
      ),
    );
  }

  if (weak(ex.targetReader, 6)) {
    result.push(
      hostQuestion(
        "missing-reader",
        "targetReader" as InterviewQuestion["key"],
        "Immagina chi ci ascolta dall’altra parte: che tipo di lettore deve sentirsi chiamato da questo libro?",
        "Esempio: lettrici dark romance adulte, autori indie, studenti universitari, persone che vogliono rinascere, fan di thriller psicologici.",
      ),
    );
  }

  if (weak(ex.promise, 7) && weak(ex.readerTransformation, 7)) {
    result.push(
      hostQuestion(
        "missing-promise",
        "promise" as InterviewQuestion["key"],
        "Se dovessi promettere una sola esperienza al lettore, quale sarebbe? Cosa deve provare o capire quando chiude il libro?",
        "Esempio: restare ossessionato dai protagonisti, sentirsi meno solo, imparare un metodo, uscire con una ferita trasformata.",
      ),
    );
  }

  if ((isFictionLike(state) || isNonfictionLike(state)) && weak(ex.genreDNA, 7)) {
    result.push(
      hostQuestion(
        "missing-genre-boundary",
        "genreDNA" as InterviewQuestion["key"],
        "Ultima cosa importante: cosa non deve assolutamente diventare questo libro?",
        "Esempio: non deve diventare un saggio, non deve diventare romance dolce, non deve diventare manuale freddo, non deve perdere tensione.",
      ),
    );
  }

  const readiness = evaluateConceptReadiness(state);
  for (const q of readiness.nextQuestions) {
    if (!result.some((existing) => existing.key === q.key || existing.id === q.id)) {
      result.push(q);
    }
  }

  // Book Forge may take longer when the concept is weak.
  // Still keep each pass human: maximum three deep follow-ups at a time.
  return result.slice(0, readiness.ready ? 0 : 3);
}

function hostLeadForKey(key?: string): string {
  switch (key) {
    case "bookType":
      return "Partiamo dalla forma editoriale, senza incasellarti troppo presto:";
    case "genre":
    case "genreDNA":
      return "Ora ti faccio una domanda da direttore editoriale:";
    case "centralConflict":
      return "Qui entra il cuore vero del libro:";
    case "emotionalTone":
      return "Mettiamo una mano sulla temperatura emotiva:";
    case "targetReader":
      return "Immagina il lettore dall’altra parte del microfono:";
    case "promise":
    case "readerTransformation":
      return "Questa è la promessa che venderà il libro:";
    case "setting":
      return "Portami dentro l’atmosfera:";
    case "structurePreference":
      return "Adesso pensiamo al ritmo, non alla burocrazia:";
    case "chapters":
    case "chapterLength":
    case "bookLength":
      return "Scelta pratica, ma decisiva per il respiro del libro:";
    default:
      return "Ti faccio una domanda semplice, ma importante:";
  }
}

/**
 * Turns form-like questions into a warmer human interview voice.
 * No internal DNA/confidence jargon is shown to the user.
 */
export function shapeHumanHostQuestion(question: InterviewQuestion, state: GuidedInterviewState): InterviewQuestion {
  const original = clean(question.question);
  if (!original) return question;

  // Avoid double-hosting if already shaped.
  if (/^(Ti faccio|Ok,|Partiamo|Ora ti|Qui entra|Immagina|Portami|Mettiamo|Scelta pratica)/i.test(original)) {
    return question;
  }

  const lead = hostLeadForKey(String(question.key || ""));
  const shaped = `${lead} ${original}`;

  const helper =
    isRomanceLike(state)
      ? "Rispondi come parleresti a un editor: immagini, tensione, ferite, desiderio, confini. Non serve essere perfetto."
      : isFictionLike(state)
        ? "Rispondi con scena, atmosfera, conflitto e conseguenze. Anche poche frasi vanno bene se sono vive."
        : isNonfictionLike(state)
          ? "Rispondi in modo concreto: problema, lettore, trasformazione, metodo o risultato promesso."
          : "Rispondi liberamente. Scriptora capirà il DNA del libro dalle tue parole.";

  return {
    ...question,
    question: shaped,
    helper: clean((question as any).helper) || helper,
  } as InterviewQuestion;
}
