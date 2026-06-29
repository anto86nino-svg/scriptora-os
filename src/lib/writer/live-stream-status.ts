export const WRITER_STREAM_STATUS_LINES: readonly (readonly string[])[] = [
  [
    "Continuity: allineo blueprint e memoria narrativa.",
    "Verifico personaggi e timeline del capitolo.",
    "Controllo promesse narrative non ancora risolte.",
  ],
  [
    "Scene build: strutturo spazio, azione e obiettivo di scena.",
    "Definisco il conflitto immediato del segmento.",
    "Evito aperture generiche o riepiloghi inutili.",
  ],
  [
    "Tensione emotiva: calibro attrito e sottotesto.",
    "Riduco spiegazioni esplicite nei dialoghi.",
    "Mantengo ambiguità controllata dove serve.",
  ],
  [
    "Human pass: applico realismo e voce autoriale.",
    "Rifinisco ritmo e distinzione delle voci.",
    "Nessuna rigenerazione completa del capitolo.",
  ],
  [
    "Rifinitura finale: controllo coerenza e chiusura.",
    "Applico patch locali se servono dettagli memorabili.",
    "Preparo consegna al manoscritto.",
  ],
] as const;

export const WRITER_STREAM_PHASE_MESSAGES: Record<string, string> = {
  OPENING: "Continuity e apertura scena…",
  DEVELOPMENT: "Scene build in corso…",
  EXPANSION: "Tensione emotiva in escalation…",
  TRANSITION: "Human pass e transizione…",
  CLOSURE: "Rifinitura finale…",
};
