/**
 * GENRE INTELLIGENCE ENGINE — Publishing Brain™
 *
 * Profili profondi per ogni genere KDP: tono, ritmo, struttura narrativa,
 * archi, hook, vocabolario, do/don't. Usato sia nel system prompt che nei
 * blueprint/chapter prompts per generare libri ad alta vendibilità.
 */

import type { Genre } from "@/types/book";
import {
  buildSupremeGenrePromptBlock,
  getSupremeGenreProfile,
  supremeRulesAsFlatList,
} from "@/lib/genre-brain-supreme";

export type GenreKey =
  | Genre
  | "horror"
  | "sci-fi"
  | "historical"
  | "children"
  | "poetry"
  | "spirituality"
  | "biography"
  | "fairy-tale"
  | "jokes"
  | "manual";

export interface GenreProfile {
  /** Authors-DNA reference: chi imitare a livello di mestiere */
  authorsDNA: string;
  /** Tono dominante (1-2 righe) */
  tone: string;
  /** Ritmo della prosa (frasi, paragrafi, battiti) */
  pacing: string;
  /** Struttura narrativa/logica per il blueprint */
  structure: string;
  /** Beat tipici di un capitolo bestseller del genere */
  chapterBeats: string[];
  /** Tipi di hook d'apertura che funzionano */
  hookTypes: string[];
  /** Vocabolario / registro */
  vocabulary: string;
  /** Cosa il lettore PROMETTE di provare/ottenere */
  readerPromise: string;
  /** Cose da fare sempre */
  dos: string[];
  /** Cose da non fare mai */
  donts: string[];
  /** Suggerimento speciale per il finale di capitolo */
  chapterEnding: string;
}

/* ============ GENRE BLUEPRINT — editorial structure layer ============ */
/**
 * Editorial blueprint per ogni genere: struttura libro, stile capitolo,
 * front/back matter, regole di contenuto. Usato dal Genre Engine per
 * generare libri che SEMBRANO scritti da un editor del settore.
 */
export type ChapterStyle =
  | "narrative"
  | "step_by_step"
  | "recipe_blocks"
  | "reference_blocks"
  | "case_study"
  | "lesson_blocks"
  | "workflow_blocks"
  | "protocol_blocks";

export interface GenreBlueprint {
  structure: string[];
  tone: string;
  chapterStyle: ChapterStyle;
  hasSubchapters: boolean;
  frontMatterTemplate: string[];
  backMatterTemplate: string[];
  contentRules: string[];
}

