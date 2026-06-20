import type { BookProject } from "@/types/book";
import {
  getBookStructureTruth,
  getMissingActiveSubchapterRefs,
} from "@/lib/book-structure-truth";
import { getProjectCoverDataUrl } from "@/lib/cover-session";

export type AdvancedAuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AdvancedAuditWarning = {
  id: string;
  severity: AdvancedAuditSeverity;
  title: string;
  evidence: string;
  action: string;
};

export type AdvancedAuditScore = {
  label: string;
  score: number;
  status: "premium" | "ready" | "warning" | "critical";
  evidence: string;
};

export type AdvancedRepairPlanItem = {
  id: string;
  priority: AdvancedAuditSeverity;
  intervention: string;
  impact: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  creditCost: string;
  evidence: string;
};

export type AdvancedAuditStepStatus = "PASS" | "WARNING" | "FAIL";

export type AdvancedAuditStep = {
  id:
    | "subchapter-coverage"
    | "character-consistency"
    | "narrative-promise-tracker"
    | "repetition-audit"
    | "blueprint-coverage";
  step: number;
  title: string;
  status: AdvancedAuditStepStatus;
  score?: number;
  evidence: string;
  details: string[];
};

export type SubchapterCoverageRow = {
  chapterIndex: number;
  chapterTitle: string;
  expected: string[];
  generated: string[];
  missing: string[];
  emptyGenerated: string[];
  coveragePercent: number;
};

export type CharacterConsistencyAudit = {
  expectedCharacters: string[];
  presentCharacters: string[];
  missingCharacters: string[];
  manuscriptOnlyCharacters: string[];
};

export type NarrativePromiseAudit = {
  secretsIntroduced: string[];
  openQuestions: string[];
  narrativeObjects: string[];
  unresolvedPromises: string[];
};

export type RepetitionAudit = {
  metaphors: string[];
  gestures: string[];
  emotionalPatterns: string[];
};

export type BlueprintCoverageAudit = {
  coveragePercent: number;
  matchedSignals: string[];
  missingSignals: string[];
  chapterCoverage: Array<{ chapterIndex: number; title: string; coveragePercent: number; missingSignals: string[] }>;
};

export type AdvancedManuscriptAudit = {
  steps: AdvancedAuditStep[];
  subchapterCoverage: SubchapterCoverageRow[];
  characterConsistency: CharacterConsistencyAudit;
  narrativePromiseTracker: NarrativePromiseAudit;
  repetitionAudit: RepetitionAudit;
  blueprintCoverage: BlueprintCoverageAudit;
};

export type AdvancedToolsAudit = {
  projectTitle: string;
  generatedAt: number;
  scores: {
    bookHealth: AdvancedAuditScore;
    canonIntegrity: AdvancedAuditScore;
    subchapterIntegrity: AdvancedAuditScore;
    duplicateSceneRisk: AdvancedAuditScore;
    bestsellerReadiness: AdvancedAuditScore;
    exportReadiness: AdvancedAuditScore;
  };
  weakChapters: Array<{ index: number; title: string; evidence: string }>;
  strongChapters: Array<{ index: number; title: string; evidence: string }>;
  warnings: {
    bookHealth: AdvancedAuditWarning[];
    canon: AdvancedAuditWarning[];
    subchapters: AdvancedAuditWarning[];
    duplicates: AdvancedAuditWarning[];
    bestseller: AdvancedAuditWarning[];
    export: AdvancedAuditWarning[];
  };
  manuscriptAudit: AdvancedManuscriptAudit;
  repairPlan: AdvancedRepairPlanItem[];
};

const WORD_RE = /[\p{L}\p{N}'’-]+/gu;

function countWords(text: string | undefined | null): number {
  return String(text || "").match(WORD_RE)?.length || 0;
}

function normalizeParagraph(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreStatus(score: number): AdvancedAuditScore["status"] {
  if (score >= 88) return "premium";
  if (score >= 74) return "ready";
  if (score >= 55) return "warning";
  return "critical";
}

function makeScore(label: string, score: number, evidence: string): AdvancedAuditScore {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    label,
    score: clamped,
    status: scoreStatus(clamped),
    evidence,
  };
}

function severityPenalty(severity: AdvancedAuditSeverity): number {
  if (severity === "CRITICAL") return 24;
  if (severity === "HIGH") return 16;
  if (severity === "MEDIUM") return 9;
  return 4;
}

function warning(
  id: string,
  severity: AdvancedAuditSeverity,
  title: string,
  evidence: string,
  action: string,
): AdvancedAuditWarning {
  return { id, severity, title, evidence, action };
}

function makeRepair(w: AdvancedAuditWarning, creditCost = "0 crediti finche' non confermi un'azione automatica"): AdvancedRepairPlanItem {
  return {
    id: `repair-${w.id}`,
    priority: w.severity,
    intervention: w.action,
    impact: w.severity === "CRITICAL" || w.severity === "HIGH" ? "Alto" : "Medio",
    risk: w.severity === "CRITICAL" ? "MEDIUM" : "LOW",
    creditCost,
    evidence: w.evidence,
  };
}

function chapterTitle(project: BookProject, index: number): string {
  return project.chapters?.[index]?.title || project.blueprint?.chapterOutlines?.[index]?.title || `Capitolo ${index + 1}`;
}

function getAllChapterText(project: BookProject): string {
  return (project.chapters || [])
    .map((chapter) => [chapter.content, ...(chapter.subchapters || []).map((sub) => sub.content)].join("\n\n"))
    .join("\n\n");
}

function detectDuplicateParagraphs(project: BookProject): AdvancedAuditWarning[] {
  const seen = new Map<string, { chapterIndex: number; paragraphIndex: number; text: string }>();
  const out: AdvancedAuditWarning[] = [];

  (project.chapters || []).forEach((chapter, chapterIndex) => {
    const paragraphs = String(chapter.content || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => countWords(p) >= 22);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const normalized = normalizeParagraph(paragraph).slice(0, 240);
      if (normalized.length < 120) return;
      const previous = seen.get(normalized);
      if (previous) {
        out.push(
          warning(
            `duplicate-${chapterIndex}-${paragraphIndex}`,
            "HIGH",
            "Paragrafo/scena ripetuta",
            `Cap. ${previous.chapterIndex + 1} ¶${previous.paragraphIndex + 1} e Cap. ${chapterIndex + 1} ¶${paragraphIndex + 1}: "${paragraph.slice(0, 140)}..."`,
            "Apri Manuscript Lab o Patch: taglia una delle occorrenze e preserva solo la scena che avanza davvero trama o tesi.",
          ),
        );
      } else {
        seen.set(normalized, { chapterIndex, paragraphIndex, text: paragraph });
      }
    });
  });

  return out.slice(0, 8);
}

