export type CharacterStudioFormatMode = "narrative" | "poetry" | "manual" | "workbook" | "study";

export interface CharacterStudioFormatUiProfile {
  mode: CharacterStudioFormatMode;
  studioTitle: string;
  studioSubtitle: string;
  showNarrativeFields: boolean;
  showCharacterFields: boolean;
  showPoetryFields: boolean;
  showManualFields: boolean;
  showWorkbookFields: boolean;
  showStudyFields: boolean;
  countLabel: string;
  sectionCountLabel?: string;
  ideaLabel: string;
  ideaPlaceholder: string;
  step2Title: string;
  step4Title: string;
  step4Description: string;
  promiseLabel: string;
  settingLabel: string;
  subjectLabel: string;
  methodLabel: string;
  formatNotice: string;
  handoffCopy: string;
}

function normalize(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[_\s]+/g, "-");
}

export function resolveCharacterStudioFormatUiProfile(input: {
  bookFormat?: string;
  genre?: string;
}): CharacterStudioFormatUiProfile {
  const identity = `${normalize(input.bookFormat)} ${normalize(input.genre)}`;

  if (/poetry-collection|poetry|poesia/.test(identity)) {
    return {
      mode: "poetry",
      studioTitle: "Poetry Studio",
      studioSubtitle: "Voce, immagini, sezioni e promessa poetica.",
      showNarrativeFields: false,
      showCharacterFields: false,
      showPoetryFields: true,
      showManualFields: false,
      showWorkbookFields: false,
      showStudyFields: false,
      countLabel: "Numero poesie",
      sectionCountLabel: "Numero sezioni",
      ideaLabel: "Nucleo della raccolta",
      ideaPlaceholder: "Es. Una raccolta sul vuoto, il ritorno della luce, immagini d'acqua, stanze chiuse e rinascita.",
      step2Title: "Definisci la raccolta",
      step4Title: "Canone poetico",
      step4Description: "Niente cast: Scriptora usa voce, immagini ricorrenti, registro e arco emotivo.",
      promiseLabel: "Promessa poetica",
      settingLabel: "Immagini ricorrenti / campo simbolico",
      subjectLabel: "Voce poetica",
      methodLabel: "Tema centrale",
      formatNotice: "Formato poesia: POV, finale narrativo, protagonista e cast sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con voce poetica, sezioni, immagini e promessa gia' collegate.",
    };
  }

  if (/workbook|journal/.test(identity)) {
    return {
      mode: "workbook",
      studioTitle: "Workbook Studio",
      studioSubtitle: "Schede, esercizi, tracking e progressione pratica.",
      showNarrativeFields: false,
      showCharacterFields: false,
      showPoetryFields: false,
      showManualFields: true,
      showWorkbookFields: true,
      showStudyFields: false,
      countLabel: "Schede",
      sectionCountLabel: "Attivita' per scheda",
      ideaLabel: "Obiettivo del workbook",
      ideaPlaceholder: "Es. Un workbook per trasformare autostima fragile in abitudini, esercizi e tracking settimanale.",
      step2Title: "Definisci il percorso pratico",
      step4Title: "Architettura delle attivita'",
      step4Description: "Niente personaggi: servono schede, esercizi, domande, tracker e completabilita'.",
      promiseLabel: "Promessa pratica",
      settingLabel: "Esercizi / tracker ricorrenti",
      subjectLabel: "Problema del lettore",
      methodLabel: "Metodo / framework",
      formatNotice: "Formato workbook: cast, POV e finale narrativo sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con schede, esercizi e progress tracker gia' collegati.",
    };
  }

  if (/study-material|academic-summary|education|studio|study/.test(identity)) {
    return {
      mode: "study",
      studioTitle: "Study Material Studio",
      studioSubtitle: "Moduli, quiz, flashcard, simulazioni e livello studente.",
      showNarrativeFields: false,
      showCharacterFields: false,
      showPoetryFields: false,
      showManualFields: true,
      showWorkbookFields: false,
      showStudyFields: true,
      countLabel: "Moduli",
      sectionCountLabel: "Verifiche per modulo",
      ideaLabel: "Materiale / materia da studiare",
      ideaPlaceholder: "Es. Materiale per esame di biologia: cellula, mitosi, meiosi, genetica e domande d'esame.",
      step2Title: "Definisci il materiale",
      step4Title: "Architettura didattica",
      step4Description: "Niente cast: servono moduli, quiz, flashcard, livello studente e simulazioni.",
      promiseLabel: "Promessa di apprendimento",
      settingLabel: "Concetti chiave / prerequisiti",
      subjectLabel: "Livello studente",
      methodLabel: "Metodo didattico",
      formatNotice: "Formato studio: personaggi, POV e finale narrativo sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con moduli, quiz, flashcard e verifiche gia' collegati.",
    };
  }

  if (/manual|self-help|psychology-guide|business-book|academic-book|research-book|travel-guide|cookbook/.test(identity)) {
    return {
      mode: "manual",
      studioTitle: "Book Foundation Studio",
      studioSubtitle: "Problema, trasformazione, metodo e struttura pratica.",
      showNarrativeFields: false,
      showCharacterFields: false,
      showPoetryFields: false,
      showManualFields: true,
      showWorkbookFields: false,
      showStudyFields: false,
      countLabel: "Capitoli pratici",
      sectionCountLabel: "Checklist / esercizi",
      ideaLabel: "Problema lettore / argomento",
      ideaPlaceholder: "Es. Un manuale per passare da confusione ad azioni chiare con metodo, checklist ed esempi.",
      step2Title: "Definisci il percorso",
      step4Title: "Architettura pratica",
      step4Description: "Niente cast: Scriptora usa problema, trasformazione, metodo, checklist ed esercizi.",
      promiseLabel: "Promessa di trasformazione",
      settingLabel: "Esempi / casi / contesto applicativo",
      subjectLabel: "Problema del lettore",
      methodLabel: "Metodo / framework",
      formatNotice: "Formato pratico: personaggi, POV e finale narrativo sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con promessa, metodo, capitoli pratici ed esercizi gia' collegati.",
    };
  }

  return {
    mode: "narrative",
    studioTitle: "Character Studio Pro",
    studioSubtitle: "Dall'idea al libro in un flusso unico.",
    showNarrativeFields: true,
    showCharacterFields: true,
    showPoetryFields: false,
    showManualFields: false,
    showWorkbookFields: false,
    showStudyFields: false,
    countLabel: "Capitoli",
    ideaLabel: "Idea del romanzo",
    ideaPlaceholder: "Es. Una nave-laboratorio torna vuota al porto. Nella camera 14 restano audiocassette, mappe antiche e iscrizioni che cambiano quando nessuno guarda...",
    step2Title: "Racconta la tua storia",
    step4Title: "Costruisci il cast",
    step4Description: "I personaggi nascono da DNA + idea + titolo e restano canonici nel passaggio a Book Forge.",
    promiseLabel: "Promessa narrativa base",
    settingLabel: "Ambientazione",
    subjectLabel: "Tipo protagonista / soggetto",
    methodLabel: "Dinamica centrale",
    formatNotice: "",
    handoffCopy: "Scriptora apre creazione libro con cast, genere, filone e tono gia' collegati.",
  };
}