const PROFILES: Record<GenreKey, GenreProfile> = {
  /* ============== FICTION ============== */

  horror: {
    authorsDNA:
      "Stephen King (atmosfera + intimità del male), Shirley Jackson (perturbante domestico), Paul Tremblay (ambiguità).",
    tone:
      "Inquietante, claustrofobico, sensoriale. La paura nasce dal quotidiano che si incrina, non dal mostro mostrato.",
    pacing:
      "Frasi corte nei momenti di terrore, lunghe e ipnotiche nella tensione. Alternare silenzi e shock. Mai descrivere troppo il mostro: suggerire.",
    structure:
      "Normalità → Crepa → Escalation → Punto di non ritorno → Discesa → Rivelazione parziale. Il finale lascia un'eco, non chiude.",
    chapterBeats: [
      "Apertura sensoriale (odore, suono, dettaglio fuori posto)",
      "Falsa rassicurazione",
      "Indizio del soprannaturale o del male",
      "Reazione fisica del personaggio",
      "Cliffhanger viscerale",
    ],
    hookTypes: [
      "Dettaglio sensoriale anomalo ('Il latte sapeva di ferro')",
      "Frase del personaggio sotto shock",
      "Silenzio innaturale",
      "Oggetto fuori posto descritto come se fosse vivo",
    ],
    vocabulary:
      "Concreto, corporeo, tattile. Verbi di percezione (sentire, intravedere, riconoscere). Evitare aggettivi 'spaventoso/orribile' — mostrare l'effetto.",
    readerPromise:
      "Provare paura vera, leggere col fiato sospeso, dormire con la luce accesa.",
    dos: [
      "Sensi sempre attivi (5 sensi)",
      "Costruire dread prima del jumpscare",
      "Personaggi normali, situazione anomala",
      "Lasciare spazio all'immaginazione del lettore",
    ],
    donts: [
      "Spiegare il mostro all'inizio",
      "Aggettivi gratuiti ('terribile', 'spaventoso')",
      "Violenza gratuita senza senso narrativo",
      "Personaggi che fanno scelte stupide solo per il plot",
    ],
    chapterEnding:
      "Chiudere con un'immagine o una frase che resta in testa al lettore — un dettaglio sbagliato che si capisce dopo.",
  },

  thriller: {
    authorsDNA:
      "Gillian Flynn (voce sporca, twist), Dennis Lehane (atmosfera morale), Harlan Coben (cliffhanger seriali).",
    tone:
      "Teso, paranoico, cinico. Il lettore deve sospettare di tutti, incluso il narratore.",
    pacing:
      "Capitoli corti (1500-3000 parole), frasi che mordono, scene che iniziano in medias res. POV multipli accettati.",
    structure:
      "Inciting incident → Indagine/fuga → Falsi sospetti → Mid-point twist → Rivelazione del vero antagonista → Confronto → Twist finale.",
    chapterBeats: [
      "Hook ad alta tensione (azione, minaccia, scoperta)",
      "Avanzamento informazione + nuovo dubbio",
      "Beat emotivo breve (umanità del protagonista)",
      "Escalation",
      "Cliffhanger: domanda, minaccia, rivelazione parziale",
    ],
    hookTypes: [
      "Statement scioccante in prima persona",
      "Azione in corso (fuga, scoperta del cadavere, telefonata)",
      "Domanda inquietante diretta al lettore",
      "Dettaglio incongruente che cambia tutto",
    ],
    vocabulary:
      "Diretto, urbano, contemporaneo. Dialoghi taglienti, sottotesto sempre presente. Tecnicismi solo se servono al realismo.",
    readerPromise:
      "Non riuscire a posare il libro, voler scoprire il colpevole, essere ingannato in modo intelligente.",
    dos: [
      "Piantare indizi 3 capitoli prima del payoff",
      "Cliffhanger ad ogni fine capitolo",
      "POV inaffidabile, informazioni incomplete",
      "Stakes personali + plot puzzle",
    ],
    donts: [
      "Coincidenze convenienti",
      "Antagonisti monodimensionali",
      "Info-dump investigativo",
      "Twist senza setup precedente",
    ],
    chapterEnding:
      "Cliffhanger: una rivelazione, una minaccia, una porta che si apre — mai chiudere comodamente.",
  },

  romance: {
    authorsDNA:
      "Colleen Hoover (emozione cruda), Emily Henry (banter intelligente), Christina Lauren (chimica).",
    tone:
      "Caldo, vulnerabile, elettrico. Tensione emotiva costante. Il lettore deve TIFARE per la coppia.",
    pacing:
      "Beat romance classici: meet-cute, tensione crescente, primo contatto, conflitto esterno, dark moment, grand gesture, HEA/HFN.",
    structure:
      "Setup mondi separati → Forced proximity / inevitable encounter → Costruzione attrazione → Primo bacio/momento → Ostacolo/rottura → Riconciliazione → Promessa futura.",
    chapterBeats: [
      "POV intimo (interno emotivo del personaggio)",
      "Interazione tra i due con sottotesto",
      "Momento di vulnerabilità o desiderio",
      "Spike di tensione (sguardo, tocco, frase non detta)",
      "Mini-cliffhanger emotivo",
    ],
    hookTypes: [
      "Pensiero interno sul partner",
      "Battuta di dialogo carica",
      "Memoria flash del momento precedente",
      "Sensazione fisica (cuore, respiro, calore)",
    ],
    vocabulary:
      "Sensoriale, emotivo, ricco di dettagli concreti (profumo, mano, voce). Dialogo veloce, sottotesto > testo.",
    readerPromise:
      "Sentire le farfalle, piangere, rileggere le scene preferite, finire con il cuore pieno.",
    dos: [
      "Chimica visibile dal primo incontro",
      "Vulnerabilità di entrambi i personaggi",
      "Conflitto interno, non solo esterno",
      "Scene quotidiane cariche di tensione",
    ],
    donts: [
      "Insta-love senza tensione",
      "Conflitti basati su malintesi banali",
      "Dialoghi che spiegano i sentimenti",
      "Personaggi senza vita oltre la storia d'amore",
    ],
    chapterEnding:
      "Chiudere su un beat emotivo: una frase non detta, uno sguardo, una decisione interiore.",
  },

  "dark-romance": {
    authorsDNA:
      "Penelope Douglas (intensità), Ana Huang (potere e desiderio), Tarryn Fisher (oscurità morale).",
    tone:
      "Viscerale, possessivo, moralmente ambiguo. Desiderio proibito. Il lettore è complice.",
    pacing:
      "Tensione che non si scioglie mai del tutto. Scene cariche, dialoghi minacciosi, momenti tenero-pericolosi.",
    structure:
      "Incontro disturbante → Attrazione vietata → Power dynamic → Scoperta del trauma/segreto → Punto di non ritorno → Resa emotiva → Possesso reciproco.",
    chapterBeats: [
      "POV intimo carico di desiderio o paura",
      "Power play tra i due",
      "Momento di tenerezza inaspettata",
      "Beat di oscurità (passato, minaccia, gelosia)",
      "Tensione fisica/emotiva non risolta",
    ],
    hookTypes: [
      "Statement possessivo del protagonista",
      "Minaccia velata in dialogo",
      "Sensazione fisica intensa",
      "Memoria traumatica che irrompe",
    ],
    vocabulary:
      "Intenso, sensuale, fisico. Verbi di potere e resa. Linguaggio diretto ma mai volgare gratuito.",
    readerPromise:
      "Provare desiderio proibito, essere turbati, rileggere le scene più intense.",
    dos: [
      "Personaggi con trauma reale (non solo estetica)",
      "Consenso emotivo anche nei momenti più intensi",
      "Costruzione lenta della fiducia",
      "Conflitto morale interno",
    ],
    donts: [
      "Romanticizzare abuso senza coscienza narrativa",
      "Personaggi piatti 'cattivi che diventano buoni' senza arco",
      "Sesso senza tensione narrativa",
      "Trauma usato solo come trama",
    ],
    chapterEnding:
      "Chiudere su un beat di tensione possessiva, una scelta morale, o un momento di vulnerabilità nascosta.",
  },

  fantasy: {
    authorsDNA:
      "Brandon Sanderson (magic system + struttura), Ursula K. Le Guin (profondità), Robin Hobb (intimità + epica).",
    tone:
      "Evocativo, ampio, mitico ma intimo. Il mondo deve sentirsi vissuto, non descritto.",
    pacing:
      "Capitoli più lunghi (3000-5000 parole). Alternare scene d'azione e momenti contemplativi. Worldbuilding integrato nell'azione.",
    structure:
      "Mondo ordinario → Chiamata → Rifiuto → Mentore → Soglia → Prove → Crisi → Trasformazione → Ritorno cambiato (Hero's Journey adattabile).",
    chapterBeats: [
      "Apertura nel mondo (sensoriale, specifico)",
      "Personaggio in azione/decisione",
      "Worldbuilding rivelato attraverso conflitto",
      "Beat di magic system o lore",
      "Avanzamento del viaggio + nuova domanda",
    ],
    hookTypes: [
      "Dettaglio del mondo che disorienta il lettore",
      "Azione in mezzo a un rituale o battaglia",
      "Profezia o frammento di lore",
      "Frase del personaggio che rivela cultura aliena",
    ],
    vocabulary:
      "Ricco ma chiaro. Termini coniati con criterio (max 1-2 per capitolo). Metafore organiche al mondo.",
    readerPromise:
      "Essere trasportati in un altro mondo, dimenticare il proprio, rileggere lentamente.",
    dos: [
      "Magic system con regole e costi",
      "Worldbuilding mostrato, mai elencato",
      "Conflitti morali in scala epica",
      "Mappa narrativa chiara del viaggio",
    ],
    donts: [
      "Info-dump iniziale ('In un mondo dove...')",
      "Magia senza limiti o conseguenze",
      "Nomi inventati impronunciabili",
      "Cliché Tolkien copiati senza twist",
    ],
    chapterEnding:
      "Chiudere su un'immagine epica o un'intuizione del personaggio che cambia il viaggio.",
  },

  "sci-fi": {
    authorsDNA:
      "Ted Chiang (idea-driven + emozione), Ursula K. Le Guin (società), Andy Weir (problem-solving).",
    tone:
      "Curioso, speculativo, lucido. La tecnologia è il setting; il cuore è umano.",
    pacing:
      "Equilibrio tra esposizione del concetto e dramma umano. Capitoli medi (2500-4000 parole).",
    structure:
      "Premessa speculativa → Implicazioni personali → Scoperta del costo → Conflitto sistemico → Scelta etica → Conseguenza → Domanda aperta sul futuro.",
    chapterBeats: [
      "Apertura con un dettaglio futuristico normalizzato",
      "Personaggio che agisce nel sistema",
      "Conflitto tra umanità e tecnologia",
      "Beat di scoperta o rivelazione concettuale",
      "Decisione che cambia la rotta",
    ],
    hookTypes: [
      "Dettaglio tecnologico trattato come ovvio",
      "Domanda filosofica posta dal personaggio",
      "Anomalia nel sistema",
      "Confronto tra ciò che era e ciò che è",
    ],
    vocabulary:
      "Preciso, tecnico quando serve, lirico nei momenti umani. Spiegare la scienza solo se il personaggio ne ha bisogno.",
    readerPromise:
      "Pensare a una nuova idea per giorni, vedere il presente con altri occhi.",
    dos: [
      "Una sola grande idea speculativa per libro",
      "Conseguenze umane della tecnologia",
      "Plausibilità interna (anche se inventata)",
      "Etica come motore del plot",
    ],
    donts: [
      "Tecno-babble senza scopo",
      "Personaggi al servizio dell'idea",
      "Distopia generica senza specificità",
      "Spiegare la scienza fuori contesto",
    ],
    chapterEnding:
      "Chiudere con una domanda etica implicita o un'immagine che condensa il tema.",
  },

  historical: {
    authorsDNA:
      "Hilary Mantel (immersione totale), Ken Follett (epica popolare), Madeline Miller (mito + intimità).",
    tone:
      "Immersivo, autentico, sensoriale. Il lettore deve vivere l'epoca, non visitarla.",
    pacing:
      "Scene lunghe e cariche, dettagli materiali, dialoghi che suonano dell'epoca senza pastiche.",
    structure:
      "Mondo storico → Personaggio nel suo contesto → Evento storico → Impatto personale → Scelta → Ripercussioni → Eco nel tempo.",
    chapterBeats: [
      "Apertura sensoriale d'epoca (materiale, suoni, odori)",
      "Personaggio nel ruolo sociale",
      "Frizione con l'evento storico",
      "Decisione personale carica di significato",
      "Conseguenza che muove la trama",
    ],
    hookTypes: [
      "Dettaglio materiale specifico dell'epoca",
      "Dialogo che rivela classe sociale",
      "Evento pubblico visto dal privato",
      "Oggetto storico carico di emozione",
    ],
    vocabulary:
      "Aderente all'epoca senza essere arcaico. Termini specifici (mestieri, oggetti, vestiti) usati con precisione.",
    readerPromise:
      "Viaggiare nel tempo, sentire la polvere e il fuoco, capire il presente attraverso il passato.",
    dos: [
      "Ricerca storica visibile nei dettagli",
      "Personaggi credibili per l'epoca",
      "Eventi storici che impattano il personale",
      "Dialoghi che suonano d'epoca senza affettazione",
    ],
    donts: [
      "Anacronismi linguistici o mentali",
      "Info-dump storico tipo Wikipedia",
      "Personaggi moderni travestiti da antichi",
      "Eventi storici come scenografia",
    ],
    chapterEnding:
      "Chiudere su un momento che incide sia il personaggio sia la Storia.",
  },

  /* ============== NON-FICTION ============== */

  "self-help": {
    authorsDNA:
      "Brianna Wiest (poesia + psicologia), Mark Manson (verità scomode), Brené Brown (vulnerabilità ricerca-based).",
    tone:
      "Caldo, diretto, illuminante. Mai paternalistico. Il lettore si sente VISTO.",
    pacing:
      "Capitoli compatti (2000-3500 parole). Aprire con storia, costruire intuizione, chiudere con shift mentale.",
    structure:
      "Promessa di trasformazione → Diagnosi del problema → Storia/esempio → Reframe → Strumento pratico → Esercizio → Visione del 'dopo'.",
    chapterBeats: [
      "Hook emotivo (storia o frase che colpisce)",
      "Naming del pattern del lettore",
      "Reframe psicologico (la verità nascosta)",
      "Strumento o pratica concreta",
      "Frase quotabile + invito all'azione interiore",
    ],
    hookTypes: [
      "Statement scomodo ma vero",
      "Storia personale o di cliente",
      "Domanda che fa pausare",
      "Frase poetica che riformula il problema",
    ],
    vocabulary:
      "Concreto, emotivo, accessibile. Niente jargon psicologico. Metafore visive. Frasi brevi alternate a riflessioni lunghe.",
    readerPromise:
      "Capire qualcosa di sé, sentirsi meno solo, avere uno strumento da usare oggi.",
    dos: [
      "1 idea centrale per capitolo",
      "Esempio + esercizio + frase memorabile",
      "Validare il dolore prima di offrire soluzione",
      "Linguaggio del 'tu/io' (mai 'le persone')",
    ],
    donts: [
      "Platitudini ('credi in te stesso')",
      "Liste generiche di consigli",
      "Toni motivazionali da coach",
      "Promesse magiche senza lavoro",
    ],
    chapterEnding:
      "Chiudere con una frase highlight + un invito interiore (domanda, micro-azione, immagine).",
  },

  spirituality: {
    authorsDNA:
      "Eckhart Tolle (presenza), Pema Chödrön (compassione radicale), Michael Singer (resa).",
    tone:
      "Calmo, profondo, contemplativo. Verità antiche dette con freschezza.",
    pacing:
      "Capitoli brevi (1500-2500 parole). Frasi che respirano. Spazio bianco. Tempo per il silenzio.",
    structure:
      "Verità sottile → Esempio quotidiano → Insegnamento → Pratica contemplativa → Invito alla presenza.",
    chapterBeats: [
      "Apertura contemplativa (immagine, paradosso, silenzio)",
      "Diagnosi del pattern mentale/egoico",
      "Insegnamento essenziale (1 verità)",
      "Pratica/meditazione/respiro guidato",
      "Frase che resta come mantra",
    ],
    hookTypes: [
      "Paradosso ('Ciò che cerchi ti sta cercando')",
      "Domanda contemplativa",
      "Immagine naturale (acqua, vento, radice)",
      "Frase di un maestro citata",
    ],
    vocabulary:
      "Semplice, evocativo, non new-age. Evitare 'energia/vibrazione' senza sostanza. Linguaggio universale, non religioso esclusivo.",
    readerPromise:
      "Sentire più calma, riconoscere la propria essenza, tornare a respirare.",
    dos: [
      "Spazio bianco e respiro nella prosa",
      "Pratiche concrete (5-10 min)",
      "Universalità (non legare a una sola tradizione)",
      "Tono umile, non guru",
    ],
    donts: [
      "Bypass spirituale (negare il dolore)",
      "Linguaggio esoterico fumoso",
      "Promesse di risveglio facile",
      "Citare maestri senza integrare",
    ],
    chapterEnding:
      "Chiudere con un invito al silenzio o una frase-mantra da portare nella giornata.",
  },

  philosophy: {
    authorsDNA:
      "Alain de Botton (accessibile + profondo), Albert Camus (chiarezza poetica), Byung-Chul Han (diagnosi del presente).",
    tone:
      "Lucido, curioso, gentilmente provocatorio. Pensare insieme al lettore, non insegnare.",
    pacing:
      "Capitoli medio-brevi. Pensiero che procede per esempi, paradossi, esperimenti mentali.",
    structure:
      "Domanda → Esempio quotidiano → Tradizione filosofica → Tensione/paradosso → Riformulazione → Implicazione esistenziale.",
    chapterBeats: [
      "Apertura con scena/aneddoto",
      "Estrazione della domanda filosofica",
      "Posizioni a confronto",
      "Esperimento mentale o caso limite",
      "Conclusione provvisoria che apre, non chiude",
    ],
    hookTypes: [
      "Aneddoto quotidiano caricato di senso",
      "Domanda apparentemente semplice",
      "Citazione classica reinterpretata",
      "Paradosso del presente",
    ],
    vocabulary:
      "Preciso ma accessibile. Termini filosofici spiegati al volo. Metafore concrete.",
    readerPromise:
      "Pensare meglio, vedere il mondo con nuove lenti, sentirsi meno soli nel pensare.",
    dos: [
      "Esempi concreti per ogni concetto",
      "Onorare la complessità senza nasconderla",
      "Tenere il lettore come compagno di pensiero",
      "Concludere aprendo nuove domande",
    ],
    donts: [
      "Jargon accademico",
      "Conclusioni dogmatiche",
      "Sfoggio erudito",
      "Esempi solo da uomini bianchi morti",
    ],
    chapterEnding:
      "Chiudere con una domanda aperta o un'immagine che cristallizza il pensiero.",
  },

  business: {
    authorsDNA:
      "Peter Thiel (contrarian), Cal Newport (sistemi), Morgan Housel (storie + insight).",
    tone:
      "Lucido, contrarian quando serve, pratico. Niente buzzword, niente fuffa.",
    pacing:
      "Capitoli medi (2500-4000 parole). Framework chiari, case study, takeaway azionabili.",
    structure:
      "Tesi controintuitiva → Evidenza/storia → Framework → Applicazione → Errori da evitare → Azione concreta.",
    chapterBeats: [
      "Tesi controintuitiva in apertura",
      "Storia o case study",
      "Framework visualizzabile",
      "Applicazione step-by-step",
      "Takeaway azionabile + errori comuni",
    ],
    hookTypes: [
      "Statement contrarian",
      "Case study scioccante",
      "Numero/statistica controintuitiva",
      "Domanda strategica diretta",
    ],
    vocabulary:
      "Diretto, specifico, business-aware ma senza buzzword. Esempi concreti di aziende/persone reali.",
    readerPromise:
      "Pensare in modo diverso, avere framework usabili lunedì mattina, evitare errori costosi.",
    dos: [
      "1 framework o tesi forte per capitolo",
      "Case study reali e verificabili",
      "Takeaway azionabili",
      "Anti-pattern espliciti",
    ],
    donts: [
      "Buzzword vuote ('synergy', 'pivot', 'disruption')",
      "Consigli generici ('lavora sodo')",
      "Case study inventati o vaghi",
      "Toni da guru motivazionale",
    ],
    chapterEnding:
      "Chiudere con un takeaway azionabile + una sfida concreta per il lettore.",
  },

  memoir: {
    authorsDNA:
      "Tara Westover (Educated), Mary Karr (voce), Cheryl Strayed (vulnerabilità).",
    tone:
      "Onesto, vivido, universale nel particolare. Niente autocompatimento.",
    pacing:
      "Scene lunghe e cariche, sensoriali. Riflessione retrospettiva dosata.",
    structure:
      "Mondo d'origine → Incrinatura → Eventi formativi → Scelta di rottura → Trasformazione → Riconciliazione (o no) → Senso ricavato.",
    chapterBeats: [
      "Scena d'apertura sensoriale e specifica",
      "Personaggi rivelati in azione",
      "Tensione interna o relazionale",
      "Momento che cambia qualcosa",
      "Riflessione breve dal presente",
    ],
    hookTypes: [
      "Memoria specifica con dettaglio fisico",
      "Frase del passato che ancora risuona",
      "Oggetto carico di senso",
      "Domanda retrospettiva",
    ],
    vocabulary:
      "Specifico, sensoriale, onesto. Linguaggio dell'epoca/luogo del ricordo. Riflessione adulta in italics o in stacchi.",
    readerPromise:
      "Vivere una vita non sua, riconoscersi, sentirsi meno solo nel proprio passato.",
    dos: [
      "Scene specifiche, non riassunti",
      "5 sensi sempre attivi",
      "Personaggi (anche difficili) con umanità",
      "Onestà che include i propri errori",
    ],
    donts: [
      "Autocompatimento",
      "Riassunti ('Quell'estate cambiò tutto')",
      "Vendette letterarie",
      "Sentenze morali sui personaggi",
    ],
    chapterEnding:
      "Chiudere su un dettaglio sensoriale che racchiude il significato della scena.",
  },

  /* ============== SPECIAL ============== */

  children: {
    authorsDNA:
      "Julia Donaldson (ritmo + ripetizione), Eric Carle (semplicità visiva), Roald Dahl (immaginazione + coraggio).",
    tone:
      "Caldo, giocoso, rispettoso del bambino. Mai didascalico. Magia nel quotidiano.",
    pacing:
      "Frasi brevi e ritmiche. Ripetizioni intenzionali. Ogni doppia pagina = un beat. Per età 3-6: 200-500 parole; 6-9: 1000-3000; 9-12: 5000-15000.",
    structure:
      "Personaggio amabile → Problema/desiderio → 3 tentativi (regola del 3) → Soluzione creativa → Lezione implicita → Finale rassicurante.",
    chapterBeats: [
      "Apertura giocosa che cattura subito",
      "Problema chiaro per il personaggio",
      "Tentativo + ostacolo (con umorismo)",
      "Aiuto inaspettato o intuizione",
      "Risoluzione che premia il coraggio/gentilezza",
    ],
    hookTypes: [
      "Onomatopea o suono ('BOOM!')",
      "Domanda diretta al piccolo lettore",
      "Personaggio che fa qualcosa di buffo",
      "Situazione assurda presentata come normale",
    ],
    vocabulary:
      "Adatto all'età. Parole concrete e immagini. Ripetizioni intenzionali (refrains). Mai parole inutilmente difficili, ma neanche infantilizzare.",
    readerPromise:
      "Far ridere il bambino, farlo sentire coraggioso, creare un momento condiviso col genitore.",
    dos: [
      "Refrain ripetuti (memorizzabili)",
      "Personaggi con tratto distintivo chiaro",
      "Risoluzioni che valorizzano coraggio/gentilezza/curiosità",
      "Spazio per le illustrazioni (non descrivere tutto)",
    ],
    donts: [
      "Morale esplicita ('La lezione è...')",
      "Paura senza rassicurazione finale",
      "Stereotipi di genere/cultura",
      "Linguaggio che parla SOPRA il bambino",
    ],
    chapterEnding:
      "Chiudere con un'immagine calda, un refrain ripetuto, o un piccolo cliffhanger giocoso.",
  },

  poetry: {
    authorsDNA:
      "Mary Oliver (natura + presenza), Ocean Vuong (memoria + corpo), Rupi Kaur (immediatezza emotiva).",
    tone:
      "Distillato, sensoriale, vero. Ogni parola pesa. Niente riempitivi.",
    pacing:
      "Versi brevi o lunghi a seconda del respiro. Spazio bianco è parte della poesia. Raccolte tematiche con arco emotivo.",
    structure:
      "Raccolta = arco emotivo (es. perdita → rabbia → accettazione → rinascita). Sezioni tematiche con poesia-soglia.",
    chapterBeats: [
      "Poesia d'apertura della sezione (statement)",
      "3-7 poesie che esplorano sfumature del tema",
      "Poesia-pivot (svolta emotiva)",
      "Poesia-chiusura (eco, immagine, domanda)",
    ],
    hookTypes: [
      "Immagine concreta inattesa",
      "Statement diretto in prima persona",
      "Domanda essenziale",
      "Dettaglio sensoriale che apre il mondo",
    ],
    vocabulary:
      "Concreto, fisico, preciso. Evitare astrazioni vaghe ('amore', 'dolore') senza ancorarle a un'immagine.",
    readerPromise:
      "Sentirsi visti, riconoscere la propria vita in poche righe, rileggere e sottolineare.",
    dos: [
      "Immagini concrete e specifiche",
      "Arco emotivo della raccolta",
      "Spazio bianco come strumento",
      "Verità personali rese universali",
    ],
    donts: [
      "Astrazioni senza ancoraggio",
      "Rime forzate (a meno che il progetto le richieda)",
      "Cliché poetici (luna/cuore/anima senza freschezza)",
      "Sentimentalismo senza pelle",
    ],
    chapterEnding:
      "Chiudere la sezione con una poesia che è una soglia: porta il lettore al tema successivo.",
  },

  /* ============== PRACTICAL / NON-FICTION (Genre Engine) ============== */

  cookbook: {
    authorsDNA: "Yotam Ottolenghi (sensorialità), Samin Nosrat (didattica empatica), Marcella Hazan (chiarezza essenziale).",
    tone: "Caloroso, sensoriale, preciso. Il lettore deve sentire profumi e fiducia che la ricetta riuscirà.",
    pacing: "Sezioni brevi e scannabili. Frasi imperative pulite negli step. Brevi note di contesto/storia tra le ricette.",
    structure: "Intro autoriale → Essenziali (strumenti/tecniche) → Ricette per sezione → Tips → Variazioni avanzate.",
    chapterBeats: ["Storia/contesto della ricetta (2-4 righe)", "Ingredienti (lista pulita)", "Steps numerati", "Tempi prep/cottura/porzioni", "Tips & varianti"],
    hookTypes: ["Ricordo personale legato al piatto", "Promessa sensoriale ('croccante fuori, fondente dentro')", "Origine culturale del piatto"],
    vocabulary: "Concreto, sensoriale, tecnico ma accessibile. Verbi di cucina precisi (rosolare, deglassare, mantecare).",
    readerPromise: "Cucinare con sicurezza piatti che funzionano davvero, e capire perché.",
    dos: ["Indicare sempre tempi e porzioni", "Suggerire sostituzioni", "Spiegare il PERCHÉ di uno step critico", "Inserire tips di chef"],
    donts: ["Step ambigui ('cuocere il giusto')", "Ingredienti senza quantità", "Saltare temperature/tempi", "Ricette senza yield"],
    chapterEnding: "Chiudere ogni ricetta con una nota di servizio (impiattamento) o una variante d'autore.",
  },

  "technical-manual": {
    authorsDNA: "Manuali O'Reilly (struttura), Donald Knuth (precisione), documentazione Apple (chiarezza visiva).",
    tone: "Preciso, neutro, autorevole. Zero retorica. Informazione densa ma navigabile.",
    pacing: "Sezioni brevi, headings frequenti, esempi inline. Molto white-space concettuale.",
    structure: "Overview → Concetti → Procedure → Esempi → Riferimenti → Troubleshooting.",
    chapterBeats: ["Obiettivo del capitolo", "Prerequisiti", "Concetti chiave", "Procedure step-by-step", "Esempi", "Errori comuni"],
    hookTypes: ["Problema concreto risolto in questo capitolo", "Caso d'uso reale", "Anti-pattern da evitare"],
    vocabulary: "Tecnico, preciso, definito. Glossario implicito coerente. Acronimi sempre espansi al primo uso.",
    readerPromise: "Capire e applicare il sistema/strumento senza ambiguità.",
    dos: ["Numerare gli step", "Mostrare input + output", "Indicare prerequisiti", "Inserire 'Common pitfalls'"],
    donts: ["Tono colloquiale gratuito", "Esempi giocattolo non riproducibili", "Saltare i prerequisiti", "Lasciare comandi senza spiegazione"],
    chapterEnding: "Chiudere con un riepilogo a bullet di cosa il lettore ora sa fare + link a sezione successiva.",
  },

  "software-guide": {
    authorsDNA: "Joel Spolsky (chiarezza pratica), David Pogue (manualistica accessibile), team Notion docs.",
    tone: "Pratico, amichevole, orientato al risultato. Mai paternalistico, mai criptico.",
    pacing: "Step brevi, screenshot mentali ('verrà visualizzata una finestra...'), checkpoints.",
    structure: "Introduction → Getting Started → Core Features → Advanced Techniques → Real Use Cases → Automation → Common Mistakes.",
    chapterBeats: ["Cosa imparerai", "Setup minimo", "Tutorial guidato", "Caso d'uso reale", "Shortcut/produttività", "Troubleshooting"],
    hookTypes: ["Promessa di risparmio tempo", "Trasformazione del workflow", "Errore comune che evita ore di lavoro"],
    vocabulary: "Concreto, orientato al verbo. Nomi UI esatti. Niente jargon non necessario.",
    readerPromise: "Diventare operativo subito e padroneggiare il software con casi reali.",
    dos: ["Step numerati", "Indicare versione del software", "Caso d'uso prima della teoria", "Shortcut da tastiera"],
    donts: ["Walls of text", "Tutorial senza obiettivo finale chiaro", "Saltare lo stato iniziale dell'app"],
    chapterEnding: "Chiudere con 'Riassumendo' + esercizio pratico opzionale.",
  },

  "ai-tools-guide": {
    authorsDNA: "Ethan Mollick (Co-Intelligence), Andrej Karpathy (clarity), team OpenAI cookbook.",
    tone: "Concreto, sperimentale, anti-hype. Mostrare prompt veri e risultati veri.",
    pacing: "Veloce, esempi-driven. Prompt → output → analisi.",
    structure: "Introduction → Capire il modello → Prompt foundations → Workflows reali → Integrazioni → Limiti & rischi → Avanzato.",
    chapterBeats: ["Use case", "Prompt template", "Variazioni del prompt", "Output atteso", "Tweaks & failure modes", "Workflow integrato"],
    hookTypes: ["Risultato sorprendente del modello", "Prompt che cambia la qualità", "Fallimento comune e come fixarlo"],
    vocabulary: "Tecnico ma accessibile. 'Prompt', 'context', 'temperature', 'tool use' usati con precisione.",
    readerPromise: "Usare AI per ottenere risultati reali in produttività/lavoro, non gimmick.",
    dos: ["Mostrare prompt + output reale", "Spiegare PERCHÉ un prompt funziona", "Indicare modello e versione", "Workflow ripetibili"],
    donts: ["Hype generico", "Prompt magici senza contesto", "Esempi senza output", "Ignorare limiti/hallucination"],
    chapterEnding: "Chiudere con un 'Try this' — prompt pronto da copiare e adattare.",
  },

  gardening: {
    authorsDNA: "Monty Don (calore + competenza), Charles Dowding (no-dig pragmatico), Gertrude Jekyll (estetica).",
    tone: "Pratico ed educativo, con stagionalità e rispetto per il vivente.",
    pacing: "Sezioni brevi per stagione/operazione. Molte liste e calendari.",
    structure: "Introduzione → Strumenti & setup → Basi ambientali → Guida stagionale → Manutenzione → Problemi comuni → Tips esperti.",
    chapterBeats: ["Obiettivo stagionale", "Cosa serve", "Procedura step-by-step", "Errori comuni", "Tips dell'esperto"],
    hookTypes: ["Promessa di raccolto/fioritura", "Errore tipico evitato", "Aneddoto orticolo"],
    vocabulary: "Concreto: nomi botanici quando utili, unità di misura, stagioni esplicite (zone climatiche).",
    readerPromise: "Coltivare con successo, capire il proprio terreno, evitare gli errori da principiante.",
    dos: ["Indicare stagione e zona climatica", "Quantità e tempi precisi", "Diagnosi visiva dei problemi", "Calendari operativi"],
    donts: ["Consigli generici 'annaffiare il giusto'", "Ignorare il clima del lettore", "Liste piante senza contesto"],
    chapterEnding: "Chiudere con un 'cosa fare la prossima settimana/stagione'.",
  },

  beekeeping: {
    authorsDNA: "Thomas Seeley (scienza dell'alveare), Roger Morse (manualistica classica), divulgatori FAI.",
    tone: "Tecnico e rispettoso. Sicurezza prima di tutto, etica dell'apicoltore presente.",
    pacing: "Capitoli per stagione apistica + sezioni di emergenza brevi e immediate.",
    structure: "Introduzione → Biologia dell'ape → Attrezzatura & sicurezza → Calendario apistico → Patologie → Smielatura → Etica & normativa.",
    chapterBeats: ["Contesto biologico", "Procedura operativa", "Sicurezza", "Cosa osservare nell'alveare", "Decisioni di gestione"],
    hookTypes: ["Comportamento sorprendente delle api", "Errore che costa una famiglia", "Stagione critica imminente"],
    vocabulary: "Tecnico apistico (favo, telaino, sciamatura, varroa), sempre definito al primo uso.",
    readerPromise: "Gestire l'alveare con competenza, riconoscere i segnali, evitare collassi.",
    dos: ["Sicurezza operatore (DPI)", "Tempi stagionali precisi", "Protocollo varroa", "Note normative locali"],
    donts: ["Antropomorfizzare le api", "Saltare la sicurezza", "Trattamenti senza dosaggio/timing"],
    chapterEnding: "Chiudere con checklist operativa per la prossima visita all'alveare.",
  },

  "health-medicine": {
    authorsDNA: "Atul Gawande (chiarezza clinica), Peter Attia (rigore + pragmatismo), divulgazione Mayo Clinic.",
    tone: "Scientifico, sobrio, empatico. Mai sensazionalista. Disclaimer presenti.",
    pacing: "Capitoli con evidenze prima, applicazione dopo. Box di warning ben visibili.",
    structure: "Fondamenti scientifici → Come funziona il corpo → Protocolli → Piani giornalieri → Avvertenze → Casi studio.",
    chapterBeats: ["Evidenze", "Meccanismo", "Protocollo applicabile", "Warning/controindicazioni", "Caso clinico/esempio"],
    hookTypes: ["Mito da sfatare con evidenze", "Caso clinico illuminante", "Statistica controintuitiva"],
    vocabulary: "Medico-scientifico ma divulgativo. Termini tecnici sempre definiti. Niente claim assoluti.",
    readerPromise: "Capire il proprio corpo e prendere decisioni informate, sapendo quando consultare un medico.",
    dos: ["Disclaimer 'non sostituisce parere medico'", "Citare fonti/evidenze", "Indicare quando consultare uno specialista", "Distinguere correlazione/causalità"],
    donts: ["Promesse di cura", "Assolutismi ('cura ogni'...)", "Dosaggi senza supervisione", "Aneddoti spacciati per evidenze"],
    chapterEnding: "Chiudere con 'Quando rivolgersi al medico' + key takeaways.",
  },

  "diet-nutrition": {
    authorsDNA: "Michael Pollan (chiarezza culturale), Marion Nestle (rigore), Tim Spector (microbioma).",
    tone: "Pratico e basato sull'evidenza. Calmo verso le mode, chiaro sui meccanismi.",
    pacing: "Teoria essenziale + protocolli operativi + meal plan. Ricette/esempi concreti.",
    structure: "Principi → Macro/Micro → Protocolli → Meal plan settimanali → Spesa & cucina → Avvertenze → Casi reali.",
    chapterBeats: ["Principio chiave", "Evidenze", "Applicazione settimanale", "Esempi pasto", "Errori comuni"],
    hookTypes: ["Mito alimentare sfatato", "Risultato pratico ottenibile", "Confronto cibo industriale vs reale"],
    vocabulary: "Nutrizionale preciso (macro, indice glicemico, fibra) ma accessibile. Niente moralismo alimentare.",
    readerPromise: "Mangiare meglio in modo sostenibile, capire le etichette, costruire pasti che funzionano.",
    dos: ["Disclaimer medico", "Quantità e porzioni", "Alternative per intolleranze", "Lista spesa", "Adattabilità culturale"],
    donts: ["Diete miracolo", "Demonizzare singoli alimenti", "Numeri senza contesto", "Promesse di peso in tempi brevi"],
    chapterEnding: "Chiudere con 'Questa settimana prova:' + 1 azione concreta.",
  },

  fitness: {
    authorsDNA: "Mark Rippetoe (chiarezza tecnica), Alex Hutchinson (scienza), Kelly Starrett (mobilità).",
    tone: "Diretto, motivante, tecnico. Forma prima di tutto, progressione misurabile.",
    pacing: "Spiegazione tecnica + tabella programma + checklist di esecuzione.",
    structure: "Principi del training → Valutazione iniziale → Tecnica → Programmi → Recovery → Nutrizione di base → Avanzato.",
    chapterBeats: ["Principio fisiologico", "Tecnica esercizio", "Programma settimanale", "Errori di forma", "Progressione"],
    hookTypes: ["Errore di forma comune", "Risultato misurabile in X settimane", "Mito del fitness sfatato"],
    vocabulary: "Tecnico (RPE, RIR, ROM, hypertrophy, deload). Definito al primo uso. Imperativi puliti.",
    readerPromise: "Allenarsi in sicurezza con un programma vero che produce risultati misurabili.",
    dos: ["Forma > carico", "Indicare reps/sets/RPE", "Progressione esplicita", "Warm-up e mobilità", "Deload settimane"],
    donts: ["Programmi senza progressione", "Esercizi rischiosi senza spiegazione", "Promesse 'in 7 giorni'"],
    chapterEnding: "Chiudere con la tabella della settimana + checklist di esecuzione.",
  },

  productivity: {
    authorsDNA: "Cal Newport (Deep Work), David Allen (GTD), Tiago Forte (Building a Second Brain).",
    tone: "Pragmatico, sistemico, anti-hustle. Sistemi > motivazione.",
    pacing: "Concetto → sistema → workflow → caso reale. Diagrammi mentali frequenti.",
    structure: "Diagnosi attuale → Principi → Sistemi (capture/process/review) → Workflow → Strumenti → Manutenzione → Casi reali.",
    chapterBeats: ["Problema reale", "Principio", "Sistema operativo", "Setup pratico", "Esempio settimanale", "Cosa NON fare"],
    hookTypes: ["Stato attuale doloroso del lettore", "Sistema controintuitivo che funziona", "Errore di tutti i sistemi 'pop'"],
    vocabulary: "Sistemico (input, throughput, review, leverage). Concreto, non motivazionale vuoto.",
    readerPromise: "Costruire un sistema personale che regge nel tempo e produce output reale.",
    dos: ["Esempi reali di settimana/mese", "Template copiabili", "Tempi di setup e mantenimento", "Anti-pattern espliciti"],
    donts: ["Hack motivazionali isolati", "Sistemi che richiedono perfezione per funzionare", "Liste tool senza criterio"],
    chapterEnding: "Chiudere con un 'setup minimo da fare oggi in 20 minuti'.",
  },

  education: {
    authorsDNA: "Barbara Oakley (A Mind for Numbers), Make It Stick (Brown/Roediger), Khan-style clarity.",
    tone: "Chiaro, incoraggiante, evidence-based. Scaffolding pulito.",
    pacing: "Concetto → esempio → check di comprensione → esercizio → ricap.",
    structure: "Obiettivi di apprendimento → Concetti fondamentali → Esempi → Esercizi → Check → Approfondimenti → Sintesi.",
    chapterBeats: ["Learning objectives", "Concetto", "Esempio guidato", "Esercizio", "Errori tipici", "Sintesi"],
    hookTypes: ["Domanda che il capitolo risponderà", "Esempio del mondo reale", "Misconception comune"],
    vocabulary: "Definito, scaffolded. Glossario coerente. Difficoltà crescente esplicita.",
    readerPromise: "Capire davvero, non solo memorizzare. Saper applicare in contesti nuovi.",
    dos: ["Learning objectives all'inizio", "Esempi prima della regola", "Pratica spaziata", "Recap a fine capitolo", "Check di autovalutazione"],
    donts: ["Definizioni a muro", "Esercizi senza soluzione/spiegazione", "Saltare i prerequisiti"],
    chapterEnding: "Chiudere con sintesi + 3 domande di autovalutazione.",
  },

  /* ============== ESTENSIONI: creativi + intrattenimento ============== */
  biography: {
    authorsDNA: "Walter Isaacson (Jobs/Einstein), Robert Caro (LBJ), Doris Kearns Goodwin.",
    tone: "Rigoroso, narrativo, citazionale. La vita come arco, i fatti come prove.",
    pacing: "Capitoli per fasi della vita, scene dettagliate alternate a sintesi storiche, citazioni dirette.",
    structure: "Origini → Formazione → Ascesa → Crisi → Apice → Eredità.",
    chapterBeats: ["Aneddoto rivelatore", "Contesto storico", "Decisione chiave", "Conseguenze", "Voci dei contemporanei"],
    hookTypes: ["Scena privata pubblicata per la prima volta", "Citazione enigmatica", "Domanda aperta sulla vita"],
    vocabulary: "Storico-narrativo, terza persona, citazioni precise con fonte implicita.",
    readerPromise: "Capire non solo cosa fece, ma perché — e cosa significhi oggi.",
    dos: ["Citare fonti", "Mostrare contraddizioni", "Contestualizzare l'epoca"],
    donts: ["Agiografia", "Salti temporali confusi", "Speculazione senza disclaimer"],
    chapterEnding: "Chiudere con una decisione che apre il capitolo successivo.",
  },
  "fairy-tale": {
    authorsDNA: "Fratelli Grimm, Hans Christian Andersen, Italo Calvino (Fiabe italiane).",
    tone: "Evocativo, ritmato, archetipico. Tempo sospeso, morale implicita.",
    pacing: "Apertura formulaica → tre prove → climax → risoluzione + morale. Brevità incantata.",
    structure: "C'era una volta → Mancanza → Viaggio → Prove (regola del 3) → Trasformazione → Lieto fine/Morale.",
    chapterBeats: ["Formula d'apertura", "Presentazione dell'eroe", "Aiutante magico", "Prova", "Risoluzione"],
    hookTypes: ["C'era una volta...", "In un regno lontano...", "Tanto tempo fa..."],
    vocabulary: "Semplice ma evocativo, ripetizioni rituali, dialoghi diretti.",
    readerPromise: "Sentirsi trasportati in un mondo magico con una verità nascosta.",
    dos: ["Archetipi chiari", "Regola del tre", "Morale implicita non didascalica"],
    donts: ["Realismo psicologico", "Linguaggio moderno", "Ambiguità morale eccessiva"],
    chapterEnding: "Chiusura formulaica o ponte verso la prossima prova.",
  },
  jokes: {
    authorsDNA: "Jerry Seinfeld (osservazionale), Mitch Hedberg (one-liner), Tig Notaro (deadpan).",
    tone: "Comico. Timing, sorpresa, brevità. Mai spiegare la battuta.",
    pacing: "Set-up brevissimo → punchline secca. Regola del tre. Densità: 3-10 battute/pagina.",
    structure: "Per categorie tematiche (lavoro, coppia, animali, ecc.) o per tipo (one-liner, dialoghi, paradossi).",
    chapterBeats: ["Apertura categoria", "Battute crescenti per impatto", "Battuta-bomba di chiusura"],
    hookTypes: ["Domanda assurda", "Affermazione paradossale", "Premessa quotidiana"],
    vocabulary: "Quotidiano, conciso, ritmico. Verbi forti.",
    readerPromise: "Ridere ad alta voce almeno una volta per pagina.",
    dos: ["Brevità chirurgica", "Sorpresa nella punchline", "Variare i tipi di battuta"],
    donts: ["Spiegare la battuta", "Riferimenti datati", "Battute offensive senza intelligenza"],
    chapterEnding: "Chiudere con la battuta più forte della categoria.",
  },
  manual: {
    authorsDNA: "Manuali tecnici Apple/IKEA, O'Reilly, manuali professionali certificati.",
    tone: "Neutro, procedurale, esaustivo. Nessuna emozione, massima chiarezza.",
    pacing: "Sezioni numerate, ogni step un'azione, esempi visivi (descritti), troubleshooting.",
    structure: "Introduzione → Prerequisiti → Procedura passo-passo → Esempi → Troubleshooting → Riferimenti.",
    chapterBeats: ["Obiettivo", "Prerequisiti", "Procedura", "Verifica", "Errori comuni"],
    hookTypes: ["Obiettivo concreto", "Caso d'uso", "Problema da risolvere"],
    vocabulary: "Tecnico, preciso, terminologia spiegata al primo uso.",
    readerPromise: "Saper FARE qualcosa di specifico al termine del capitolo.",
    dos: ["Verbi imperativi", "Numerazione", "Output atteso esplicito"],
    donts: ["Ambiguità", "Filler narrativo", "Saltare prerequisiti"],
    chapterEnding: "Checklist di verifica + transizione al modulo successivo.",
  },
};

