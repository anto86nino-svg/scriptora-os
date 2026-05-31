import type {
  ChapterProblemCounts,
  ChapterValidationMetrics,
  ComparativeValidationReport,
  GenreValidationAggregate,
  ValidationGenre,
  ValidationSuiteReport,
} from "./types";

function sumProblems(chapters: ChapterValidationMetrics[]): ChapterProblemCounts {
  return chapters.reduce(
    (acc, ch) => ({
      missingPayoffs: acc.missingPayoffs + ch.problems.missingPayoffs,
      cliches: acc.cliches + ch.problems.cliches,
      explainedEmotions: acc.explainedEmotions + ch.problems.explainedEmotions,
      characterIncoherences: acc.characterIncoherences + ch.problems.characterIncoherences,
      forgottenPromises: acc.forgottenPromises + ch.problems.forgottenPromises,
      artificialDialogue: acc.artificialDialogue + ch.problems.artificialDialogue,
    }),
    {
      missingPayoffs: 0,
      cliches: 0,
      explainedEmotions: 0,
      characterIncoherences: 0,
      forgottenPromises: 0,
      artificialDialogue: 0,
    },
  );
}

function aggregateGenre(genre: ValidationGenre, chapters: ChapterValidationMetrics[]): GenreValidationAggregate {
  const rows = chapters.filter(c => c.genre === genre);
  const n = rows.length || 1;
  const problems = sumProblems(rows);
  return {
    genre,
    chapterCount: rows.length,
    avgSupremeComposite: Math.round(rows.reduce((s, r) => s + r.supremeComposite, 0) / n),
    avgChapterDoctorScore: Math.round(rows.reduce((s, r) => s + r.chapterDoctorScore, 0) / n),
    totalCriticalIssues: rows.reduce((s, r) => s + r.criticalIssues, 0),
    totalOptionalIssues: rows.reduce((s, r) => s + r.optionalIssues, 0),
    avgReaderCuriosity: Math.round(rows.reduce((s, r) => s + r.readerCuriosity, 0) / n),
    avgReaderRetention: Math.round(rows.reduce((s, r) => s + r.readerRetention, 0) / n),
    avgCharacterConsistency: Math.round(rows.reduce((s, r) => s + r.characterConsistency, 0) / n),
    avgNarrativeMemoryHealth: Math.round(rows.reduce((s, r) => s + r.narrativeMemoryHealth, 0) / n),
    canonPassRate: Math.round((rows.filter(r => r.canonProtectionPass).length / n) * 100),
    avgClicheDensity: Math.round(rows.reduce((s, r) => s + r.clicheDensity, 0) / n),
    preDeliveryPassRate: Math.round((rows.filter(r => r.passesPreDelivery).length / n) * 100),
    avgGreatnessComposite: Math.round(rows.reduce((s, r) => s + r.greatnessComposite, 0) / n),
    avgGreatnessMemorability: Math.round(rows.reduce((s, r) => s + r.greatnessMemorability, 0) / n),
    avgGreatnessBingeability: Math.round(rows.reduce((s, r) => s + r.greatnessBingeability, 0) / n),
    avgGreatnessHookIntensity: Math.round(rows.reduce((s, r) => s + r.greatnessHookIntensity, 0) / n),
    avgNarrativeMagicComposite: Math.round(rows.reduce((s, r) => s + r.narrativeMagicComposite, 0) / n),
    avgNarrativeMagicWonder: Math.round(rows.reduce((s, r) => s + r.narrativeMagicWonder, 0) / n),
    avgNarrativeMagicQuotePotential: Math.round(rows.reduce((s, r) => s + r.narrativeMagicQuotePotential, 0) / n),
    problems,
  };
}