function extractCanonNames(project: BookProject): string[] {
  const fromConfig = (project.config.characters || []).map((c) => [c.name, c.surname].filter(Boolean).join(" ").trim());
  const fromIntegrity = project.blueprint?.integrity?.characterMemoryEngine?.map((c) => c.canonicalName) || [];
  return Array.from(new Set([...fromConfig, ...fromIntegrity].map((name) => name.trim()).filter((name) => name.length >= 2)));
}

function detectCanonWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const manuscript = getAllChapterText(project);
  const canonNames = extractCanonNames(project);

  if (!canonNames.length) {
    out.push(
      warning(
        "canon-no-character-memory",
        "MEDIUM",
        "Canon personaggi non strutturato",
        "Nessun personaggio canonico trovato in config.characters o blueprint.integrity.characterMemoryEngine.",
        "Apri Character Studio e salva nomi, ruoli e regole di continuita' prima di rigenerare o patchare capitoli.",
      ),
    );
  } else {
    const missingNames = canonNames.filter((name) => !new RegExp(`\\b${escapeRegExp(name.split(/\s+/)[0])}\\b`, "i").test(manuscript));
    if (missingNames.length && (project.chapters || []).some((chapter) => countWords(chapter.content) > 80)) {
      out.push(
        warning(
          "canon-missing-names",
          "HIGH",
          "Personaggi canonici non compaiono nel manoscritto",
          `Assenti nel testo generato: ${missingNames.slice(0, 5).join(", ")}.`,
          "Verifica se il blueprint li prevede nei capitoli generati; se si', rigenera/patcha solo i passaggi mancanti, senza introdurre nuovi archi.",
        ),
      );
    }
  }

  const contaminationPatterns = [
    /__RESULT__|__DELTA__|CHUNK_START|CHUNK_END/i,
    /blueprint\s*memory|canon\s*fix|guardCreditOperation/i,
    /lorem ipsum|as an ai|come modello linguistico/i,
  ];
  const contamination = contaminationPatterns.find((pattern) => pattern.test(manuscript));
  if (contamination) {
    out.push(
      warning(
        "canon-technical-contamination",
        "CRITICAL",
        "Contaminazione tecnica nel manoscritto",
        `Pattern rilevato: ${String(contamination).replace(/^\/|\/[a-z]*$/g, "")}.`,
        "Blocca export, pulisci il capitolo contaminato e rilancia diagnostic/patch prima di pubblicare.",
      ),
    );
  }

  return out;
}

function detectSubchapterWarnings(project: BookProject): AdvancedAuditWarning[] {
  const truth = getBookStructureTruth(project);
  const missingRefs = getMissingActiveSubchapterRefs(project);
  const out: AdvancedAuditWarning[] = [];

  if (truth.diagnostics.length) {
    out.push(
      warning(
        "subchapter-truth-diagnostic",
        "LOW",
        "Diagnostica struttura sottocapitoli",
        truth.diagnostics.join(" "),
        "Mantieni export lineare se il libro e' narrativa; usa sottocapitoli strutturali solo quando blueprint e genere lo richiedono.",
      ),
    );
  }

  if (missingRefs.length) {
    out.push(
      warning(
        "subchapter-missing",
        "HIGH",
        "Sottocapitoli previsti ma vuoti",
        missingRefs.slice(0, 8).map((ref) => `${chapterTitle(project, ref.chapterIndex)} / sotto ${ref.subIndex + 1}`).join("; "),
        "Usa Subchapter Auditor: sposta testo gia' presente nel capitolo se pertinente, oppure lascia chapter-only se il blueprint non richiede contenuto separato. Non inventare scene.",
      ),
    );
  }

  (project.chapters || []).forEach((chapter, chapterIndex) => {
    const chapterWords = countWords(chapter.content);
    const subWords = (chapter.subchapters || []).reduce((sum, sub) => sum + countWords(sub.content), 0);
    if (truth.requiresSubchapters && chapterWords > 220 && subWords < 40 && (chapter.subchapters || []).length > 0) {
      out.push(
        warning(
          `subchapter-text-main-${chapterIndex}`,
          "MEDIUM",
          "Testo concentrato nel capitolo principale",
          `${chapterTitle(project, chapterIndex)}: ${chapterWords} parole nel corpo, ${subWords} nei sottocapitoli.`,
          "Proponi split automatico sicuro usando solo paragrafi esistenti: nessun contenuto nuovo.",
        ),
      );
    }
  });

  return out.slice(0, 8);
}