const BLUEPRINTS: Partial<Record<GenreKey, GenreBlueprint>> = {
  cookbook: {
    structure: ["Introduction", "Kitchen Essentials", "Ingredients Guide", "Recipes by Category", "Quick Recipes", "Advanced Recipes", "Tips & Variations"],
    tone: "warm + sensorial + precise",
    chapterStyle: "recipe_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About the Author", "How to Use This Cookbook", "Kitchen Equipment Notes", "Letter to the Reader"],
    backMatterTemplate: ["Conversion Tables", "Ingredient Substitutions", "Index by Ingredient", "Acknowledgments", "Other Books"],
    contentRules: [
      "Each recipe MUST include: ingredients list with exact quantities, numbered steps, prep time, cook time, servings",
      "Add tips & variations at the end of every recipe",
      "Use precise cooking verbs (sear, deglaze, fold)",
      "Indicate temperatures in both °C and °F when possible",
    ],
  },
  "technical-manual": {
    structure: ["Overview", "Prerequisites", "Core Concepts", "Procedures", "Configuration", "Examples", "Reference", "Troubleshooting"],
    tone: "precise + neutral + authoritative",
    chapterStyle: "reference_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About This Manual", "Conventions Used", "Prerequisites", "How to Use This Book"],
    backMatterTemplate: ["Glossary", "Reference Tables", "Common Errors", "Index", "Further Reading"],
    contentRules: [
      "Every procedure MUST be numbered step-by-step",
      "Show input AND expected output for every example",
      "Define every acronym at first use",
      "Include 'Common Pitfalls' section per chapter",
    ],
  },
  "software-guide": {
    structure: ["Introduction", "Getting Started", "Core Features", "Advanced Techniques", "Real Use Cases", "Automation Workflows", "Common Mistakes"],
    tone: "practical + friendly + result-oriented",
    chapterStyle: "step_by_step",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About This Guide", "Software Version Notes", "How to Use This Book", "Letter to the Reader"],
    backMatterTemplate: ["Keyboard Shortcuts Reference", "Templates Library", "Troubleshooting Guide", "Glossary", "Other Books"],
    contentRules: [
      "Each chapter starts with 'What You'll Learn' + estimated time",
      "Number every step; reference exact UI element names",
      "Show before/after of every workflow",
      "End each chapter with a summary + practical exercise",
    ],
  },
  "ai-tools-guide": {
    structure: ["Introduction", "Understanding the Model", "Prompt Foundations", "Real Workflows", "Integrations", "Limits & Risks", "Advanced Techniques"],
    tone: "concrete + experimental + anti-hype",
    chapterStyle: "workflow_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About This Guide", "Model & Version Notes", "How to Use This Book", "Disclaimer"],
    backMatterTemplate: ["Prompt Library", "Failure Modes Reference", "Integration Recipes", "Glossary", "Other Books"],
    contentRules: [
      "Show real prompt + real output for every concept",
      "Explain WHY a prompt works",
      "Always indicate model name and version used",
      "End each chapter with a 'Try this' copyable prompt",
    ],
  },
  gardening: {
    structure: ["Introduction", "Tools & Setup", "Environment Basics", "Seasonal Guide", "Maintenance", "Common Problems", "Expert Tips"],
    tone: "practical + educational + seasonal",
    chapterStyle: "lesson_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About the Author", "Climate Zone Notes", "How to Use This Book", "Letter to the Gardener"],
    backMatterTemplate: ["Seasonal Calendar", "Plant Index", "Problem Diagnosis Chart", "Resources", "Other Books"],
    contentRules: [
      "Always specify season AND climate zone",
      "Quantities and timings must be explicit",
      "Include visual diagnosis cues for problems",
      "End each chapter with 'next week/season' actions",
    ],
  },
  beekeeping: {
    structure: ["Introduction", "Bee Biology", "Equipment & Safety", "Beekeeping Calendar", "Diseases & Pests", "Honey Harvest", "Ethics & Regulations"],
    tone: "technical + respectful + safety-first",
    chapterStyle: "protocol_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About the Author", "Safety Notes", "Regional Regulations Disclaimer", "How to Use This Book"],
    backMatterTemplate: ["Beekeeping Calendar", "Disease Identification Chart", "Equipment Checklist", "Glossary", "Resources"],
    contentRules: [
      "Always include operator safety (PPE) reminders",
      "Specify exact seasonal timing for every operation",
      "Include varroa treatment protocols with dosage and timing",
      "End each chapter with operational checklist for next hive visit",
    ],
  },
  "health-medicine": {
    structure: ["Scientific Foundations", "How the Body Works", "Protocols", "Daily Plans", "Warnings", "Case Studies", "When to See a Doctor"],
    tone: "scientific + sober + empathetic",
    chapterStyle: "protocol_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "Medical Disclaimer", "About the Author", "How to Use This Book", "Important Notes"],
    backMatterTemplate: ["Medical Glossary", "Evidence References", "When to See a Specialist", "Resources", "Other Books"],
    contentRules: [
      "Medical disclaimer 'not a substitute for medical advice' on every protocol chapter",
      "Cite evidence and sources",
      "Distinguish correlation vs causation explicitly",
      "End each chapter with 'When to consult a doctor' + key takeaways",
    ],
  },
  "diet-nutrition": {
    structure: ["Principles", "Macros & Micros", "Protocols", "Weekly Meal Plans", "Shopping & Cooking", "Warnings", "Real Cases"],
    tone: "practical + evidence-based + non-moralistic",
    chapterStyle: "protocol_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "Medical Disclaimer", "About the Author", "How to Use This Book"],
    backMatterTemplate: ["Sample Meal Plans", "Shopping List Template", "Substitutions Table", "Resources", "Other Books"],
    contentRules: [
      "Medical disclaimer required",
      "Include exact quantities and portions",
      "Provide alternatives for common intolerances",
      "End each chapter with 'This week try:' + 1 concrete action",
    ],
  },
  fitness: {
    structure: ["Training Principles", "Initial Assessment", "Technique", "Programs", "Recovery", "Basic Nutrition", "Advanced Training"],
    tone: "direct + motivating + technical",
    chapterStyle: "protocol_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "Medical Disclaimer", "About the Author", "How to Use This Book", "Equipment Notes"],
    backMatterTemplate: ["Program Templates", "Exercise Library", "Progression Tables", "Recovery Checklist", "Resources"],
    contentRules: [
      "Form before load — always",
      "Specify reps, sets, RPE/RIR for every program",
      "Explicit progression scheme",
      "Include warm-up, mobility, deload weeks",
      "End each chapter with weekly table + execution checklist",
    ],
  },
  productivity: {
    structure: ["Current Diagnosis", "Principles", "Capture System", "Process & Review", "Workflows", "Tools", "System Maintenance", "Real Cases"],
    tone: "pragmatic + systemic + anti-hustle",
    chapterStyle: "workflow_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About the Author", "How to Use This Book", "Letter to the Overwhelmed Reader"],
    backMatterTemplate: ["Templates Library", "Tool Recommendations", "Weekly Review Checklist", "Resources", "Other Books"],
    contentRules: [
      "Always show real weekly/monthly examples",
      "Provide copyable templates",
      "State setup time AND ongoing maintenance time",
      "End each chapter with a 20-minute setup the reader can do today",
    ],
  },
  education: {
    structure: ["Learning Objectives", "Foundational Concepts", "Worked Examples", "Practice Exercises", "Common Misconceptions", "Synthesis", "Going Deeper"],
    tone: "clear + encouraging + evidence-based",
    chapterStyle: "lesson_blocks",
    hasSubchapters: true,
    frontMatterTemplate: ["Title Page", "Copyright", "About This Book", "How to Study with This Book", "Prerequisites", "Letter to the Learner"],
    backMatterTemplate: ["Answer Key", "Glossary", "Further Reading", "Index", "Other Books"],
    contentRules: [
      "Every chapter starts with explicit learning objectives",
      "Examples BEFORE rules (concrete-to-abstract)",
      "Spaced practice and recap mandatory",
      "End each chapter with synthesis + 3 self-assessment questions",
    ],
  },
};

