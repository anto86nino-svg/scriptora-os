import type { TortureBenchmarkResult } from "./torture-suite";

export interface SystemConfidence {
  system: string;
  confidence: number;
  status: "strong" | "stable" | "at-risk" | "weak";
  passed: number;
  total: number;
  issues: string[];
  recommendation?: string;
}

export interface IntelligenceWeaknessReport {
  generatedAt: string;
  overallReliabilityScore: number;
  totalBenchmarks: number;
  passedBenchmarks: number;
  failedBenchmarks: number;
  strongestSystems: SystemConfidence[];
  weakestSystems: SystemConfidence[];
  failureCases: Array<{ benchmark: string; assertion: string; severity: string }>;
  calibrationRecommendations: string[];
  summary: string;
}

const SYSTEM_MAP: Record<string, string> = {
  "fiction-dark-romance": "Character Psychology + Human Writing",
  "fiction-thriller": "Reader Emotion Simulator + Bestseller Intelligence",
  "fiction-fantasy-memory": "Long Book Memory Engine",
  "fiction-memoir": "Editorial Intelligence",
  "nonfiction-self-help": "Genre Brain + Editorial Intelligence",
  "nonfiction-business": "Genre Brain + Editorial Intelligence",
  "nonfiction-horticultural": "Book Intelligence Brain + Scene Purpose",
  "score-calibration": "Score Calibration Engine",
  "reader-emotion": "Reader Emotion Simulator",
  "author-identity": "Author Identity Lock",
  "chapter-doctor": "Chapter Doctor Pro + Delta Engine",
};

function statusFromConfidence(confidence: number): SystemConfidence["status"] {
  if (confidence >= 85) return "strong";
  if (confidence >= 70) return "stable";
  if (confidence >= 50) return "at-risk";
  return "weak";
}

export function buildIntelligenceWeaknessReport(results: TortureBenchmarkResult[]): IntelligenceWeaknessReport {
  const failureCases: IntelligenceWeaknessReport["failureCases"] = [];
  const systemStats = new Map<string, { passed: number; total: number; issues: string[] }>();

  for (const result of results) {
    const system = SYSTEM_MAP[result.id] || result.label;
    const stats = systemStats.get(system) || { passed: 0, total: 0, issues: [] };
    stats.total += 1;
    if (result.passed) stats.passed += 1;

    for (const assertion of result.assertions) {
      if (!assertion.passed) {
        failureCases.push({
          benchmark: result.label,
          assertion: assertion.message,
          severity: assertion.severity,
        });
        stats.issues.push(`${result.label}: ${assertion.message}`);
      }
    }
    systemStats.set(system, stats);
  }

  const systems: SystemConfidence[] = [...systemStats.entries()].map(([system, stats]) => {
    const confidence = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
    return {
      system,
      confidence,
      status: statusFromConfidence(confidence),
      passed: stats.passed,
      total: stats.total,
      issues: stats.issues.slice(0, 3),
      recommendation:
        confidence < 70
          ? `${system}: calibration or detection pass recommended`
          : undefined,
    };
  });

  systems.sort((a, b) => b.confidence - a.confidence);

  const passedBenchmarks = results.filter(r => r.passed).length;
  const totalBenchmarks = results.length;
  const assertionPassRate =
    results.reduce((sum, r) => sum + r.assertions.filter(a => a.passed).length, 0) /
    Math.max(1, results.reduce((sum, r) => sum + r.assertions.length, 0));

  const overallReliabilityScore = Math.round(((passedBenchmarks / totalBenchmarks) * 0.55 + assertionPassRate * 0.45) * 100);

  const calibrationRecommendations: string[] = [];
  if (failureCases.some(f => f.benchmark.includes("Calibration"))) {
    calibrationRecommendations.push("Apply score-calibration.ts across all UI score displays");
  }
  if (failureCases.some(f => /Chapter Doctor|delta/i.test(f.benchmark + f.assertion))) {
    calibrationRecommendations.push("Tighten Chapter Doctor delta caps for medium-quality chapters");
  }
  if (failureCases.some(f => /horticultural|self-help/i.test(f.assertion))) {
    calibrationRecommendations.push("Strengthen nonfiction brain drift guards in generation prompts");
  }
  if (failureCases.some(f => /Reader Emotion|boredom/i.test(f.assertion))) {
    calibrationRecommendations.push("Recalibrate reader boredom sensitivity for thriller flat text");
  }
  if (!calibrationRecommendations.length) {
    calibrationRecommendations.push("Monitor live author sessions; offline torture suite currently green");
  }

  const summary =
    overallReliabilityScore >= 85
      ? "Scriptora intelligence passes brutal offline validation with high reliability."
      : overallReliabilityScore >= 70
        ? "Scriptora shows strong architecture but has calibration gaps to fix before elite trust."
        : "Scriptora fails critical torture benchmarks — do NOT ship new intelligence until stabilized.";

  return {
    generatedAt: new Date().toISOString(),
    overallReliabilityScore,
    totalBenchmarks,
    passedBenchmarks,
    failedBenchmarks: totalBenchmarks - passedBenchmarks,
    strongestSystems: systems.slice(0, 4),
    weakestSystems: [...systems].sort((a, b) => a.confidence - b.confidence).slice(0, 4),
    failureCases,
    calibrationRecommendations,
    summary,
  };
}

export function formatWeaknessReportMarkdown(report: IntelligenceWeaknessReport): string {
  const lines = [
    `# Scriptora Intelligence Weakness Report`,
    ``,
    `Generated: ${report.generatedAt}`,
    ``,
    `## Overall Reliability: **${report.overallReliabilityScore}%**`,
    ``,
    report.summary,
    ``,
    `Benchmarks: ${report.passedBenchmarks}/${report.totalBenchmarks} passed`,
    ``,
    `## Strongest Systems`,
    ...report.strongestSystems.map(s => `- **${s.system}**: ${s.confidence}% (${s.status})`),
    ``,
    `## Weakest Systems`,
    ...report.weakestSystems.map(s => `- **${s.system}**: ${s.confidence}% — ${s.recommendation || s.issues[0] || "review"}`),
    ``,
  ];

  if (report.failureCases.length) {
    lines.push(`## Failure Cases`, ``);
    for (const f of report.failureCases) {
      lines.push(`- [${f.severity}] **${f.benchmark}**: ${f.assertion}`);
    }
    lines.push(``);
  }

  lines.push(`## Calibration Recommendations`, ``);
  for (const rec of report.calibrationRecommendations) {
    lines.push(`- ${rec}`);
  }

  return lines.join("\n");
}