const BLUEPRINT_SIGNAL_STOPWORDS = new Set(
  [
    "capitolo", "chapter", "scena", "scene", "parte", "prima", "seconda", "terza", "questo", "questa",
    "quello", "quella", "della", "dello", "delle", "degli", "alla", "allo", "alle", "agli", "con",
    "per", "tra", "fra", "nel", "nella", "nelle", "sul", "sulla", "sulle", "sono", "essere", "avere",
    "come", "dove", "quando", "mentre", "verso", "dopo", "prima", "ancora", "senza", "within",
    "about", "from", "into", "with", "that", "this", "what", "when", "where", "while", "their",
    "there", "chapter", "story", "summary", "purpose",
  ],
);

const ENTITY_STOPWORDS = new Set(
  [
    "il", "lo", "la", "gli", "le", "un", "una", "uno", "e", "ma", "poi", "era", "non", "nel", "sul",
    "alla", "dalla", "della", "quando", "mentre", "perche", "come", "dove", "prima", "dopo", "capitolo",
    "chapter", "parte", "prologo", "epilogo", "lui", "lei", "loro", "io", "tu", "noi", "voi", "signor",
    "signora", "mr", "mrs", "dr", "the", "and", "but", "then", "when", "while", "because", "before",
    "after", "with", "without", "into", "from", "over",
  ],
);

function compactUnique(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length < 2) continue;
    const key = normalizeText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function statusFromCoverage(coverage: number): AdvancedAuditStepStatus {
  if (coverage >= 90) return "PASS";
  if (coverage >= 55) return "WARNING";
  return "FAIL";
}

function buildGeneratedChapterText(project: BookProject, chapterIndex: number): string {
  const chapter = project.chapters?.[chapterIndex];
  return [chapter?.content, ...(chapter?.subchapters || []).map((sub) => sub.content)].filter(Boolean).join("\n\n");
}

function buildSubchapterCoverage(project: BookProject): SubchapterCoverageRow[] {
  const outlines = project.blueprint?.chapterOutlines || [];
  return outlines
    .map((outline, chapterIndex) => {
      const expected = (outline.subchapters || []).map((sub, subIndex) => sub.title?.trim() || `Sottocapitolo ${subIndex + 1}`);
      if (!expected.length) return null;
      const generatedSubs = project.chapters?.[chapterIndex]?.subchapters || [];
      const generated: string[] = [];
      const emptyGenerated: string[] = [];
      const missing: string[] = [];

      expected.forEach((expectedTitle, subIndex) => {
        const generatedSub = generatedSubs[subIndex];
        const generatedTitle = generatedSub?.title?.trim() || expectedTitle;
        const words = countWords(generatedSub?.content);
        if (words >= 20) {
          generated.push(generatedTitle);
        } else {
          missing.push(expectedTitle);
          if (generatedSub) emptyGenerated.push(generatedTitle);
        }
      });

      return {
        chapterIndex,
        chapterTitle: chapterTitle(project, chapterIndex),
        expected,
        generated,
        missing,
        emptyGenerated,
        coveragePercent: Math.round((generated.length / Math.max(expected.length, 1)) * 100),
      };
    })
    .filter((row): row is SubchapterCoverageRow => Boolean(row));
}

function buildAllowedEntityKeys(project: BookProject, expectedCharacters: string[]): Set<string> {
  const values = [
    ...expectedCharacters,
    ...expectedCharacters.map((name) => name.split(/\s+/)[0]),
    project.config.title,
    project.config.subtitle,
    project.config.author,
    project.config.authorName,
    project.config.writerName,
    ...(project.blueprint?.chapterOutlines || []).flatMap((outline) => [
      outline.title,
      ...(outline.subchapters || []).map((sub) => sub.title),
    ]),
    ...(project.chapters || []).flatMap((chapter) => [
      chapter.title,
      ...(chapter.subchapters || []).map((sub) => sub.title),
    ]),
  ];
  return new Set(compactUnique(values).map(normalizeText));
}

function textContainsName(text: string, name: string): boolean {
  const first = name.split(/\s+/)[0]?.trim();
  if (!first) return false;
  const fullPattern = new RegExp(`(^|[^\\p{L}])${escapeRegExp(name)}([^\\p{L}]|$)`, "iu");
  const firstPattern = new RegExp(`(^|[^\\p{L}])${escapeRegExp(first)}([^\\p{L}]|$)`, "iu");
  return fullPattern.test(text) || firstPattern.test(text);
}