/* ============ Resolution + Public API ============ */

/**
 * Risolve il genere selezionato dall'utente (con sub-categoria opzionale)
 * a una `GenreKey` del registro PROFILES.
 */
export function resolveGenreKey(genre: string, subcategory?: string): GenreKey {
  const g = (genre || "").toLowerCase().trim();
  const sub = (subcategory || "").toLowerCase().trim();

  // direct hit
  if (g in PROFILES) return g as GenreKey;

  // mapping euristico per sub/category
  if (sub.includes("horror") || g.includes("horror")) return "horror";
  if (sub.includes("sci") || sub.includes("fantascienza") || g.includes("sci"))
    return "sci-fi";
  if (sub.includes("storic") || sub.includes("historical") || g.includes("histor"))
    return "historical";
  if (sub.includes("favol") || sub.includes("fairy") || g.includes("fairy") || g.includes("favol"))
    return "fairy-tale";
  if (sub.includes("bambin") || sub.includes("children") || sub.includes("kids") || g.includes("children"))
    return "children";
  if (sub.includes("poesia") || sub.includes("poetry") || g.includes("poetry") || g.includes("poesia"))
    return "poetry";
  if (sub.includes("barzell") || sub.includes("joke") || g.includes("joke") || g.includes("barzell") || g.includes("humor"))
    return "jokes";
  if (sub.includes("biograf") || sub.includes("biography") || g.includes("biograph"))
    return "biography";
  if (g === "manual" || sub.includes("manual") || g.includes("manuale")) return "manual";
  if (
    g.includes("garden") ||
    sub.includes("garden") ||
    sub.includes("orto") ||
    sub.includes("coltiv") ||
    sub.includes("pomod") ||
    sub.includes("agricol") ||
    sub.includes("hortic") ||
    sub.includes("giardin")
  )
    return "gardening";
  if (sub.includes("bee") || sub.includes("apic") || g.includes("beekeep")) return "beekeeping";
  if (sub.includes("cook") || sub.includes("ricett") || g.includes("cookbook")) return "cookbook";
  if (sub.includes("productiv") || g.includes("productiv")) return "productivity";
  if (sub.includes("psych") || g.includes("psych")) return "psychology";
  if (sub.includes("fitness") || g.includes("fitness")) return "fitness";
  if (sub.includes("tech") || g.includes("technical")) return "technical-manual";
  if (
    sub.includes("spirit") ||
    sub.includes("medita") ||
    sub.includes("mindful") ||
    g.includes("spirit")
  )
    return "spirituality";
  if (g.includes("dark")) return "dark-romance";
  if (g.includes("romance")) return "romance";
  if (g.includes("thrill")) return "thriller";
  if (g.includes("fantasy")) return "fantasy";
  if (g.includes("philos") || g.includes("filos")) return "philosophy";
  if (g.includes("business")) return "business";
  if (g.includes("memoir") || g.includes("autobio")) return "memoir";
  if (g.includes("self") || g.includes("crescita") || g.includes("ansia"))
    return "self-help";

  return "manual";
}