function aggregateTotals(chapters: ChapterValidationMetrics[]): GenreValidationAggregate {
  const genres: ValidationGenre[] = ["romance", "thriller", "fantasy", "self-help"];
  const perGenre = genres.map(g => aggregateGenre(g, chapters));
  const n = chapters.length || 1;
  const problems = sumProblems(chapters);
  return {
    genre: "romance",
    chapterCount: chapters.length,
    avgSupremeComposite: Math.round(chapters.reduce((s, r) => s + r.supremeComposite, 0) / n),
    avgChapterDoctorScore: Math.round(chapters.reduce((s, r) => s + r.chapterDoctorScore, 0) / n),
    totalCriticalIssues: perGenre.reduce((s, g) => s + g.totalCriticalIssues, 0),
    totalOptionalIssues: perGenre.reduce((s, g) => s + g.totalOptionalIssues, 0),
    avgReaderCuriosity: Math.round(chapters.reduce((s, r) => s + r.readerCuriosity, 0) / n),
    avgReaderRetention: Math.round(chapters.reduce((s, r) => s + r.readerRetention, 0) / n),
    avgCharacterConsistency: Math.round(chapters.reduce((s, r) => s + r.characterConsistency, 0) / n),
    avgNarrativeMemoryHealth: Math.round(chapters.reduce((s, r) => s + r.narrativeMemoryHealth, 0) / n),
    canonPassRate: Math.round((chapters.filter(r => r.canonProtectionPass).length / n) * 100),
    avgClicheDensity: Math.round(chapters.reduce((s, r) => s + r.clicheDensity, 0) / n),
    preDeliveryPassRate: Math.round((chapters.filter(r => r.passesPreDelivery).length / n) * 100),
    avgGreatnessComposite: Math.round(chapters.reduce((s, r) => s + r.greatnessComposite, 0) / n),
    avgGreatnessMemorability: Math.round(chapters.reduce((s, r) => s + r.greatnessMemorability, 0) / n),
    avgGreatnessBingeability: Math.round(chapters.reduce((s, r) => s + r.greatnessBingeability, 0) / n),
    avgGreatnessHookIntensity: Math.round(chapters.reduce((s, r) => s + r.greatnessHookIntensity, 0) / n),
    avgNarrativeMagicComposite: Math.round(chapters.reduce((s, r) => s + r.narrativeMagicComposite, 0) / n),
    avgNarrativeMagicWonder: Math.round(chapters.reduce((s, r) => s + r.narrativeMagicWonder, 0) / n),
    avgNarrativeMagicQuotePotential: Math.round(chapters.reduce((s, r) => s + r.narrativeMagicQuotePotential, 0) / n),
    problems,
  };
}

export function buildValidationSuiteReport(
  label: ValidationSuiteReport["label"],
  chapters: ChapterValidationMetrics[],
): ValidationSuiteReport {
  const genres: ValidationGenre[] = ["romance", "thriller", "fantasy", "self-help"];
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    label,
    genres: genres.map(g => aggregateGenre(g, chapters)),
    totals: aggregateTotals(chapters),
    chapters,
  };
}

function pctImprovement(before: number, after: number, lowerIsBetter = false): number {
  if (before === 0) return after === 0 ? 0 : lowerIsBetter ? -100 : 100;
  const delta = lowerIsBetter ? before - after : after - before;
  return Math.round((delta / before) * 100);
}

export function buildComparativeReport(
  baseline: ValidationSuiteReport,
  current: ValidationSuiteReport,
): ComparativeValidationReport {
  const b = baseline.totals;
  const c = current.totals;

  const improvements = {
    criticalIssuesDelta: b.totalCriticalIssues - c.totalCriticalIssues,
    criticalIssuesPct: pctImprovement(b.totalCriticalIssues, c.totalCriticalIssues, true),
    missingPayoffsDelta: b.problems.missingPayoffs - c.problems.missingPayoffs,
    clichesDelta: b.problems.cliches - c.problems.cliches,
    explainedEmotionsDelta: b.problems.explainedEmotions - c.problems.explainedEmotions,
    characterIncoherencesDelta: b.problems.characterIncoherences - c.problems.characterIncoherences,
    forgottenPromisesDelta: b.problems.forgottenPromises - c.problems.forgottenPromises,
    artificialDialogueDelta: b.problems.artificialDialogue - c.problems.artificialDialogue,
    supremeCompositeDelta: c.avgSupremeComposite - b.avgSupremeComposite,
    chapterDoctorScoreDelta: c.avgChapterDoctorScore - b.avgChapterDoctorScore,
    narrativeMemoryHealthDelta: c.avgNarrativeMemoryHealth - b.avgNarrativeMemoryHealth,
    preDeliveryPassRateDelta: c.preDeliveryPassRate - b.preDeliveryPassRate,
    greatnessCompositeDelta: c.avgGreatnessComposite - b.avgGreatnessComposite,
    avgGreatnessComposite: c.avgGreatnessComposite,
    narrativeMagicCompositeDelta: c.avgNarrativeMagicComposite - b.avgNarrativeMagicComposite,
    avgNarrativeMagicComposite: c.avgNarrativeMagicComposite,
  };

  const markdown = renderMarkdown(baseline, current, improvements);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    baseline,
    current,
    improvements,
    markdown,
  };
}

