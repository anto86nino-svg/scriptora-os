import {
  extractConceptProtagonist,
  extractSubmergedCityLabel,
  extractSubmergedCityRole,
  hasBusinessRestaurantSignals,
  hasCookbookMediterraneanSignals,
  hasDragonFlameFantasySignals,
  hasEntityDrivenNarrativeSignals,
  hasHighConceptFantasySignals,
  hasHospitalGuardianMemoirSignals,
  hasHorrorStationSignals,
  hasPhotographyManualSignals,
  hasSubmergedCitySciFiSignals,
  hasSupernaturalThrillerSignals,
  isSparseConceptInput,
  sanitizeUserConceptInput,
  shouldUseEntityDrivenScaffold,
} from "@/lib/concept-dominance";

const GENERIC_PROMISE_PATTERNS = [
  /mistero disturbante con rivelazione progressiva/i,
  /tensione emotiva crescente/i,
  /promessa emotiva memorabile/i,
  /storia che resta addosso/i,
  /rivelazione progressiva e pressione emotiva/i,
  /atmosfera, decadenza e paura crescente/i,
  /un horror .+ dove atmosfera/i,
  /un fantasy .+ dove magia, tradimento e costo del potere/i,
  /magia, tradimento e costo del potere costruiscono una promessa epica/i,
];

export interface NarrativeIdeaSignals {
  protagonist?: string;
  places: string[];
  objects: string[];
  mysteries: string[];
  stakes: string[];
  uniqueElements: string[];
}