export function getGenreProfile(genre: string, subcategory?: string): GenreProfile {
  const key = resolveGenreKey(genre, subcategory);
  const base = PROFILES[key];
  const supreme = getSupremeGenreProfile({ genre, subcategory });
  const supremeDos = supremeRulesAsFlatList(supreme).slice(0, 8);
  return {
    ...base,
    dos: [
      ...supremeDos,
      ...base.dos.filter(d => !supremeDos.some(s => s.toLowerCase() === d.toLowerCase())),
    ].slice(0, 14),
    donts: [
      ...supreme.preventionNotes,
      ...base.donts,
    ].slice(0, 14),
  };
}

/**
 * Rende il profilo come blocco prompt da iniettare nel system prompt
 * del Writing Engine. Sostituisce il vecchio `getGenrePrompt`.
 */
export function buildGenreSystemBlock(genre: string, subcategory?: string): string {
  const supreme = buildSupremeGenrePromptBlock(getSupremeGenreProfile({ genre, subcategory }));
  const p = getGenreProfile(genre, subcategory);
  const key = resolveGenreKey(genre, subcategory);

  const legacy = `GENRE INTELLIGENCE — ${key.toUpperCase()}
Authors-DNA reference: ${p.authorsDNA}
Tone: ${p.tone}
Pacing: ${p.pacing}
Vocabulary register: ${p.vocabulary}
Reader promise (what they MUST feel): ${p.readerPromise}

CHAPTER BEATS (use as scaffold, never label them in the text):
${p.chapterBeats.map((b, i) => `${i + 1}. ${b}`).join("\n")}

OPENING HOOK PATTERNS (pick one per chapter, never repeat in a row):
${p.hookTypes.map((h) => `• ${h}`).join("\n")}

ALWAYS DO:
${p.dos.map((d) => `✓ ${d}`).join("\n")}

NEVER DO:
${p.donts.map((d) => `✗ ${d}`).join("\n")}

CHAPTER ENDING RULE: ${p.chapterEnding}`;

  return `${supreme}\n\n${legacy}`;
}

