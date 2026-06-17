import type { BookDnaLock } from "./dna-lock";

const MISSING_FIELD_PROMPTS: Record<string, string> = {
  readerTransformation:
    "Che emozione o trasformazione vuoi lasciare nel lettore quando chiude il libro?",
  centralConflict:
    "Quale evento, verità o tensione rompe l'equilibrio della storia?",
  emotionalTone:
    "Che atmosfera immagini: claustrofobica, investigativa, disturbante, gotica, realistica?",
  genreDNA:
    "Che sensazione di lettura vuoi — lenta e immersiva, tesa, poetica, pratica?",
  promise: "Cosa il lettore deve scoprire poco alla volta?",
  setting:
    "Voglio capire meglio l'atmosfera e il luogo della storia. Dove si svolge e che sensazione deve dare?",
  targetReader: "A chi stai parlando, come a una persona reale che conosci?",
};

export function humanizeMissingField(field: string): string {
  return (
    MISSING_FIELD_PROMPTS[field] ??
    "Raccontami un dettaglio in più — voglio capire meglio la direzione del libro."
  );
}

export function getEditorialBlockedPrompt(lock: BookDnaLock): string {
  if (lock.readyForBlueprint) {
    return "Ho abbastanza elementi per definire il cuore del libro.";
  }

  if (lock.missingCriticalAnswers.length > 0) {
    const first = lock.missingCriticalAnswers[0];
    return humanizeMissingField(first);
  }

  if (lock.dnaQuality?.isDirty) {
    return "Fammi chiarire un paio di dettagli — voglio essere sicuro di aver capito bene.";
  }

  if (lock.dnaQuality?.isAmbiguous) {
    return "C'è un punto ancora ambiguo. Aiutami a stringere la direzione con una risposta in più.";
  }

  return "Mancano ancora un paio di dettagli prima di aprire il blueprint. Continuiamo un attimo.";
}

export function getEditorialContinuePrompt(missingFields: string[]): string {
  if (missingFields.length === 0) {
    return "Continuiamo — voglio affinare ancora un dettaglio.";
  }
  return humanizeMissingField(missingFields[0]);
}