function extractManuscriptEntities(project: BookProject, expectedCharacters: string[]): string[] {
  const manuscript = getAllChapterText(project);
  const allowed = buildAllowedEntityKeys(project, expectedCharacters);
  const counts = new Map<string, { label: string; count: number }>();
  const matches = manuscript.match(/\b[\p{Lu}][\p{L}'’-]{2,}(?:\s+[\p{Lu}][\p{L}'’-]{2,}){0,2}\b/gu) || [];

  for (const raw of matches) {
    const label = raw.replace(/\s+/g, " ").trim();
    const parts = label.split(/\s+/);
    const firstKey = normalizeText(parts[0] || "");
    const key = normalizeText(label);
    if (!key || ENTITY_STOPWORDS.has(firstKey) || allowed.has(key) || allowed.has(firstKey)) continue;
    if (parts.length === 1 && parts[0].length < 4) continue;
    const previous = counts.get(key);
    counts.set(key, { label, count: (previous?.count || 0) + 1 });
  }

  return Array.from(counts.values())
    .filter((item) => item.count >= 2 || item.label.includes(" "))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 12)
    .map((item) => item.label);
}

function buildCharacterConsistencyAudit(project: BookProject): CharacterConsistencyAudit {
  const expectedCharacters = compactUnique([
    ...extractCanonNames(project),
    ...(project.memoryGraph?.characters || []).map((character) => character.name),
    ...(project.longBookMemory?.characterStates || []).map((character) => character.name),
  ]);
  const manuscript = getAllChapterText(project);
  const presentCharacters = expectedCharacters.filter((name) => textContainsName(manuscript, name));
  const missingCharacters = expectedCharacters.filter((name) => !presentCharacters.includes(name));
  const manuscriptOnlyCharacters = extractManuscriptEntities(project, expectedCharacters);

  return {
    expectedCharacters,
    presentCharacters,
    missingCharacters,
    manuscriptOnlyCharacters,
  };
}

function extractQuestionSignals(text: string): string[] {
  return (text.match(/[^.!?\n]{12,160}\?/g) || [])
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function extractRecurringObjects(text: string): string[] {
  const objectLabels = [
    "chiave", "lettera", "anello", "foto", "diario", "porta", "cassetto", "telefono",
    "documento", "mappa", "arma", "coltello", "pistola", "collana", "orologio",
    "key", "letter", "ring", "photo", "diary", "door", "phone", "map", "weapon", "knife",
  ];
  const normalized = normalizeText(text);
  return objectLabels
    .map((label) => {
      const matches = normalized.match(new RegExp(`(^|\\s)${escapeRegExp(normalizeText(label))}(\\s|$)`, "g")) || [];
      return { label, count: matches.length };
    })
    .filter((item) => item.count >= 2)
    .map((item) => `${item.label} (${item.count})`)
    .slice(0, 10);
}

function buildNarrativePromiseAudit(project: BookProject): NarrativePromiseAudit {
  const manuscript = getAllChapterText(project);
  const graph = project.memoryGraph;
  const longMemory = project.longBookMemory;

  const secretsIntroduced = compactUnique([
    ...(graph?.characters || []).map((character) => character.greatestSecret),
    ...((manuscript.match(/[^.!?\n]{0,120}\bsegreto\b[^.!?\n]{0,120}[.!?]/gi) || []).slice(0, 6)),
    ...((manuscript.match(/[^.!?\n]{0,120}\bsecret\b[^.!?\n]{0,120}[.!?]/gi) || []).slice(0, 6)),
  ]).slice(0, 10);

  const openQuestions = compactUnique([
    ...(graph?.mysteries || [])
      .filter((item) => item.status === "open" || item.status === "partial" || item.status === "abandoned")
      .map((item) => `${item.label} (${item.status})`),
    ...(longMemory?.unresolvedArcs || [])
      .filter((item) => item.type === "mystery")
      .map((item) => item.description),
    ...extractQuestionSignals(manuscript),
  ]).slice(0, 12);

  const narrativeObjects = compactUnique([
    ...(graph?.objects || [])
      .filter((item) => item.status === "active" || item.status === "lost")
      .map((item) => `${item.label} (${item.status})`),
    ...(longMemory?.foreshadowing || []).map((item) => `${item.seed} (${item.payoffStatus})`),
    ...extractRecurringObjects(manuscript),
  ]).slice(0, 12);

  const unresolvedPromises = compactUnique([
    ...(graph?.storyDebt?.unresolvedPromises || []),
    ...(graph?.promises || [])
      .filter((item) => item.status === "open" || item.status === "partial" || item.status === "broken")
      .map((item) => `${item.label} (${item.status})`),
    ...(longMemory?.promisePayoffs || [])
      .filter((item) => item.status === "open" || item.status === "overdue")
      .map((item) => `${item.promise} (${item.status})`),
    ...(longMemory?.unresolvedArcs || [])
      .filter((item) => item.type === "promise")
      .map((item) => item.description),
  ]).slice(0, 12);

  return {
    secretsIntroduced,
    openQuestions,
    narrativeObjects,
    unresolvedPromises,
  };
}

function repeatedFragments(matches: string[]): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const match of matches) {
    const label = match.replace(/\s+/g, " ").trim().slice(0, 110);
    const key = normalizeText(label).slice(0, 90);
    if (key.length < 12) continue;
    const previous = counts.get(key);
    counts.set(key, { label, count: (previous?.count || 0) + 1 });
  }
  return Array.from(counts.values())
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => `${item.label} (${item.count})`);
}

function countPattern(text: string, label: string, pattern: RegExp, threshold: number): string | null {
  const matches = text.match(pattern) || [];
  return matches.length >= threshold ? `${label} (${matches.length})` : null;
}