function renderMarkdown(
  baseline: ValidationSuiteReport,
  current: ValidationSuiteReport,
  improvements: ComparativeValidationReport["improvements"],
): string {
  const lines: string[] = [
    "# Scriptora Validation Suite — Report Comparativo",
    "",
    `Generato: ${new Date().toISOString()}`,
    "",
    "## Corpus",
    "- 10 capitoli Romance",
    "- 10 capitoli Thriller",
    "- 10 capitoli Fantasy",
    "- 10 capitoli Self Help",
    "- **40 capitoli totali**",
    "",
    "## Confronto pipeline",
    "| Pipeline | Descrizione |",
    "|---|---|",
    "| **Baseline (pre A+B+C+D)** | Humanize only — nessun pre-delivery gate |",
    "| **Corrente (A+B+C+D+E+F)** | Humanize + Orchestrator + Greatness + Masterpiece Pass |",
    "",
    "## Metriche aggregate (40 capitoli)",
    "",
    "| Metrica | Baseline | Corrente | Δ |",
    "|---|---:|---:|---:|",
    `| Supreme Editorial Score (avg) | ${baseline.totals.avgSupremeComposite} | ${current.totals.avgSupremeComposite} | **+${improvements.supremeCompositeDelta}** |`,
    `| Greatness Score (avg) | ${baseline.totals.avgGreatnessComposite} | ${current.totals.avgGreatnessComposite} | **+${improvements.greatnessCompositeDelta}** |`,
    `| Narrative Magic Score (avg) | ${baseline.totals.avgNarrativeMagicComposite} | ${current.totals.avgNarrativeMagicComposite} | **+${improvements.narrativeMagicCompositeDelta}** |`,
    `| Wonder (avg) | ${baseline.totals.avgNarrativeMagicWonder} | ${current.totals.avgNarrativeMagicWonder} | +${current.totals.avgNarrativeMagicWonder - baseline.totals.avgNarrativeMagicWonder} |`,
    `| Quote Potential (avg) | ${baseline.totals.avgNarrativeMagicQuotePotential} | ${current.totals.avgNarrativeMagicQuotePotential} | +${current.totals.avgNarrativeMagicQuotePotential - baseline.totals.avgNarrativeMagicQuotePotential} |`,
    `| Memorability (avg) | ${baseline.totals.avgGreatnessMemorability} | ${current.totals.avgGreatnessMemorability} | +${current.totals.avgGreatnessMemorability - baseline.totals.avgGreatnessMemorability} |`,
    `| Bingeability (avg) | ${baseline.totals.avgGreatnessBingeability} | ${current.totals.avgGreatnessBingeability} | +${current.totals.avgGreatnessBingeability - baseline.totals.avgGreatnessBingeability} |`,
    `| Hook Intensity (avg) | ${baseline.totals.avgGreatnessHookIntensity} | ${current.totals.avgGreatnessHookIntensity} | +${current.totals.avgGreatnessHookIntensity - baseline.totals.avgGreatnessHookIntensity} |`,
    `| Chapter Doctor Score (avg) | ${baseline.totals.avgChapterDoctorScore} | ${current.totals.avgChapterDoctorScore} | **+${improvements.chapterDoctorScoreDelta}** |`,
    `| Critical issues (totale) | ${baseline.totals.totalCriticalIssues} | ${current.totals.totalCriticalIssues} | **${improvements.criticalIssuesDelta >= 0 ? "-" : "+"}${Math.abs(improvements.criticalIssuesDelta)}** (${improvements.criticalIssuesPct}% miglioramento) |`,
    `| Pre-delivery pass rate | ${baseline.totals.preDeliveryPassRate}% | ${current.totals.preDeliveryPassRate}% | **+${improvements.preDeliveryPassRateDelta}pp** |`,
    `| Reader Curiosity (avg) | ${baseline.totals.avgReaderCuriosity} | ${current.totals.avgReaderCuriosity} | +${current.totals.avgReaderCuriosity - baseline.totals.avgReaderCuriosity} |`,
    `| Reader Retention (avg) | ${baseline.totals.avgReaderRetention} | ${current.totals.avgReaderRetention} | +${current.totals.avgReaderRetention - baseline.totals.avgReaderRetention} |`,
    `| Character Consistency (avg) | ${baseline.totals.avgCharacterConsistency} | ${current.totals.avgCharacterConsistency} | +${current.totals.avgCharacterConsistency - baseline.totals.avgCharacterConsistency} |`,
    `| Narrative Memory Health (avg) | ${baseline.totals.avgNarrativeMemoryHealth} | ${current.totals.avgNarrativeMemoryHealth} | **+${improvements.narrativeMemoryHealthDelta}** |`,
    `| Cliché Density score (avg) | ${baseline.totals.avgClicheDensity} | ${current.totals.avgClicheDensity} | +${current.totals.avgClicheDensity - baseline.totals.avgClicheDensity} |`,
    `| Canon Protection pass rate | ${baseline.totals.canonPassRate}% | ${current.totals.canonPassRate}% | +${current.totals.canonPassRate - baseline.totals.canonPassRate}pp |`,
    "",
    "## Problemi editoriali (conteggio totale — più basso è meglio)",
    "",
    "| Problema | Baseline | Corrente | Riduzione |",
    "|---|---:|---:|---:|",
    `| Payoff mancanti | ${baseline.totals.problems.missingPayoffs} | ${current.totals.problems.missingPayoffs} | ${improvements.missingPayoffsDelta} |`,
    `| Cliché rilevati | ${baseline.totals.problems.cliches} | ${current.totals.problems.cliches} | ${improvements.clichesDelta} |`,
    `| Emozioni spiegate | ${baseline.totals.problems.explainedEmotions} | ${current.totals.problems.explainedEmotions} | ${improvements.explainedEmotionsDelta} |`,
    `| Incoerenze personaggi | ${baseline.totals.problems.characterIncoherences} | ${current.totals.problems.characterIncoherences} | ${improvements.characterIncoherencesDelta} |`,
    `| Promesse dimenticate (open) | ${baseline.totals.problems.forgottenPromises} | ${current.totals.problems.forgottenPromises} | ${improvements.forgottenPromisesDelta} |`,
    `| Dialoghi artificiali | ${baseline.totals.problems.artificialDialogue} | ${current.totals.problems.artificialDialogue} | ${improvements.artificialDialogueDelta} |`,
    "",
    "## Per genere",
    "",
  ];

  for (const genre of ["romance", "thriller", "fantasy", "self-help"] as ValidationGenre[]) {
    const bg = baseline.genres.find(g => g.genre === genre)!;
    const cg = current.genres.find(g => g.genre === genre)!;
    lines.push(`### ${genre}`);
    lines.push(
      `- Supreme Score: ${bg.avgSupremeComposite} → **${cg.avgSupremeComposite}** (+${cg.avgSupremeComposite - bg.avgSupremeComposite})`,
    );
    lines.push(`- Greatness Score: ${bg.avgGreatnessComposite} → **${cg.avgGreatnessComposite}** (+${cg.avgGreatnessComposite - bg.avgGreatnessComposite})`);
    lines.push(`- Narrative Magic: ${bg.avgNarrativeMagicComposite} → **${cg.avgNarrativeMagicComposite}** (+${cg.avgNarrativeMagicComposite - bg.avgNarrativeMagicComposite})`);
    lines.push(
      `- Critical issues: ${bg.totalCriticalIssues} → **${cg.totalCriticalIssues}** (${bg.totalCriticalIssues - cg.totalCriticalIssues >= 0 ? "-" : "+"}${Math.abs(bg.totalCriticalIssues - cg.totalCriticalIssues)})`,
    );
    lines.push(`- Pre-delivery pass: ${bg.preDeliveryPassRate}% → **${cg.preDeliveryPassRate}%**`);
    lines.push(`- Cliché hits: ${bg.problems.cliches} → **${cg.problems.cliches}**`);
    lines.push("");
  }

  lines.push("## Conclusione");
  lines.push("");
  if (improvements.supremeCompositeDelta > 0 && improvements.criticalIssuesDelta >= 0) {
    lines.push(
      `Scriptora con orchestrator A+B+C+D+E+F produce testo misurabilmente superiore: **+${improvements.supremeCompositeDelta}** Supreme, **Greatness ${current.totals.avgGreatnessComposite}**, **Magic ${current.totals.avgNarrativeMagicComposite}**, **${improvements.criticalIssuesPct}%** meno issue critici.`,
    );
  } else {
    lines.push("Vedi tabella sopra per il dettaglio numerico per genere e metrica.");
  }

  return lines.join("\n");
}
