import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import type {
  BestsellerAction,
  BestsellerRadarResult,
  BestsellerRadarScore,
  BestsellerRadarSnapshot,
  RadarConfidence,
  RadarDataMode,
  RadarMapRow,
} from "./types";
import {
  blueprintText,
  buildRadarInput,
  effectiveGenre,
  effectiveTitle,
  firstChapterText,
  packagingPromise,
  type RadarEngineInput,
} from "./radar-adapters";
import { computeRadarDelta, loadLatestRadarSnapshot, saveRadarSnapshot } from "./radar-storage";
import { isItalianLanguage, mapRowLabels } from "./radar-copy";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function hasEmotionalWords(text: string): boolean {
  return /amore|tradimento|segreto|pericolo|paura|desiderio|vendetta|amore|secret|danger|desire|betrayal|fear|revenge|burnout|ansia|paura|transform/i.test(text);
}

function abstractWordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const abstract = words.filter((w) =>
    /^(mindset|journey|manifest|empower|trasform|viaggio|motivaz|consapevolezz|equilibrio|armonia|successo|potenziale)$/i.test(w),
  ).length;
  return abstract / words.length;
}

function scoreTitlePower(title: string, subtitle: string, tdWinnerScore?: number): number {
  if (!title) return 0;
  let score = 42;
  const titleWords = wordCount(title);
  if (titleWords >= 2 && titleWords <= 8) score += 14;
  if (titleWords > 10) score -= 12;
  if (hasEmotionalWords(title)) score += 12;
  if (subtitle && wordCount(subtitle) >= 4) score += 10;
  if (abstractWordRatio(title + " " + subtitle) > 0.25) score -= 14;
  if (typeof tdWinnerScore === "number") score = Math.round(score * 0.45 + tdWinnerScore * 0.55);
  return clamp(score);
}

function levelToRisk(competition?: string): number {
  const c = String(competition || "").toLowerCase();
  if (c === "high" || c === "alto") return 78;
  if (c === "medium" || c === "medio") return 52;
  if (c === "low" || c === "basso") return 28;
  return 45;
}

function scoreGenreClarity(genre: string, category: string, subcategory: string): number {
  let score = 30;
  if (genre) score += 28;
  if (category && category !== genre) score += 16;
  if (subcategory?.trim()) score += 18;
  if (!genre && category) score -= 10;
  return clamp(score);
}

function scoreReaderPromise(promise: string, targetReader: string): number {
  if (!promise) return 20;
  let score = 38 + Math.min(22, wordCount(promise));
  if (hasEmotionalWords(promise)) score += 12;
  if (abstractWordRatio(promise) > 0.3) score -= 18;
  if (targetReader?.trim()) score += 14;
  return clamp(score);
}

function scorePublishReadiness(input: RadarEngineInput): number {
  const p = input.project;
  if (!p) return 0;
  let score = 10;
  if (p.config.title?.trim()) score += 12;
  if (p.config.genre) score += 10;
  if (p.blueprint) score += 22;
  if (p.chapters?.some((c) => c.content?.trim())) score += 18;
  if (input.hasCover) score += 16;
  if (input.kdp?.packaging) score += 12;
  if (p.config.configStatus === "approved" || p.blueprintApproved) score += 10;
  return clamp(score);
}

function detectMode(input: RadarEngineInput): RadarDataMode {
  if (!input.project) {
    if (input.kdp?.analysis) return "analysis-based";
    return "unavailable";
  }
  if (input.kdp?.analysis || input.kdp?.packaging) return "analysis-based";
  if (input.titleDomination?.result) return "project-based";
  return "estimated";
}

function detectConfidence(input: RadarEngineInput, missing: string[]): RadarConfidence {
  let points = 0;
  if (input.project) points += 2;
  if (input.project?.blueprint) points += 2;
  if (firstChapterText(input.project)) points += 2;
  if (input.kdp?.analysis) points += 2;
  if (input.titleDomination?.result) points += 1;
  if (input.hasCover) points += 1;
  if (missing.length >= 4) points -= 2;
  if (points >= 7) return "high";
  if (points >= 4) return "medium";
  return "low";
}