/**
 * Rende il profilo come blocco prompt per il Blueprint Engine
 * (usato in generateBlueprint). Più sintetico, focalizzato su struttura.
 */
export function buildGenreBlueprintBlock(genre: string, subcategory?: string): string {
  const p = getGenreProfile(genre, subcategory);
  const key = resolveGenreKey(genre, subcategory);

  return `BLUEPRINT GUIDANCE — ${key.toUpperCase()}
Narrative/logical structure: ${p.structure}
Reader promise: ${p.readerPromise}
Tone target: ${p.tone}

When designing the chapter outline:
- Each chapter must advance the structure above by ONE meaningful step.
- Avoid filler chapters; every chapter is load-bearing.
- Hook types available: ${p.hookTypes.join(" | ")}
- Forbidden patterns: ${p.donts.slice(0, 3).join(" | ")}`;
}

/* ============ GENRE BLUEPRINT API ============ */

function buildFallbackBlueprint(key: GenreKey, p: GenreProfile): GenreBlueprint {
  const fictionish = ["horror", "thriller", "romance", "dark-romance", "fantasy", "sci-fi", "historical", "memoir", "children", "poetry"].includes(key);
  return {
    structure: p.structure.split(/[→\->|·;,]/).map(s => s.trim()).filter(Boolean).slice(0, 8),
    tone: p.tone,
    chapterStyle: fictionish ? "narrative" : "lesson_blocks",
    hasSubchapters: !fictionish,
    frontMatterTemplate: ["Title Page", "Copyright", "Dedication", "About the Author", "How to Use This Book", "Letter to the Reader"],
    backMatterTemplate: ["Conclusion", "Author Note", "Call to Action", "Review Request", "Other Books"],
    contentRules: [
      `Honor the genre tone: ${p.tone}`,
      `Reader promise: ${p.readerPromise}`,
      `Always do: ${p.dos.slice(0, 3).join(" · ")}`,
      `Never do: ${p.donts.slice(0, 3).join(" · ")}`,
    ],
  };
}