function buildRepetitionAudit(project: BookProject): RepetitionAudit {
  const text = getAllChapterText(project);
  const normalized = normalizeText(text);

  const metaphorMatches = text.match(/\b(?:come se|sembrava|pareva|as if|as though)\b[^.!?\n]{8,120}/gi) || [];
  const metaphors = repeatedFragments(metaphorMatches);
  const broadMetaphorCount = countPattern(text, "Formula comparativa ricorrente: come se/as if", /\b(come se|as if|as though)\b/gi, 5);
  if (broadMetaphorCount && !metaphors.includes(broadMetaphorCount)) metaphors.push(broadMetaphorCount);

  const gestures = compactUnique([
    countPattern(normalized, "mani/tremore", /\b(mani|mano)\b[^.!?\n]{0,35}\b(trem|string|serr)/g, 3),
    countPattern(normalized, "sguardo abbassato/distolto", /\b(abbasso|abbass[oò]|distolse|distoglieva)\b[^.!?\n]{0,35}\bsguardo\b/g, 2),
    countPattern(normalized, "respiro trattenuto", /\b(trattenne|tratteneva|trattenere)\b[^.!?\n]{0,35}\brespiro\b/g, 2),
    countPattern(normalized, "silenzio/non disse niente", /\b(non disse niente|silenzio|tacque)\b/g, 5),
    countPattern(normalized, "sospiri", /\b(sospiro|sospir[oò]|sospirava)\b/g, 3),
    countPattern(normalized, "occhi chiusi", /\b(chiuse|chiudeva)\b[^.!?\n]{0,30}\bocchi\b/g, 2),
  ]);

  const emotionalPatterns = compactUnique([
    countPattern(normalized, "paura ricorrente", /\b(paura|spavento|terrore)\b/g, 6),
    countPattern(normalized, "colpa/vergogna ricorrente", /\b(colpa|vergogna|vergognava)\b/g, 5),
    countPattern(normalized, "vuoto emotivo ricorrente", /\b(vuoto|svuotato|svuotata)\b/g, 4),
    countPattern(normalized, "tensione dichiarata", /\b(tensione|teso|tesa|nervoso|nervosa)\b/g, 6),
  ]);

  return { metaphors, gestures, emotionalPatterns };
}