function buildVerdict(score: BestsellerRadarScore, input: RadarEngineInput): string {
  const it = input.italian;
  const weak: string[] = [];
  if (score.titlePower < 58) weak.push(it ? "titolo" : "title");
  if (score.readerPromise < 58) weak.push(it ? "promessa" : "promise");
  if (score.hookStrength < 58) weak.push(it ? "hook" : "hook");
  if (score.kdpPositioning < 58) weak.push(it ? "posizionamento KDP" : "KDP positioning");
  if (score.genreClarity < 58) weak.push(it ? "genere/categoria" : "genre/category");
  if (score.bingeability < 55) weak.push(it ? "bingeability" : "bingeability");

  if (score.overall >= 78 && weak.length === 0) {
    return it
      ? "Concept vendibile con segnali commerciali coerenti. Prima della pubblicazione, rifinisci packaging e sample."
      : "Sellable concept with coherent commercial signals. Refine packaging and sample before publishing.";
  }
  if (score.overall >= 65 && weak.length <= 1) {
    return it
      ? `Potenziale alto, ma ${weak[0] || "un dettaglio"} ancora frena la conversione.`
      : `High potential, but ${weak[0] || "one detail"} still limits conversion.`;
  }
  if (score.booktokPotential >= 72 && score.titlePower < 62) {
    return it
      ? "Buona energia BookTok, ma il titolo non comunica abbastanza conflitto."
      : "Strong BookTok energy, but the title doesn't communicate enough conflict.";
  }
  if (score.marketFit >= 68 && score.competitionRisk >= 70) {
    return it
      ? "Mercato chiaro, ma il libro rischia di sembrare simile a troppi competitor."
      : "Clear market, but the book risks blending with too many competitors.";
  }
  if (weak.length >= 2) {
    return it
      ? `Concept vendibile. Prima della pubblicazione serve rafforzare ${weak.slice(0, 2).join(" e ")}.`
      : `Sellable concept. Strengthen ${weak.slice(0, 2).join(" and ")} before publishing.`;
  }
  return it
    ? "Potenziale commerciale in crescita: sistema i punti deboli indicati sotto."
    : "Growing commercial potential: address the weak points below.";
}

function buildMismatchNote(input: RadarEngineInput, bingeability: number): string | null {
  const p = input.project;
  const genre = effectiveGenre(p, input.kdp);
  const promise = packagingPromise(p, input.kdp).toLowerCase();
  const fiction = /romance|thriller|dark|horror|fantasy|fiction/i.test(genre);
  const promisesTension = /tensione|pericolo|dark|mafia|enemies|forbidden|danger|obsess/i.test(promise);
  if (fiction && promisesTension && bingeability < 55 && firstChapterText(p)) {
    return input.italian
      ? "Il packaging promette alta tensione, ma i primi capitoli hanno conflitto troppo morbido. Rischio: drop reader dopo il sample."
      : "Packaging promises high tension, but early chapters have soft conflict. Risk: reader drop after sample.";
  }
  return null;
}