export function getGenreBlueprint(genre: string, subcategory?: string): GenreBlueprint {
  const key = resolveGenreKey(genre, subcategory);
  const explicit = BLUEPRINTS[key];
  if (explicit) return explicit;
  return buildFallbackBlueprint(key, PROFILES[key]);
}

/**
 * Editorial blueprint block: structure, chapter style, mandatory content rules.
 * Injected in the system prompt to change HOW the book is written per genre.
 */
export function buildGenreEditorialBlock(genre: string, subcategory?: string): string {
  const bp = getGenreBlueprint(genre, subcategory);
  const key = resolveGenreKey(genre, subcategory);

  return `EDITORIAL BLUEPRINT — ${key.toUpperCase()}
Book structure (sections): ${bp.structure.join(" → ")}
Editorial tone: ${bp.tone}
Chapter style: ${bp.chapterStyle}
Subchapters expected: ${bp.hasSubchapters ? "yes" : "no"}

CONTENT RULES (mandatory for every chapter):
${bp.contentRules.map(r => `• ${r}`).join("\n")}`;
}

export interface BuildPromptOptions {
  genre: string;
  subcategory?: string;
  chapterTitle: string;
  chapterSummary: string;
  language: string;
  previousChaptersContext?: string;
}

/**
 * Dynamic chapter prompt builder, genre-aware.
 * Uses the editorial blueprint to modulate how each chapter is structured.
 */