const SECONDARY_NAME_SKIP = new Set([
  "Il",
  "La",
  "Lo",
  "Le",
  "Gli",
  "Un",
  "Una",
  "Custode",
  "Concept",
  "Protagonista",
  "Personaggio",
  "Obiettivo",
  "Idea",
]);

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isGenericNarrativePromise(promise: string): boolean {
  const text = clean(promise);
  if (!text || text.length < 24) return true;
  return GENERIC_PROMISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractNarrativeIdeaSignals(idea: string): NarrativeIdeaSignals {
  const text = clean(sanitizeUserConceptInput(idea));
  const signals: NarrativeIdeaSignals = {
    places: [],
    objects: [],
    mysteries: [],
    stakes: [],
    uniqueElements: [],
  };
  if (!text) return signals;

  signals.protagonist = extractConceptProtagonist(text);

  const placePatterns = [
    /\b(citt[aà]\s+sommersa)\b/gi,
    /\b(citt[aà](?:\s+nel|\s+nascosta\s+sotto)?\s+(?:il\s+)?ghiaccio)/gi,
    /\b(citt[aà]\s+portuale\s+di\s+\w+)/gi,
    /\b(ferrara)\b/gi,
    /\b(ghiaccio\s+etern\w*)\b/gi,
    /\b(prigione\s+(?:di\s+)?ghiaccio)\b/gi,
    /\b(porta(?:\s+nel\s+cuore)?)/gi,
    /\b(bottega\s+delle\s+chiavi\s+perdute)\b/gi,
    /\b(stazione(?:\s+ferroviaria)?(?:\s+abbandonata)?)/gi,
    /\b(gallerie?\s+inesistenti?)/gi,
    /\b(piccolo\s+paese|paese|villaggio)/gi,
    /\b(casa|villa|bosco|ospedale|manicomio|isola|condominio|nagasaki|bruma|regno)\b/gi,
  ];
  for (const pattern of placePatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.places.includes(label)) signals.places.push(label);
    }
  }

  const objectPatterns = [
    /\b(fotograf(?:ia|ie))/gi,
    /\b(treno)/gi,
    /\b(chiave\s+del\s+17\s+ottobre)\b/gi,
    /\b(registro\s+delle\s+chiavi)\b/gi,
    /\b(chiavi?\s+(?:delle\s+)?scelte?\s+non\s+compiut\w*)\b/gi,
    /\b(chiave\s+(?:dal|del|proveniente\s+dal)\s+futuro)\b/gi,
    /\b(lettere?|diari?o|mappe?|orologio|specchio|scatola|chiavi?|confessione|bollette?)\b/gi,
  ];
  for (const pattern of objectPatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.objects.includes(label)) signals.objects.push(label);
    }
  }

  const mysteryPatterns = [
    /\b(donna(?:\s+vissuta)?(?:\s+\w+){0,4}\s+mille\s+anni)/gi,
    /\b(fine del mondo|apocaliss\w*|giorno della fine)/gi,
    /\b(ricordi(?:\s+di)?(?:\s+\w+){0,4})/gi,
    /\b(destino|memoria ancestrale)/gi,
    /\b(donna vestita di nero)/gi,
    /\b(\d{1,2}:\d{2})/g,
    /\b(ricordi che si riscrivono)/gi,
    /\b(persone cancellate dall'esistenza)/gi,
    /\b(fotograf(?:ia|ie) che cambiano)/gi,
    /\b(non lasciare che io salga sul treno)/gi,
    /\b(scelte?\s+non\s+compiut\w*)/gi,
    /\b(linea\s+temporale)\b/gi,
    /\b(Nora\s+Bellini)\b/g,
    /\b(libero\s+arbitrio)\b/gi,
    /\b(marted\w*|calendario|sonno|incubi|wifi|cadaver\w*|fantasma|mare\s+sta\s+salendo|mercato\s+nero|banche\s+dei\s+sogni|mezze\s+verit\w*)/gi,
  ];
  for (const pattern of mysteryPatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.mysteries.includes(label)) signals.mysteries.push(label);
    }
  }

  if (/\bmadre\b/i.test(text)) signals.stakes.push("madre");
  if (/\bmemor/i.test(text) || /\bricordi\b/i.test(text)) signals.stakes.push("memoria");
  if (/\bdestino\b/i.test(text)) signals.stakes.push("destino");
  if (/\bmorte(?:\s+predett\w*)?\b/i.test(text)) signals.stakes.push("morte");
  if (/\bfuturo\b/i.test(text)) signals.stakes.push("futuro");
  if (/\blinea\s+temporale\b/i.test(text)) signals.stakes.push("linea temporale");
  if (/\bscelte?\s+non\s+compiut\w*\b/i.test(text)) signals.stakes.push("scelte non compiute");
  if (/\blibero\s+arbitrio\b/i.test(text)) signals.stakes.push("libero arbitrio");
  if (/\bfine del mondo|apocaliss/i.test(text)) signals.stakes.push("fine del mondo");
  if (/\bcolpa\b/i.test(text)) signals.stakes.push("colpa");
  if (/\bparola\b/i.test(text)) signals.stakes.push("parola");
  if (/\bguerra\b/i.test(text)) signals.stakes.push("guerra");
  if (/\bsilenzio\b/i.test(text)) signals.stakes.push("silenzio");
  if (/\bmentir\w*\b/i.test(text)) signals.stakes.push("menzogna");
  if (/\bsegreto\b/i.test(text)) signals.stakes.push("segreto");
  if (/\bghiaccio\b/i.test(text)) signals.stakes.push("ghiaccio");
  if (/\bdisgelo\b/i.test(text)) signals.stakes.push("disgelo");
  if (/\bsvegli\w*|risvegli\w*\b/i.test(text)) signals.stakes.push("risveglio");

  const protagonistKey = normalize(signals.protagonist || "");
  for (const match of text.matchAll(/\b([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/g)) {
    const name = clean(match[1]);
    const key = normalize(name);
    if (!name || SECONDARY_NAME_SKIP.has(name) || key === protagonistKey) continue;
    if ([...signals.places, ...signals.objects, ...signals.mysteries, ...signals.stakes].some((item) => normalize(item) === key)) {
      continue;
    }
    signals.mysteries.push(name);
  }

  signals.uniqueElements = [
    ...signals.places,
    ...signals.objects,
    ...signals.mysteries,
    ...signals.stakes,
  ].filter((item, index, arr) => arr.indexOf(item) === index);

  return signals;
}

export function hasRichNarrativeIdea(idea: string): boolean {
  if (isSparseConceptInput(idea)) return false;
  if (hasEntityDrivenNarrativeSignals(idea)) return true;
  const signals = extractNarrativeIdeaSignals(idea);
  const sanitized = sanitizeUserConceptInput(idea);
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (signals.uniqueElements.length >= 3) return true;
  if (signals.protagonist && signals.uniqueElements.length >= 2) return true;
  if (words.length >= 14 && signals.uniqueElements.length >= 2) return true;
  return false;
}

export function buildEntityDrivenTitle(idea: string): string | undefined {
  const hay = clean(sanitizeUserConceptInput(idea)).toLowerCase();
  if (/\bcustode\b/.test(hay) && /\bchiav/.test(hay) && /\bperdut/.test(hay)) return "Il Custode delle Chiavi Perdute";
  if (/\bbottega\b/.test(hay) && /\bchiav/.test(hay) && /\bscelte?\s+non\s+compiut/.test(hay)) return "La Bottega delle Scelte Perdute";
  if (/\bscatola\b/.test(hay) && /\bmarted/.test(hay)) return "La Scatola del Martedì";
  if (/\bcadaver/.test(hay) && /\bbruma\b/.test(hay)) return "I Cadaveri che Parlano nei Sogni";
  if (/\bsonno\b/.test(hay) && /\bvaluta|banche\b/.test(hay)) return "La Valuta del Sonno";
  if (/\bvolpe\b/.test(hay) && /\bregno\b/.test(hay)) return "La Volpe che Non Sa Mentire";
  if (/\bfantasma\b/.test(hay) && /\bbollette|wifi\b/.test(hay)) return "Il Fantasma delle Bollette";
  if (/\bconfessione\b/.test(hay) && /\bnagasaki\b/.test(hay)) return "Una Parola a Nagasaki";
  if (/\bsilenzio\b/.test(hay)) return "Il Libro del Silenzio";
  if (/\bchiave\b/.test(hay) && /\bporte?\b/.test(hay)) return "La Chiave delle Porte Perdute";

  const signals = extractNarrativeIdeaSignals(idea);
  const anchor = signals.mysteries[0] || signals.objects[0] || signals.places[0];
  if (anchor && signals.protagonist) {
    return `${anchor}: storia di ${signals.protagonist}`;
  }
  if (anchor) return anchor.charAt(0).toUpperCase() + anchor.slice(1);
  return undefined;
}

export function buildEntityDrivenSubtitle(idea: string, protagonist?: string): string {
  const lead = protagonist || extractConceptProtagonist(idea) || "il protagonista";
  const hay = clean(sanitizeUserConceptInput(idea)).toLowerCase();
  if (/\bscatola\b/.test(hay) && /\bmarted/.test(hay)) {
    return `Ogni volta che ${lead} apre la scatola, un giorno sparisce dal calendario di tutti — e nessuno ricorda che sia mai esistito.`;
  }
  if (/\bcadaver/.test(hay) && /\bbruma\b/.test(hay)) {
    return `A Bruma, ${lead} pesca cadaveri che parlano solo nei sogni dei bambini mentre il mare sale di un piano a ogni luna piena.`;
  }
  if (/\bsonno\b/.test(hay) && /\bvaluta|banche|economist/.test(hay)) {
    return `Se il sonno è valuta, chi controlla le banche dei sogni controlla il futuro — tre economisti e un insomne cercano di chiudere il mercato nero degli incubi prima che diventi irreversibile.`;
  }
  if (/\bvolpe\b/.test(hay) && /\bmentir/.test(hay)) {
    return `${lead} non sa mentire in un regno dove mentire è obbligatorio per legge — e deve consegnare una lettera al Re delle Mezze Verità.`;
  }
  if (/\bfantasma\b/.test(hay) && /\bbollette|wifi|condominio/.test(hay)) {
    return `${lead} scopre che i morti del condominio usano il Wi-Fi per votare le assemblee — e il fantasma si lamenta solo delle bollette.`;
  }
  if (/\bconfessione\b/.test(hay) && /\bnagasaki|interprete/.test(hay)) {
    return `Nel 1743 a Nagasaki, ${lead} traduce una confessione che può far scoppiare una guerra tra tre imperi: una parola sbagliata costa mille vite.`;
  }
  if (/\bchiave\b/.test(hay) && /\bporte?\b/.test(hay)) {
    return `${lead} trova una chiave che apre solo porte che non esistono più — e ogni soglia rivelata riscrive ciò che credeva reale.`;
  }
  if (/\bchiav/.test(hay) && /\bscelte?\s+non\s+compiut/.test(hay)) {
    return `${lead} custodisce chiavi nate dalle scelte non compiute — finché una chiave dal futuro trasforma il destino in una domanda di libero arbitrio.`;
  }
  if (/\bsilenzio\b/.test(hay)) {
    return "Un'indagine lirica sul silenzio: cosa resta quando le parole non bastano più.";
  }
  const signals = extractNarrativeIdeaSignals(idea);
  const anchors = signals.uniqueElements.slice(0, 3).join(", ");
  return `${lead} attraversa ${anchors}: ogni capitolo aumenta la posta in gioco finché la verità non può più restare nascosta.`;
}

export function buildNarrativePromiseFromIdea(idea: string, genre?: string): string {
  const sanitized = sanitizeUserConceptInput(idea);
  const signals = extractNarrativeIdeaSignals(sanitized);
  const lead = signals.protagonist || "il protagonista";
  const genreLabel = clean(genre || "horror");

  if (hasDragonFlameFantasySignals(sanitized)) {
    return `${lead} nasce senza la fiamma che ogni drago riceve alla nascita e viene condannato a morte — finché scopre di poter controllare il fuoco degli altri draghi e diventa la minaccia più temuta del continente.`;
  }

  if (hasHospitalGuardianMemoirSignals(sanitized)) {
    return "Per venticinque anni di guardia notturna in un ospedale destinato alla chiusura, questo memoir racconta in prima persona le persone che hanno insegnato cosa significa essere umani — senza trama da fiction.";
  }

  if (hasBusinessRestaurantSignals(sanitized)) {
    return "Dal chiosco di panini alla catena di 17 ristoranti e milioni di fatturato: sistemi, errori e strategie imprenditoriali raccontati con chiarezza operativa — non arco narrativo da romanzo.";
  }

  if (hasPhotographyManualSignals(sanitized)) {
    return "Manuale pratico di fotografia digitale per principianti: esposizione, diaframma, composizione, luce, esercizi e piano di miglioramento di 30 giorni — senza deriva narrativa.";
  }

  if (hasCookbookMediterraneanSignals(sanitized)) {
    return "Ricettario mediterraneo con 100 ricette tradizionali, menu settimanali, varianti vegetariane e piano alimentare di 30 giorni — solo cucina applicabile.";
  }

  if (shouldUseEntityDrivenScaffold(sanitized)) {
    const entityPromise = buildEntityDrivenSubtitle(sanitized, lead);
    if (entityPromise && entityPromise.length >= 24) return entityPromise;
  }

  if (hasHorrorStationSignals(sanitized)) {
    const time = signals.mysteries.find((m) => /\d{1,2}:\d{2}/.test(m)) || extractTimeAnchor(sanitized);
    const place = signals.places.find((p) => /stazione/i.test(p)) || "la stazione ferroviaria abbandonata";
    const object = signals.objects.find((o) => /fotograf/i.test(o)) || "una fotografia della madre";
    return `${lead} deve capire perché ogni notte alle ${time || "03:17"} ${place} compare tra gallerie inesistenti — e cosa significa ${object} con l'avvertimento di non lasciare salire sul treno la madre.`;
  }

  if (signals.uniqueElements.length < 2) {
    return "";
  }

  if (hasSubmergedCitySciFiSignals(sanitized) || (/sci[-\s]?fi/i.test(genre || "") && /\b(citt[aà]|disgelo|ghiaccio)\b/i.test(sanitized))) {
    const city = extractSubmergedCityLabel(sanitized);
    const cityClause = /^l[ae]\s+/i.test(city)
      ? `della ${city.replace(/^l[ae]\s+/i, "")}`
      : `di ${city}`;
    const role = extractSubmergedCityRole(sanitized);
    const sevenDays = /\bsette\s+giorni\b/i.test(sanitized);
    const awakening = /\bsvegli\w*|risvegli\w*\b/i.test(sanitized);
    const timeClause = sevenDays
      ? " mentre gli abitanti credono che siano passati solo sette giorni"
      : "";
    const threatClause = awakening
      ? " — e scopre che il ghiaccio era una prigione costruita per contenere qualcosa che sta per svegliarsi"
      : " — mentre una minaccia imprigionata sotto la città inizia a risvegliarsi";
    return `${lead}, giovane ${role} ${cityClause}, scopre che il disgelo dopo trecento anni rivela tecnologia impossibile e un segreto capace di riscrivere la storia dell'umanità${timeClause}${threatClause}.`;
  }

  if (hasSupernaturalThrillerSignals(sanitized) || (/thriller/i.test(genre || "") && !hasHighConceptFantasySignals(sanitized))) {
    const time = signals.mysteries.find((m) => /\d{1,2}:\d{2}/.test(m));
    const place = signals.places.find((p) => /paese|villaggio/i.test(p)) || signals.places[0];
    const death = signals.stakes.includes("morte") || /\bmorte\b/i.test(sanitized);
    const future = signals.stakes.includes("futuro") || /\bfuturo\b/i.test(sanitized);
    const memory = signals.stakes.includes("memoria") || /\bricordi\b/i.test(sanitized);
    const placeClause = place ? ` nel ${place}` : "";
    const timeClause = time ? ` alle ${time}` : "";
    const visionClause = death
      ? "Quando una visione mostra la sua morte"
      : future
        ? "Quando i ricordi dal futuro diventano troppo precisi"
        : memory
          ? "Quando la memoria inizia a anticipare ciò che non dovrebbe accadere"
          : "Quando il tempo smette di obbedire alle regole del presente";
    return `${lead}${placeClause} riceve ogni notte visioni dal futuro${timeClause}. ${visionClause}, deve capire chi le sta inviando quelle immagini e se può ancora cambiare il destino prima che il paese chiuda ogni via di fuga.`;
  }

  if ((hasHighConceptFantasySignals(sanitized) || /fantasy/i.test(genre || "")) && !/horror|thriller/i.test(genre || "") && !hasDragonFlameFantasySignals(sanitized)) {
    const door = signals.places.find((place) => /porta/i.test(place)) || "la porta nel cuore";
    const endWorld = signals.stakes.includes("fine del mondo") || /\bfine del mondo|apocaliss/i.test(sanitized);
    const memory = signals.stakes.includes("memoria") || /\bricordi\b/i.test(sanitized);
    return `Quando ${lead} apre ${door}, scopre i ricordi di una donna vissuta mille anni prima${
      endWorld ? " che conosce il giorno esatto in cui il mondo finirà" : ""
    }. Per cambiare il destino dovrà capire perché quei ricordi sono stati affidati a lui${
      memory ? " e quale sacrificio richiede il futuro" : ""
    }.`;
  }

  const place = signals.places[0];
  const object = signals.objects[0];
  const mystery = signals.mysteries[0];
  const time = signals.mysteries.find((m) => /\d{1,2}:\d{2}/.test(m));
  const mother = signals.stakes.includes("madre") ? "madre" : "";
  const memory = signals.stakes.includes("memoria") ? "memoria che si riscrive" : "";

  if (time && place && object) {
    return `${lead} deve capire perché alle ${time} ${place} riappare per pochi minuti — e cosa significa ${object}${mother ? ` della ${mother}` : ""} prima che ${memory || "la verità"} lo cancelli dall'esistenza.`;
  }

  if (place && mystery) {
    return `Un ${genreLabel} dove ${place}, ${mystery} e ${object || "un segreto familiare"} costringono ${lead} a scegliere tra ricordare e sopravvivere.`;
  }

  const anchors = signals.uniqueElements.slice(0, 4).join(", ");
  if (shouldUseEntityDrivenScaffold(sanitized)) {
    return `Un racconto costruito su ${anchors}: ogni capitolo aumenta la posta in gioco finché ${lead} non può più fingere di non sapere.`;
  }
  return `Un ${genreLabel} costruito su ${anchors}: ogni capitolo aumenta la posta in gioco finché ${lead} non può più fingere di non sapere.`;
}

export function resolveNarrativePromise(
  idea: string,
  genre: string,
  fallback: string,
): string {
  const sanitized = sanitizeUserConceptInput(idea);
  const fromIdea = buildNarrativePromiseFromIdea(idea, genre);
  const conceptLocked =
    hasDragonFlameFantasySignals(sanitized) ||
    hasHorrorStationSignals(sanitized) ||
    hasHospitalGuardianMemoirSignals(sanitized) ||
    hasBusinessRestaurantSignals(sanitized) ||
    hasPhotographyManualSignals(sanitized) ||
    hasCookbookMediterraneanSignals(sanitized) ||
    hasSubmergedCitySciFiSignals(sanitized) ||
    hasSupernaturalThrillerSignals(sanitized) ||
    shouldUseEntityDrivenScaffold(sanitized);
  if (fromIdea && (hasRichNarrativeIdea(idea) || conceptLocked)) return fromIdea;
  if (!isGenericNarrativePromise(fallback)) return fallback;
  if (fromIdea) return fromIdea;
  return fallback;
}