function buildActions(score: BestsellerRadarScore, input: RadarEngineInput, missing: string[]): BestsellerAction[] {
  const it = input.italian;
  const actions: BestsellerAction[] = [];

  if (score.titlePower < 62) {
    actions.push({
      priority: "high",
      title: it ? "Rafforza il titolo" : "Strengthen the title",
      reason: it
        ? "Il concept è interessante, ma il titolo non comunica abbastanza promessa commerciale."
        : "The concept is interesting, but the title doesn't communicate enough commercial promise.",
      targetModule: "title-domination",
      ctaLabel: it ? "Apri Title Domination" : "Open Title Domination",
    });
  }
  if (!input.kdp?.analysis || score.kdpPositioning < 60) {
    actions.push({
      priority: score.kdpPositioning < 55 ? "high" : "medium",
      title: it ? "Completa KDP Launch" : "Complete KDP Launch",
      reason: it
        ? "Senza analisi KDP il radar stima categoria, keyword e rischio concorrenza."
        : "Without KDP analysis the radar estimates category, keywords and competition risk.",
      targetModule: "kdp-launch",
      ctaLabel: it ? "Apri KDP Launch" : "Open KDP Launch",
    });
  }
  if (score.hookStrength < 58 && input.project?.chapters?.length) {
    actions.push({
      priority: "high",
      title: it ? "Migliora il primo capitolo" : "Improve chapter 1",
      reason: it
        ? "Hook commerciale debole nell'apertura narrativa."
        : "Weak commercial hook in the narrative opening.",
      targetModule: "editor",
      ctaLabel: it ? "Analizza capitolo 1" : "Analyze chapter 1",
    });
  }
  if (!input.project?.blueprint) {
    actions.push({
      priority: "medium",
      title: it ? "Genera blueprint" : "Generate blueprint",
      reason: it
        ? "Senza blueprint il radar non può validare arco narrativo e payoff."
        : "Without blueprint the radar cannot validate narrative arc and payoff.",
      targetModule: "blueprint",
      ctaLabel: it ? "Vai al Blueprint" : "Go to Blueprint",
    });
  }
  if (!input.hasCover && input.project) {
    actions.push({
      priority: "medium",
      title: it ? "Controlla cover" : "Check cover",
      reason: it
        ? "Il genere è leggibile, ma manca una cover che rafforzi il posizionamento."
        : "Genre is readable, but a cover reinforcing positioning is missing.",
      targetModule: "cover-studio",
      ctaLabel: it ? "Apri Cover Studio" : "Open Cover Studio",
    });
  }
  if (missing.includes("title") && actions.every((a) => a.targetModule !== "title-domination")) {
    actions.push({
      priority: "high",
      title: it ? "Definisci titolo" : "Define title",
      reason: it ? "Titolo mancante — impossibile valutare potenza commerciale." : "Missing title — cannot score commercial power.",
      targetModule: "title-domination",
      ctaLabel: it ? "Migliora titolo" : "Improve title",
    });
  }

  return actions.slice(0, 5);
}

function buildMap(score: BestsellerRadarScore, italian: boolean): RadarMapRow[] {
  const labels = mapRowLabels(italian);
  return [
    { key: "hookStrength", label: labels.hookStrength, score: score.hookStrength },
    { key: "titlePower", label: labels.titlePower, score: score.titlePower },
    { key: "marketFit", label: labels.marketFit, score: score.marketFit },
    { key: "booktokPotential", label: labels.booktokPotential, score: score.booktokPotential },
    { key: "kdpPositioning", label: labels.kdpPositioning, score: score.kdpPositioning },
    { key: "publishReadiness", label: labels.publishReadiness, score: score.publishReadiness },
  ];
}