export function buildPromptByGenre(opts: BuildPromptOptions): string {
  const bp = getGenreBlueprint(opts.genre, opts.subcategory);
  const styleHints: Record<GenreBlueprint["chapterStyle"], string> = {
    narrative: "Write as flowing narrative prose. No bullet lists, no numbered steps in the body — let scene and rhythm carry the reader.",
    step_by_step: "Structure as numbered steps. Each step starts with an imperative verb. Show inputs and expected outcomes.",
    recipe_blocks: "Format as recipe block: brief intro story → INGREDIENTS list with exact quantities → numbered STEPS → prep/cook time and servings → TIPS & VARIATIONS.",
    reference_blocks: "Reference style: short conceptual intro → definitions → procedure → worked examples → 'Common Pitfalls' callout → quick-reference summary.",
    case_study: "Open with the situation → describe the actors → reveal the decision/conflict → show the outcome → extract the lesson explicitly.",
    lesson_blocks: "Lesson format: explicit Learning Objectives → concrete worked example → underlying rule → guided practice → check-for-understanding questions.",
    workflow_blocks: "Workflow format: real use case → end-to-end workflow with numbered steps → integrations/automation notes → 'Try this' copyable artifact.",
    protocol_blocks: "Protocol format: evidence/principle → step-by-step protocol with timings/dosages → warnings/contraindications → when to escalate to a professional.",
  };

  return `CHAPTER WRITING DIRECTIVE — Genre Engine
Chapter: "${opts.chapterTitle}"
Plan: ${opts.chapterSummary}
Language: ${opts.language} — write entirely in ${opts.language}.

CHAPTER STYLE: ${bp.chapterStyle}
${styleHints[bp.chapterStyle]}

EDITORIAL RULES (mandatory):
${bp.contentRules.map(r => `• ${r}`).join("\n")}

${opts.previousChaptersContext ? `CONTEXT FROM PREVIOUS CHAPTERS:\n${opts.previousChaptersContext}` : ""}`.trim();
}