function extractBlueprintSignals(value: string, limit = 14): string[] {
  const words = normalizeText(value).split(/\s+/);
  const counts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 5 || BLUEPRINT_SIGNAL_STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function buildOutlineSignalText(outline: NonNullable<BookProject["blueprint"]>["chapterOutlines"][number]): string {
  return [
    outline.title,
    outline.summary,
    outline.purpose,
    outline.emotionalFunction,
    outline.narrativeProgression,
    outline.characterEvolutionCheckpoint,
    outline.conflictProgression,
    outline.tensionProgression,
    outline.romanceProgression,
    outline.psychologicalProgression,
    ...(outline.canonNotes || []),
    ...(outline.subchapters || []).flatMap((sub) => [
      sub.title,
      sub.summary,
      sub.purpose,
      sub.emotionalFunction,
      sub.narrativeProgression,
      sub.conflictProgression,
      sub.tensionProgression,
      sub.romanceProgression,
      sub.psychologicalProgression,
      ...(sub.canonNotes || []),
    ]),
  ].filter(Boolean).join(" ");
}

function buildBlueprintCoverageAudit(project: BookProject): BlueprintCoverageAudit {
  const outlines = project.blueprint?.chapterOutlines || [];
  const chapterCoverage = outlines.map((outline, chapterIndex) => {
    const signals = extractBlueprintSignals(buildOutlineSignalText(outline));
    const chapterText = normalizeText(buildGeneratedChapterText(project, chapterIndex));
    const matched = signals.filter((signal) => chapterText.includes(signal));
    const missing = signals.filter((signal) => !chapterText.includes(signal));
    return {
      chapterIndex,
      title: chapterTitle(project, chapterIndex),
      coveragePercent: signals.length ? Math.round((matched.length / signals.length) * 100) : 100,
      missingSignals: missing.slice(0, 8),
      matchedSignals: matched,
    };
  });

  const matchedSignals = compactUnique(chapterCoverage.flatMap((row) => row.matchedSignals));
  const missingSignals = compactUnique(chapterCoverage.flatMap((row) => row.missingSignals));
  const totalSignals = chapterCoverage.reduce((sum, row) => sum + row.matchedSignals.length + row.missingSignals.length, 0);
  const matchedCount = chapterCoverage.reduce((sum, row) => sum + row.matchedSignals.length, 0);

  return {
    coveragePercent: totalSignals ? Math.round((matchedCount / totalSignals) * 100) : 0,
    matchedSignals: matchedSignals.slice(0, 18),
    missingSignals: missingSignals.slice(0, 18),
    chapterCoverage: chapterCoverage.map(({ matchedSignals: _matchedSignals, ...row }) => row),
  };
}

function buildAdvancedManuscriptAudit(project: BookProject): AdvancedManuscriptAudit {
  const subchapterCoverage = buildSubchapterCoverage(project);
  const characterConsistency = buildCharacterConsistencyAudit(project);
  const narrativePromiseTracker = buildNarrativePromiseAudit(project);
  const repetitionAudit = buildRepetitionAudit(project);
  const blueprintCoverage = buildBlueprintCoverageAudit(project);

  const expectedSubchapters = subchapterCoverage.reduce((sum, row) => sum + row.expected.length, 0);
  const generatedSubchapters = subchapterCoverage.reduce((sum, row) => sum + row.generated.length, 0);
  const missingSubchapters = subchapterCoverage.reduce((sum, row) => sum + row.missing.length, 0);
  const subchapterScore = expectedSubchapters ? Math.round((generatedSubchapters / expectedSubchapters) * 100) : 100;

  const characterUnexpected = characterConsistency.manuscriptOnlyCharacters.length;
  const characterMissing = characterConsistency.missingCharacters.length;
  const characterScore = characterConsistency.expectedCharacters.length
    ? Math.max(0, Math.round((characterConsistency.presentCharacters.length / characterConsistency.expectedCharacters.length) * 100) - characterUnexpected * 12)
    : characterUnexpected ? 50 : 100;

  const promiseDebt = narrativePromiseTracker.unresolvedPromises.length + narrativePromiseTracker.openQuestions.length;
  const promiseScore = Math.max(0, 100 - promiseDebt * 8);

  const repetitionCount = repetitionAudit.metaphors.length + repetitionAudit.gestures.length + repetitionAudit.emotionalPatterns.length;
  const repetitionScore = Math.max(0, 100 - repetitionCount * 14);

  const steps: AdvancedAuditStep[] = [
    {
      id: "subchapter-coverage",
      step: 1,
      title: "Subchapter Coverage",
      status: expectedSubchapters === 0 ? "PASS" : statusFromCoverage(subchapterScore),
      score: subchapterScore,
      evidence: expectedSubchapters === 0
        ? "Il blueprint attivo non prevede sottocapitoli strutturali."
        : `${generatedSubchapters}/${expectedSubchapters} sottocapitoli previsti hanno testo reale; ${missingSubchapters} mancanti o vuoti.`,
      details: subchapterCoverage
        .filter((row) => row.missing.length || row.emptyGenerated.length)
        .slice(0, 6)
        .map((row) => `Cap. ${row.chapterIndex + 1} ${row.chapterTitle}: mancanti ${row.missing.join(", ")}`),
    },
    {
      id: "character-consistency",
      step: 2,
      title: "Character Consistency",
      status: characterUnexpected ? "FAIL" : characterMissing ? "WARNING" : "PASS",
      score: characterScore,
      evidence: characterConsistency.expectedCharacters.length
        ? `${characterConsistency.presentCharacters.length}/${characterConsistency.expectedCharacters.length} personaggi canonici presenti; ${characterUnexpected} nomi/entita fuori blueprint rilevati.`
        : "Nessun personaggio canonico strutturato disponibile in config, blueprint integrity o memory graph.",
      details: [
        characterConsistency.missingCharacters.length ? `Assenti: ${characterConsistency.missingCharacters.slice(0, 8).join(", ")}` : "",
        characterConsistency.manuscriptOnlyCharacters.length ? `Solo manoscritto: ${characterConsistency.manuscriptOnlyCharacters.slice(0, 8).join(", ")}` : "",
      ].filter(Boolean),
    },
    {
      id: "narrative-promise-tracker",
      step: 3,
      title: "Narrative Promise Tracker",
      status: promiseDebt >= 8 ? "FAIL" : promiseDebt > 0 ? "WARNING" : "PASS",
      score: promiseScore,
      evidence: `${narrativePromiseTracker.secretsIntroduced.length} segreti, ${narrativePromiseTracker.openQuestions.length} domande aperte, ${narrativePromiseTracker.narrativeObjects.length} oggetti narrativi, ${narrativePromiseTracker.unresolvedPromises.length} promesse non risolte.`,
      details: [
        narrativePromiseTracker.unresolvedPromises.length ? `Promesse aperte: ${narrativePromiseTracker.unresolvedPromises.slice(0, 5).join(" | ")}` : "",
        narrativePromiseTracker.openQuestions.length ? `Domande aperte: ${narrativePromiseTracker.openQuestions.slice(0, 5).join(" | ")}` : "",
        narrativePromiseTracker.narrativeObjects.length ? `Oggetti: ${narrativePromiseTracker.narrativeObjects.slice(0, 5).join(", ")}` : "",
      ].filter(Boolean),
    },
    {
      id: "repetition-audit",
      step: 4,
      title: "Repetition Audit",
      status: repetitionCount >= 5 ? "FAIL" : repetitionCount > 0 ? "WARNING" : "PASS",
      score: repetitionScore,
      evidence: `${repetitionAudit.metaphors.length} metafore duplicate, ${repetitionAudit.gestures.length} gesti duplicati, ${repetitionAudit.emotionalPatterns.length} pattern emotivi ripetuti.`,
      details: [
        repetitionAudit.metaphors.length ? `Metafore: ${repetitionAudit.metaphors.slice(0, 4).join(" | ")}` : "",
        repetitionAudit.gestures.length ? `Gesti: ${repetitionAudit.gestures.slice(0, 4).join(" | ")}` : "",
        repetitionAudit.emotionalPatterns.length ? `Pattern emotivi: ${repetitionAudit.emotionalPatterns.slice(0, 4).join(" | ")}` : "",
      ].filter(Boolean),
    },
    {
      id: "blueprint-coverage",
      step: 5,
      title: "Blueprint Coverage %",
      status: project.blueprint?.chapterOutlines?.length ? statusFromCoverage(blueprintCoverage.coveragePercent) : "WARNING",
      score: blueprintCoverage.coveragePercent,
      evidence: project.blueprint?.chapterOutlines?.length
        ? `${blueprintCoverage.coveragePercent}% dei segnali blueprint rilevati nel manoscritto generato.`
        : "Blueprint assente: impossibile calcolare copertura reale.",
      details: [
        blueprintCoverage.missingSignals.length ? `Segnali mancanti: ${blueprintCoverage.missingSignals.slice(0, 12).join(", ")}` : "",
        ...blueprintCoverage.chapterCoverage
          .filter((row) => row.coveragePercent < 55)
          .slice(0, 4)
          .map((row) => `Cap. ${row.chapterIndex + 1} ${row.title}: ${row.coveragePercent}% coverage; mancanti ${row.missingSignals.slice(0, 5).join(", ")}`),
      ].filter(Boolean),
    },
  ];

  return {
    steps,
    subchapterCoverage,
    characterConsistency,
    narrativePromiseTracker,
    repetitionAudit,
    blueprintCoverage,
  };
}

function detectExportWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const chapters = project.chapters || [];
  const expectedChapters = project.config.numberOfChapters || project.blueprint?.chapterOutlines?.length || chapters.length;
  const completed = chapters.filter((chapter) => countWords(chapter.content) >= 80).length;
  const hasCover = Boolean(project.id && getProjectCoverDataUrl(project.id));

  if (!project.config.title?.trim()) {
    out.push(warning("export-title", "CRITICAL", "Titolo mancante", "project.config.title e' vuoto.", "Imposta il titolo prima di export/KDP."));
  }
  if (!project.config.authorName?.trim() && !project.config.author?.trim() && !project.config.writerName?.trim()) {
    out.push(warning("export-author", "HIGH", "Autore mancante", "Nessun authorName/author/writerName disponibile.", "Imposta il nome autore pubblico prima di export/KDP."));
  }
  if (completed < expectedChapters) {
    out.push(
      warning(
        "export-missing-chapters",
        "CRITICAL",
        "Capitoli mancanti o troppo corti",
        `${completed}/${expectedChapters} capitoli hanno almeno 80 parole.`,
        "Completa i capitoli mancanti prima di aprire Export Studio.",
      ),
    );
  }
  if (!project.frontMatter || !Object.values(project.frontMatter).some((v) => String(v || "").trim())) {
    out.push(warning("export-front-matter", "MEDIUM", "Front matter assente", "Nessuna sezione front matter compilata.", "Genera o compila title page/copyright/dedica prima di PDF/EPUB finale."));
  }
  if (!project.backMatter || !Object.values(project.backMatter).some((v) => String(v || "").trim())) {
    out.push(warning("export-back-matter", "LOW", "Back matter assente", "Nessuna sezione back matter compilata.", "Aggiungi note autore, CTA o conclusione se coerenti col genere."));
  }
  if (!hasCover) {
    out.push(warning("export-cover", "HIGH", "Copertina non salvata", "Cover Studio non ha una cover salvata per questo projectId.", "Apri Cover Studio e salva almeno il front cover prima dell'export commerciale."));
  }

  return out;
}