export function runBestsellerRadarEngine(rawInput?: RadarEngineInput): BestsellerRadarResult {
  const input = rawInput ?? buildRadarInput(null);
  const p = input.project;
  const italian = input.italian;

  const missing: string[] = [];
  const scanLog: string[] = [];
  scanLog.push(italian ? "Lettura configurazione…" : "Reading configuration…");

  if (!p) missing.push(italian ? "progetto" : "project");
  else {
    if (!p.config.title?.trim()) missing.push("title");
    if (!p.config.genre) missing.push(italian ? "genere" : "genre");
  }

  if (input.kdp?.analysis) scanLog.push(italian ? "Analisi KDP collegata" : "KDP analysis linked");
  else {
    missing.push(italian ? "analisi KDP" : "KDP analysis");
    scanLog.push(italian ? "Analisi KDP non trovata — stima editoriale" : "KDP analysis missing — editorial estimate");
  }

  if (p?.blueprint) scanLog.push(italian ? "Blueprint letto" : "Blueprint read");
  else scanLog.push(italian ? "Blueprint assente" : "Blueprint missing");

  const chapterText = firstChapterText(p);
  if (chapterText) scanLog.push(italian ? "Manoscritto (cap. 1) analizzato" : "Manuscript (ch. 1) analyzed");
  else scanLog.push(italian ? "Manoscritto non disponibile" : "Manuscript unavailable");

  if (input.hasCover) scanLog.push(italian ? "Cover trovata" : "Cover found");
  if (input.titleDomination?.result) scanLog.push(italian ? "Title Domination collegato" : "Title Domination linked");

  const title = effectiveTitle(p, input.kdp, input.titleDomination);
  const subtitle = p?.config.subtitle || input.kdp?.chosenSubtitle || input.titleDomination?.result?.winner?.subtitle || "";
  const genre = effectiveGenre(p, input.kdp);
  const promise = packagingPromise(p, input.kdp);
  const targetReader = p?.config.targetReader || input.titleDomination?.input?.targetReader || input.kdp?.analysis?.subNiche || "";

  const tdScore = input.titleDomination?.result?.winner?.finalScore;

  let hookStrength = 40;
  let bingeability = 42;
  let emotionalPull = 44;
  let booktokPotential = 38;

  const bpText = blueprintText(p);
  const evalContent = [chapterText, bpText, title, subtitle, promise, p?.config.idea].filter(Boolean).join("\n\n");
  if (evalContent.split(/\s+/).filter(Boolean).length >= 40) {
    const best = evaluateBestsellerChapter({
      content: evalContent,
      chapterIndex: 0,
      totalChapters: p?.config.numberOfChapters,
      genre,
      bookIntelligence: p?.genreLock ? { layers: { domain: /romance|thriller|fiction|fantasy|horror/i.test(genre) ? "fiction" : "nonfiction" } } : undefined,
    });
    hookStrength = best.scores.hookStrength;
    bingeability = best.scores.bingeability;
    emotionalPull = best.scores.emotionalMomentum;
    booktokPotential = best.scores.bookTokIntensity || bingeability;
  }

  let marketFit = 48;
  let competitionRisk = 50;
  if (input.kdp?.analysis) {
    marketFit = clamp((input.kdp.analysis.profitabilityScore || 5) * 10);
    competitionRisk = levelToRisk(input.kdp.analysis.competitionLevel);
    if (input.kdp.analysis.demandLevel === "high") marketFit += 8;
  } else if (evalContent.length > 80) {
    try {
      const premium = computeMarketPremiumScores({ content: evalContent, genre, language: p?.config.language });
      marketFit = premium.composite;
      competitionRisk = premium.readerRetentionRisk === "high" ? 72 : premium.readerRetentionRisk === "medium" ? 52 : 34;
      booktokPotential = premium.bookTokPotential ?? booktokPotential;
    } catch {
      /* fallback scores */
    }
  }

  let kdpPositioning = 40;
  if (input.kdp?.packaging) {
    kdpPositioning = clamp(
      50
      + (input.kdp.packaging.categories?.length || 0) * 8
      + (input.kdp.packaging.backendKeywords?.length || 0) * 4
      + (input.kdp.packaging.bulletPoints?.length >= 3 ? 10 : 0),
    );
  } else if (p?.config.category) {
    kdpPositioning = clamp(44 + (p.config.subcategory ? 14 : 0));
  }

  const titlePower = scoreTitlePower(title, subtitle, tdScore);
  const genreClarity = scoreGenreClarity(genre, p?.config.category || "", p?.config.subcategory || "");
  const readerPromise = scoreReaderPromise(promise, targetReader);
  const publishReadiness = scorePublishReadiness(input);

  const overall = clamp(
    hookStrength * 0.14
    + titlePower * 0.14
    + marketFit * 0.12
    + genreClarity * 0.08
    + readerPromise * 0.12
    + bingeability * 0.12
    + emotionalPull * 0.08
    + kdpPositioning * 0.1
    + booktokPotential * 0.05
    + publishReadiness * 0.05,
  );

  const score: BestsellerRadarScore = {
    overall,
    hookStrength,
    titlePower,
    marketFit,
    genreClarity,
    readerPromise,
    bingeability,
    emotionalPull,
    kdpPositioning,
    booktokPotential,
    competitionRisk,
    publishReadiness,
  };

  const strengths: string[] = [];
  const risks: string[] = [];
  const growthLevers: string[] = [];

  if (hookStrength >= 68) strengths.push(italian ? "Hook immediato" : "Immediate hook");
  if (titlePower >= 65) strengths.push(italian ? "Titolo leggibile a scaffale" : "Shelf-readable title");
  if (genreClarity >= 65) strengths.push(italian ? "Genere leggibile" : "Clear genre");
  if (targetReader) strengths.push(italian ? "Target definito" : "Defined target");
  if (readerPromise >= 65) strengths.push(italian ? "Promessa forte" : "Strong promise");
  if (booktokPotential >= 70) strengths.push(italian ? "Buona compatibilità BookTok" : "Good BookTok fit");
  if (input.hasCover) strengths.push(italian ? "Cover pronta" : "Cover ready");
  if (input.kdp?.packaging) strengths.push(italian ? "Packaging KDP avviato" : "KDP packaging started");

  if (titlePower < 58) risks.push(italian ? "Titolo troppo generico" : "Title too generic");
  if (readerPromise < 55) risks.push(italian ? "Promessa debole" : "Weak promise");
  if (genreClarity < 55) risks.push(italian ? "Genere o categoria confusi" : "Confused genre/category");
  if (!targetReader) risks.push(italian ? "Target troppo largo o assente" : "Target too broad or missing");
  if (hookStrength < 55) risks.push(italian ? "Hook poco emotivo" : "Low-emotion hook");
  if (abstractWordRatio(title + " " + promise) > 0.28) risks.push(italian ? "Troppe parole astratte" : "Too many abstract words");
  if (competitionRisk >= 70) risks.push(italian ? "Alta similarità competitiva stimata" : "High estimated competitive similarity");
  if (!input.hasCover && p) risks.push(italian ? "Cover non coerente o assente" : "Cover missing or misaligned");

  const mismatch = buildMismatchNote(input, bingeability);
  if (mismatch) risks.push(mismatch);

  if (titlePower < 68) growthLevers.push(italian ? "Rafforzare sottotitolo" : "Strengthen subtitle");
  if (kdpPositioning < 65) growthLevers.push(italian ? "Ottimizzare categoria e keyword KDP" : "Optimize KDP category and keywords");
  if (hookStrength < 65) growthLevers.push(italian ? "Aumentare tensione nel primo capitolo" : "Increase tension in chapter 1");
  if (readerPromise < 65) growthLevers.push(italian ? "Rendere il conflitto più visibile" : "Make conflict more visible");
  if (booktokPotential >= 65 && titlePower < 65) growthLevers.push(italian ? "Migliorare titolo per BookTok" : "Improve title for BookTok");
  if (bingeability < 60) growthLevers.push(italian ? "Aggiungere micro-payoff tra capitoli" : "Add micro-payoffs between chapters");

  const mode = detectMode(input);
  const confidence = detectConfidence(input, missing);
  const verdict = buildVerdict(score, input);
  const actions = buildActions(score, input, missing);

  const projectId = p?.id || "global";
  const previous = loadLatestRadarSnapshot(projectId);
  const snapshot: BestsellerRadarSnapshot = {
    id: `radar-${Date.now()}`,
    projectId,
    createdAt: new Date().toISOString(),
    score,
    confidence,
    mode,
    verdict,
    strengths,
    risks,
    growthLevers,
    actions,
    missingData: missing,
    scanLog,
  };

  if (p?.id) saveRadarSnapshot(snapshot);

  return {
    ...snapshot,
    map: buildMap(score, italian),
    delta: computeRadarDelta(overall, previous?.score.overall),
    previousOverall: previous?.score.overall ?? null,
  };
}

export function validateRadarScan(project: BookProject | null): string | null {
  if (!project) return "Progetto non caricato";
  if (!project.config.title?.trim() && !project.config.idea?.trim()) {
    return "Dati insufficienti: completa prima la configurazione libro";
  }
  if (!project.config.genre) return "Genere non definito";
  return null;
}
