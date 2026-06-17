import type { GuidedInterviewState } from "./types";

/** Rich nonfiction state that passes all Forge evolution gates. */
export function evolutionReadySelfHelpState(): GuidedInterviewState {
  return {
    completed: false,
    currentStep: 24,
    confidence: 0.97,
    chatFirst: true,
    selectedGenre: "self-help",
    messages: Array.from({ length: 12 }, (_, i) => ({
      id: `u-${i}`,
      role: "user" as const,
      content: `Risposta dettagliata numero ${i + 1} con abbastanza testo per contare davvero nell'intervista.`,
      createdAt: i,
    })),
    extracted: {
      readerTransformation:
        "Il lettore deve chiudere il libro con un metodo concreto per ritrovare controllo e calma quotidiana.",
      centralConflict:
        "Il lettore si sente bloccato tra troppe responsabilità, caos digitale e nessuna energia mentale reale.",
      emotionalTone: "Caldo, diretto, empatico, incoraggiante, pratico, senza motivazione vuota.",
      genreDNA: "Self-help pratico con esercizi brevi, esempi concreti e tono umano.",
      promise: "Un metodo semplice per riprendere controllo delle giornate senza perfezionismo.",
      setting: "Vita quotidiana moderna, lavoro, famiglia, stanchezza, caos digitale.",
      targetReader: "Professionisti e creativi under pressure che procrastinano per perfezionismo.",
      language: "Italiano",
      authorName: "Antonino Campanella",
      bookType: "Saggio o self-help",
      genre: "Self-help",
      subgenre: "Produttività e benessere mentale",
      bookLength: "Libro medio, con respiro narrativo",
      chapterCount: "12 capitoli",
      subchaptersPreference: "Sì, ma solo dove la struttura lo richiede davvero.",
      frontMatter: "Prefazione",
      backMatter: "Ringraziamenti",
      marketplace: "Amazon KDP",
      bookTitle: "Ritrovare il Giorno",
      bookSubtitle: "Un metodo umano per uscire dal caos senza perfezionismo",
      openingHook: "Se sai cosa fare ma non riesci a iniziare, questo libro è stato scritto per te.",
      copyrightMode: "Copyright standard con nome autore e anno.",
    },
    narrativeDecisions: [
      {
        id: "selfhelp-pace",
        key: "transformationPace",
        question: "Trasformazione graduale o svolta radicale?",
        answer: "Trasformazione graduale con micro-passi concreti ogni giorno.",
        impact: "Ritmo della trasformazione",
      },
      {
        id: "redemption",
        key: "redemption",
        question: "Redenzione?",
        answer: "Il lettore merita una seconda possibilità concreta, non teoria.",
        impact: "Morale",
      },
      {
        id: "betrayal",
        key: "betrayal",
        question: "Fiducia?",
        answer: "La fiducia si ricostruisce con azioni piccole ma costanti.",
        impact: "Fiducia",
      },
    ],
    titleIntelligence: {
      definitiveTitle: "Ritrovare il Giorno",
      subtitle: "Un metodo umano per uscire dal caos senza perfezionismo",
      commercialHook: "Se sai cosa fare ma non riesci a iniziare, questo libro è stato scritto per te.",
      commercialPromise: "Un metodo semplice per riprendere controllo delle giornate senza perfezionismo.",
      approved: true,
    },
    copyright: {
      mode: "standard",
      holder: "Antonino Campanella",
      year: "2026",
    },
    storyFuture: { transformationPace: "gradual", endingTone: "hopeful" },
  } as GuidedInterviewState;
}