function chapterStrength(project: BookProject) {
  const rows = (project.chapters || []).map((chapter, index) => {
    const words = countWords(chapter.content);
    const editorialRating = chapter.editorialAnalysis?.scoreOutOf10;
    const aiRating = typeof chapter.aiRating?.score === "number" ? chapter.aiRating.score * 2 : null;
    const rating = typeof editorialRating === "number" ? editorialRating : aiRating;
    const outline = project.blueprint?.chapterOutlines?.[index];
    const outlineFit = outline?.summary && chapter.content?.toLowerCase().includes(outline.summary.split(/\s+/)[0]?.toLowerCase() || "") ? 1 : 0;
    const score = Math.min(100, words / 12 + (rating ? rating * 8 : 0) + outlineFit * 8);
    return { index, title: chapterTitle(project, index), words, score };
  });
  const strong = rows
    .filter((row) => row.words >= 350)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => ({ index: row.index, title: row.title, evidence: `${row.words} parole, densita' sopra la media del manoscritto.` }));
  const weak = rows
    .filter((row) => row.words < 220)
    .sort((a, b) => a.words - b.words)
    .slice(0, 5)
    .map((row) => ({ index: row.index, title: row.title, evidence: `${row.words} parole: capitolo debole o incompleto.` }));
  return { strong, weak };
}

function buildBestsellerWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const chapters = project.chapters || [];
  const first = chapters[0]?.content || "";
  const lastCompleted = [...chapters].reverse().find((chapter) => countWords(chapter.content) >= 80)?.content || "";
  const manuscript = getAllChapterText(project);
  const avgWords = chapters.length ? chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0) / chapters.length : 0;

  if (countWords(first) >= 80 && !/[?!]|scopr|segreto|porta|sangue|bacio|paura|morte|verita|verità|choice|secret|blood|kiss|fear|truth/i.test(first.slice(0, 900))) {
    out.push(warning("bestseller-hook", "MEDIUM", "Hook iniziale poco evidente", `Prime 900 battute di "${chapterTitle(project, 0)}" senza segnale forte di tensione/promessa.`, "Rafforza il primo conflitto o la promessa narrativa senza cambiare trama."));
  }
  if (avgWords > 0 && avgWords < 650) {
    out.push(warning("bestseller-depth", "HIGH", "Sviluppo capitoli sottile", `Media capitoli: ${Math.round(avgWords)} parole.`, "Espandi solo i capitoli davvero incompleti seguendo blueprint e canon."));
  }
  if (countWords(lastCompleted) >= 80 && !/[?!…]$|non era finita|non sapeva|prima che|poi vide|the end|next/i.test(lastCompleted.trim().slice(-160))) {
    out.push(warning("bestseller-payoff", "LOW", "Chiusura poco propulsiva", `Ultime battute: "${lastCompleted.trim().slice(-140)}"`, "Aggiungi una conseguenza, domanda o immagine finale che spinga la pagina successiva."));
  }
  if (/\b(molto importante|in conclusione|questo capitolo|il lettore scoprirà|this chapter)\b/i.test(manuscript)) {
    out.push(warning("bestseller-generic", "MEDIUM", "Frasi meta/generiche nel testo", "Rilevate formule come 'questo capitolo' o 'in conclusione'.", "Converti spiegazione meta in scena, argomento concreto o voce narrante naturale."));
  }

  return out;
}

export function buildAdvancedToolsAudit(project: BookProject | null | undefined): AdvancedToolsAudit | null {
  if (!project) return null;
  const duplicateWarnings = detectDuplicateParagraphs(project);
  const canonWarnings = detectCanonWarnings(project);
  const subchapterWarnings = detectSubchapterWarnings(project);
  const exportWarnings = detectExportWarnings(project);
  const bestsellerWarnings = buildBestsellerWarnings(project);
  const manuscriptAudit = buildAdvancedManuscriptAudit(project);
  const { strong, weak } = chapterStrength(project);

  const chapters = project.chapters || [];
  const totalWords = chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0);
  const completedChapters = chapters.filter((chapter) => countWords(chapter.content) >= 80).length;
  const expectedChapters = project.config.numberOfChapters || project.blueprint?.chapterOutlines?.length || chapters.length || 1;

  const bookHealthWarnings = [
    ...weak.map((chapter) =>
      warning(
        `weak-chapter-${chapter.index}`,
        "HIGH" as const,
        "Capitolo debole/incompleto",
        `Cap. ${chapter.index + 1} "${chapter.title}": ${chapter.evidence}`,
        "Completa o rigenera il capitolo usando blueprint/canon; non esportare finche' resta vuoto o sottile.",
      ),
    ),
  ];

  const scoreFromWarnings = (base: number, warnings: AdvancedAuditWarning[]) =>
    Math.max(0, base - warnings.reduce((sum, item) => sum + severityPenalty(item.severity), 0));

  const bookHealthScore = Math.min(100, Math.round((completedChapters / Math.max(expectedChapters, 1)) * 72 + Math.min(28, totalWords / 900)));
  const canonScore = scoreFromWarnings(extractCanonNames(project).length ? 88 : 68, canonWarnings);
  const subchapterScore = scoreFromWarnings(92, subchapterWarnings);
  const duplicateScore = scoreFromWarnings(96, duplicateWarnings);
  const bestsellerScore = scoreFromWarnings(Math.min(88, 52 + Math.min(28, totalWords / 1000) + strong.length * 5), bestsellerWarnings);
  const exportScore = scoreFromWarnings(96, exportWarnings);

  const allWarnings = [
    ...bookHealthWarnings,
    ...canonWarnings,
    ...subchapterWarnings,
    ...duplicateWarnings,
    ...bestsellerWarnings,
    ...exportWarnings,
  ];

  return {
    projectTitle: project.config.title || "Libro senza titolo",
    generatedAt: Date.now(),
    scores: {
      bookHealth: makeScore("Book Health", bookHealthScore, `${completedChapters}/${expectedChapters} capitoli completati, ${totalWords} parole totali.`),
      canonIntegrity: makeScore("Canon Integrity", canonScore, `${extractCanonNames(project).length} personaggi canonici trovati; ${canonWarnings.length} warning.`),
      subchapterIntegrity: makeScore("Subchapter Auditor", subchapterScore, `${subchapterWarnings.length} warning su struttura sottocapitoli.`),
      duplicateSceneRisk: makeScore("Duplicate Scene Detector", duplicateScore, `${duplicateWarnings.length} duplicazioni rilevate.`),
      bestsellerReadiness: makeScore("Bestseller Readiness", bestsellerScore, `${strong.length} capitoli forti, ${bestsellerWarnings.length} warning commerciali.`),
      exportReadiness: makeScore("Export Readiness Pro", exportScore, `${exportWarnings.length} warning export/KDP.`),
    },
    weakChapters: weak,
    strongChapters: strong,
    warnings: {
      bookHealth: bookHealthWarnings,
      canon: canonWarnings,
      subchapters: subchapterWarnings,
      duplicates: duplicateWarnings,
      bestseller: bestsellerWarnings,
      export: exportWarnings,
    },
    manuscriptAudit,
    repairPlan: allWarnings
      .sort((a, b) => severityPenalty(b.severity) - severityPenalty(a.severity))
      .slice(0, 8)
      .map((item) => makeRepair(item)),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