/** Rich fiction state that passes all Forge evolution gates. */
export function evolutionReadyGothicState(): GuidedInterviewState {
  return {
    completed: false,
    currentStep: 28,
    confidence: 0.97,
    chatFirst: true,
    selectedGenre: "horror",
    messages: Array.from({ length: 14 }, (_, i) => ({
      id: `u-${i}`,
      role: "user" as const,
      content: `Risposta gotica dettagliata numero ${i + 1} con testo abbastanza lungo per contare.`,
      createdAt: i,
    })),
    extracted: {
      readerTransformation:
        "Il lettore deve chiudere il libro con una paura sottile addosso e la sensazione che qualcosa sia cambiato dentro — redenzione impossibile.",
      centralConflict:
        "Un segreto di famiglia che rompe l'equilibrio di una villa decadente e costringe tutti a scegliere cosa perdere se la verità esplode.",
      protagonistWound:
        "La protagonista porta una ferita di abbandono che la spinge verso verità che teme di scoprire e non può più ignorare.",
      narrativeDrive: "Indagini notturne e lettere nascoste spingono verso un abisso familiare inevitabile.",
      endingDirection: "Nessuno esce pulito — solo più consapevole della verità sepolta.",
      antagonistWound:
        "Il fratello silenzioso protegge il segreto con metodi sempre più spietati.",
      indexOutline:
        "1. Ritorno alla villa 2. Lettere nascoste 3. Tradimento di famiglia 4. Rivelazione finale",
      emotionalTone: "Gotico, elegante, claustrofobico, inquietante, presagio e ombre.",
      genreDNA: "Narrativa gotica lenta, immersiva, letteraria e inquietante.",
      promise: "Una discesa lenta verso una rivelazione che nessuno è pronto ad accettare.",
      setting: "Villa decadente, pioggia, nebbia, silenzi e memoria.",
      targetReader: "Lettori dark gothic amanti di segreti e atmosfere raffinate.",
      language: "Italiano",
      authorName: "Livia Emerson",
      bookType: "Romanzo narrativo",
      genre: "Horror gotico",
      subgenre: "Gotico moderno",
      bookLength: "Libro lungo, immersivo, epico",
      chapterCount: "18 capitoli",
      subchaptersPreference: "Flusso continuo senza sottocapitoli.",
      frontMatter: "Nota dell'autore",
      backMatter: "Ringraziamenti",
      marketplace: "Amazon KDP",
      bookTitle: "La Villa dei Silenzi",
      bookSubtitle: "Una verità sepolta che nessuno può più ignorare",
      openingHook: "Alcune case non dimenticano. E quando ricordano, fanno male.",
      copyrightMode: "Copyright standard con nome autore e anno.",
    },
    characters: [
      {
        id: "protagonist-1",
        role: "protagonist",
        name: "Elena",
        wound: "Abbandono del padre e colpa mai confessata",
        fear: "Scoprire che la famiglia è costruita su una menzogna",
        desire: "Conoscere la verità anche se fa male",
        contradiction: "Vuole sapere ma sabotano ogni indizio",
        obsession: "La villa e ciò che nasconde",
        secret: "Ha sentito il grido la notte del delitto",
        arc: "Da figlia obediente a donna che sceglie la verità",
      },
      {
        id: "antagonist-1",
        role: "antagonist",
        name: "Marco",
        wound: "Colpa per il segreto che ha giurato di custodire",
        obsession: "Tenere chiusa la villa e la verità a ogni costo",
        arc: "Da protettore a minaccia morale della famiglia",
      },
    ],
    narrativeDecisions: [
      {
        id: "thriller-culprit",
        key: "culpritFate",
        question: "Il colpevole viene scoperto?",
        answer: "Il colpevole viene scoperto ma troppo tardi per evitare il danno.",
        impact: "Risoluzione del mistero",
      },
      {
        id: "betrayal",
        key: "betrayal",
        question: "Tradimento?",
        answer: "Un tradimento di famiglia cambia tutto nel secondo atto.",
        impact: "Arco tradimento",
      },
      {
        id: "redemption",
        key: "redemption",
        question: "Redenzione?",
        answer: "Nessuno esce pulito — solo più consapevole.",
        impact: "Morale finale",
      },
    ],
    titleIntelligence: {
      definitiveTitle: "La Villa dei Silenzi",
      subtitle: "Una verità sepolta che nessuno può più ignorare",
      commercialHook: "Alcune case non dimenticano. E quando ricordano, fanno male.",
      commercialPromise: "Una discesa lenta verso una rivelazione che nessuno è pronto ad accettare.",
      approved: true,
    },
    copyright: { mode: "standard", holder: "Livia Emerson", year: "2026" },
    storyFuture: { finalStatus: "alive", endingTone: "unsettling", betrayalArc: true },
  } as GuidedInterviewState;
}
