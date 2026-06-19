import type { BookBlueprint, BookCharacter, BookProject } from "@/types/book";

export type CanonBrainV3Status = "STABLE" | "WARNING" | "CRITICAL";

export interface CanonCharacterLock {
  canonicalName: string;
  role?: string;
  wound: string;
  desire: string;
  fear: string;
  contradiction: string;
  obsession: string;
  trigger: string;
  behaviouralSignature: string;
  linguisticSignature: string;
  missingFields: string[];
}

export interface CanonBrainV3Issue {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "isolation" | "character" | "timeline" | "canon" | "continuity";
  message: string;
  evidence: string[];
  fix: string;
}

export interface CanonDatabaseV3 {
  projectId: string;
  projectTitle: string;
  characters: CanonCharacterLock[];
  locations: string[];
  events: string[];
  timeline: string[];
  importantObjects: string[];
  storyPromises: string[];
  immutableRules: string[];
}

export interface CanonBrainV3Report {
  version: 3;
  projectId: string;
  score: number;
  status: CanonBrainV3Status;
  isolationScore: number;
  characterLockScore: number;
  continuityScore: number;
  database: CanonDatabaseV3;
  issues: CanonBrainV3Issue[];
  promptBlock: string;
}

export interface CanonBrainV3ChunkValidationResult {
  passed: boolean;
  reason?: string;
  issues: CanonBrainV3Issue[];
  unauthorizedEntities: string[];
  report: CanonBrainV3Report;
}

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniq(values: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map(clean).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function characterName(character: BookCharacter): string {
  return clean([character.name, character.surname].filter(Boolean).join(" "));
}

function collectCharacterLocks(project: BookProject): CanonCharacterLock[] {
  const locks = new Map<string, CanonCharacterLock>();

  const addLock = (lock: CanonCharacterLock) => {
    if (!lock.canonicalName) return;
    const key = lock.canonicalName.toLowerCase();
    const existing = locks.get(key);
    if (!existing) {
      locks.set(key, lock);
      return;
    }
    locks.set(key, {
      ...existing,
      role: existing.role || lock.role,
      wound: existing.wound || lock.wound,
      desire: existing.desire || lock.desire,
      fear: existing.fear || lock.fear,
      contradiction: existing.contradiction || lock.contradiction,
      obsession: existing.obsession || lock.obsession,
      trigger: existing.trigger || lock.trigger,
      behaviouralSignature: existing.behaviouralSignature || lock.behaviouralSignature,
      linguisticSignature: existing.linguisticSignature || lock.linguisticSignature,
      missingFields: [],
    });
  };

  for (const character of project.config.characters || []) {
    addLock({
      canonicalName: characterName(character),
      role: clean(character.role),
      wound: clean(character.wound || (character as any).traumaProfile || character.personality),
      desire: clean(character.externalDesire || character.internalNeed),
      fear: clean(character.blindSpot || character.vulnerability),
      contradiction: clean(character.dominantFlaw || character.blindSpot),
      obsession: clean(character.secret || character.externalDesire),
      trigger: clean(character.emotionalTriggers),
      behaviouralSignature: clean(character.recurringBehavior || character.strictRules),
      linguisticSignature: clean(character.personalLanguage),
      missingFields: [],
    });
  }

  for (const character of project.blueprint?.integrity?.characterMemoryEngine || []) {
    addLock({
      canonicalName: clean(character.canonicalName),
      role: clean(character.role),
      wound: clean(character.emotionalWounds || character.traumaMarkers),
      desire: clean(character.coreDesire || character.secretNeed),
      fear: clean(character.coreFear),
      contradiction: clean(character.internalContradiction),
      obsession: clean(character.secretNeed || character.coreDesire),
      trigger: clean(character.traumaMarkers || character.angerStyle),
      behaviouralSignature: clean(character.bodyLanguage || character.habitsAndRecurringGestures),
      linguisticSignature: clean(character.speechPattern || character.vocabularyStyle),
      missingFields: [],
    });
  }

  return [...locks.values()].map((lock) => {
    const missingFields = [
      ["wound", lock.wound],
      ["desire", lock.desire],
      ["fear", lock.fear],
      ["contradiction", lock.contradiction],
      ["obsession", lock.obsession],
      ["trigger", lock.trigger],
      ["behaviouralSignature", lock.behaviouralSignature],
      ["linguisticSignature", lock.linguisticSignature],
    ].filter(([, value]) => !clean(value)).map(([field]) => field);
    return { ...lock, missingFields };
  });
}

function capitalizedEntities(text: string, limit = 18): string[] {
  const matches = clean(text).match(/\b[A-ZÀ-ÖØ-Þ][\p{L}'’-]{2,}(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’-]{2,}){0,3}\b/gu) || [];
  return uniq(matches.filter((item) => !/^(Chapter|Capitolo|Scriptora|English|Italian|Spanish|French|German)$/i.test(item)), limit);
}

function outlineLines(blueprint: BookBlueprint | null | undefined, field: "summary" | "title"): string[] {
  return (blueprint?.chapterOutlines || []).map((outline) => clean(outline[field])).filter(Boolean);
}

function buildCanonDatabase(project: BookProject, characterLocks: CanonCharacterLock[]): CanonDatabaseV3 {
  const blueprintText = [
    project.blueprint?.overview,
    ...(project.blueprint?.themes || []),
    project.blueprint?.emotionalArc,
    ...outlineLines(project.blueprint, "title"),
    ...outlineLines(project.blueprint, "summary"),
  ].map(clean).join(" ");
  const chapterText = (project.chapters || []).map((chapter, index) => `Ch${index + 1}: ${clean(chapter.title)} ${clean(chapter.content).slice(0, 900)}`);
  const rules = project.blueprint?.integrity?.canonProtectionLayer?.immutableCanonRules || [];
  const objects = capitalizedEntities(`${blueprintText} ${chapterText.join(" ")}`, 30)
    .filter((entity) => !characterLocks.some((character) => character.canonicalName.toLowerCase() === entity.toLowerCase()));

  return {
    projectId: project.id,
    projectTitle: clean(project.config.title) || "Senza titolo",
    characters: characterLocks,
    locations: uniq(objects.filter((entity) => /\b(casa|villa|citta|city|castle|school|accademia|ospedale|tribunale|stazione|cathedral|manor)\b/i.test(entity)), 10),
    events: uniq(outlineLines(project.blueprint, "summary").slice(0, 14), 14),
    timeline: uniq((project.blueprint?.chapterOutlines || []).map((outline, index) => `Ch${index + 1}: ${outline.title || outline.summary || "beat narrativo"}`), 18),
    importantObjects: uniq(objects.filter((entity) => /\b(key|chiave|lettera|diario|ring|anello|documento|contratto|mappa|foto)\b/i.test(entity)), 10),
    storyPromises: uniq([
      ...(project.longBookMemory?.promisePayoffs || []).map((item) => item.promise),
      ...(project.longBookMemory?.unresolvedArcs || []).map((item) => item.description),
      ...(project.blueprint?.chapterOutlines || []).flatMap((outline) => outline.canonNotes || []),
    ], 16),
    immutableRules: uniq(rules, 12),
  };
}

function buildIssues(project: BookProject, database: CanonDatabaseV3): CanonBrainV3Issue[] {
  const issues: CanonBrainV3Issue[] = [];
  if (!project.id) {
    issues.push({
      id: "missing-project-id",
      severity: "CRITICAL",
      category: "isolation",
      message: "Project Memory Isolation Layer senza projectId stabile.",
      evidence: ["project.id vuoto"],
      fix: "Blocca la generazione finche' il progetto non ha un id persistente.",
    });
  }

  for (const character of database.characters) {
    if (character.missingFields.length >= 5) {
      issues.push({
        id: `weak-lock-${character.canonicalName}`,
        severity: "HIGH",
        category: "character",
        message: `${character.canonicalName} non ha un Character Lock abbastanza completo.`,
        evidence: [`Campi mancanti: ${character.missingFields.join(", ")}`],
        fix: "Completa wound, desire, fear, contradiction, trigger, firma comportamentale e linguistica.",
      });
    }
  }

  if ((project.chapters || []).some((chapter, index) => chapter.content && !project.blueprint?.chapterOutlines?.[index])) {
    issues.push({
      id: "chapter-without-blueprint",
      severity: "MEDIUM",
      category: "continuity",
      message: "Uno o piu' capitoli scritti non hanno un outline blueprint corrispondente.",
      evidence: ["chapters.length supera chapterOutlines.length o outline assente"],
      fix: "Rigenera o ripara il blueprint prima di continuare la generazione.",
    });
  }

  return issues;
}

function scoreFromIssues(base: number, issues: CanonBrainV3Issue[], category: CanonBrainV3Issue["category"]): number {
  const penalties = issues
    .filter((issue) => issue.category === category)
    .reduce((sum, issue) => sum + (issue.severity === "CRITICAL" ? 35 : issue.severity === "HIGH" ? 18 : issue.severity === "MEDIUM" ? 10 : 4), 0);
  return Math.max(0, Math.min(100, base - penalties));
}

function statusFrom(score: number, issues: CanonBrainV3Issue[]): CanonBrainV3Status {
  if (issues.some((issue) => issue.severity === "CRITICAL") || score < 55) return "CRITICAL";
  if (issues.some((issue) => issue.severity === "HIGH") || score < 82) return "WARNING";
  return "STABLE";
}

export function buildCanonBrainV3Report(project: BookProject): CanonBrainV3Report {
  const characterLocks = collectCharacterLocks(project);
  const database = buildCanonDatabase(project, characterLocks);
  const issues = buildIssues(project, database);
  const characterCompleteness = characterLocks.length
    ? Math.round(characterLocks.reduce((sum, character) => sum + ((8 - character.missingFields.length) / 8) * 100, 0) / characterLocks.length)
    : 70;
  const isolationScore = scoreFromIssues(project.id ? 96 : 50, issues, "isolation");
  const characterLockScore = Math.max(0, Math.min(100, characterCompleteness - issues.filter((issue) => issue.category === "character").length * 6));
  const continuityScore = scoreFromIssues(project.blueprint ? 92 : 65, issues, "continuity");
  const score = Math.round(isolationScore * 0.34 + characterLockScore * 0.36 + continuityScore * 0.3);
  const status = statusFrom(score, issues);
  const promptBlock = buildCanonBrainV3PromptBlockFromDatabase(database, { score, status, issues });

  return {
    version: 3,
    projectId: project.id,
    score,
    status,
    isolationScore,
    characterLockScore,
    continuityScore,
    database,
    issues,
    promptBlock,
  };
}

function buildCanonBrainV3PromptBlockFromDatabase(
  database: CanonDatabaseV3,
  report: Pick<CanonBrainV3Report, "score" | "status" | "issues">,
): string {
  const characterLines = database.characters.slice(0, 8).map((character) =>
    `- ${character.canonicalName}${character.role ? ` (${character.role})` : ""}: wound=${character.wound || "LOCK MISSING"}; desire=${character.desire || "LOCK MISSING"}; fear=${character.fear || "LOCK MISSING"}; contradiction=${character.contradiction || "LOCK MISSING"}; behaviour=${character.behaviouralSignature || "LOCK MISSING"}; speech=${character.linguisticSignature || "LOCK MISSING"}`,
  );
  const issueLines = report.issues.slice(0, 5).map((issue) => `- ${issue.severity}: ${issue.message} Fix: ${issue.fix}`);

  return `
CANON BRAIN V3 — PROJECT MEMORY ISOLATION LAYER
Project ID: ${database.projectId}
Project title: ${database.projectTitle}
Canon Score: ${report.score}/100 (${report.status})

ABSOLUTE ISOLATION RULE:
- Use ONLY this project's blueprint, characters, places, events, timeline and promises.
- Do NOT import names, scenes, places, objects, relationships or tone from any other book/project.
- If a detail is not in this canon, either infer minimally from the active scene or leave it unstated.

AUTHORIZED CHARACTER LOCKS:
${characterLines.length ? characterLines.join("\n") : "- No character lock available. Do not invent recurring character identity beyond this active chapter."}

CANON DATABASE:
- Locations: ${database.locations.length ? database.locations.join(" · ") : "none explicitly locked"}
- Important objects: ${database.importantObjects.length ? database.importantObjects.join(" · ") : "none explicitly locked"}
- Story promises: ${database.storyPromises.length ? database.storyPromises.slice(0, 6).join(" · ") : "none explicitly locked"}
- Immutable rules: ${database.immutableRules.length ? database.immutableRules.join(" · ") : "preserve established facts and blueprint"}

CONTINUITY CHECK BEFORE WRITING:
${issueLines.length ? issueLines.join("\n") : "- No blocking canon issue detected by deterministic V3 scan."}
`.trim();
}

export function buildCanonBrainV3PromptBlock(project: BookProject): string {
  return buildCanonBrainV3Report(project).promptBlock;
}

const ENTITY_STOP_WORDS = new Set([
  "Chapter",
  "Capitolo",
  "Scriptora",
  "English",
  "Italian",
  "Spanish",
  "French",
  "German",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
  "Domenica",
]);

function normalizeEntity(value: string): string {
  return clean(value)
    .replace(/[.,;:!?()[\]{}"“”«»]+$/g, "")
    .replace(/^[.,;:!?()[\]{}"“”«»]+/g, "");
}

function entityFrequency(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const matches = clean(text).match(/\b[A-ZÀ-ÖØ-Þ][\p{L}'’-]{2,}(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’-]{2,}){0,3}\b/gu) || [];
  for (const entity of matches.map(normalizeEntity).filter(Boolean)) {
    counts.set(entity, (counts.get(entity) || 0) + 1);
  }
  return counts;
}

function buildAllowedCanonCorpus(project: BookProject, database: CanonDatabaseV3): string {
  return clean([
    project.config.title,
    project.config.subtitle,
    project.config.genre,
    project.config.subcategory,
    project.blueprint?.overview,
    project.blueprint?.emotionalArc,
    ...(project.blueprint?.themes || []),
    ...(project.blueprint?.chapterOutlines || []).flatMap((outline) => [
      outline.title,
      outline.summary,
      ...(outline.canonNotes || []),
    ]),
    ...(project.chapters || []).flatMap((chapter) => [chapter.title, chapter.content]),
    ...database.characters.map((character) => character.canonicalName),
    ...database.locations,
    ...database.importantObjects,
    ...database.storyPromises,
    ...database.immutableRules,
  ].join(" ")).toLowerCase();
}

function buildAllowedEntitySet(database: CanonDatabaseV3): Set<string> {
  const allowed = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeEntity(value).toLowerCase();
    if (!normalized) return;
    allowed.add(normalized);
    for (const part of normalized.split(/\s+/).filter((token) => token.length >= 3)) {
      allowed.add(part);
    }
  };

  for (const character of database.characters) add(character.canonicalName);
  for (const location of database.locations) add(location);
  for (const object of database.importantObjects) add(object);
  for (const promise of database.storyPromises) add(promise);
  return allowed;
}

function detectUnauthorizedChunkEntities(project: BookProject, database: CanonDatabaseV3, chunkText: string): string[] {
  const allowedEntities = buildAllowedEntitySet(database);
  const canonCorpus = buildAllowedCanonCorpus(project, database);
  const counts = entityFrequency(chunkText);

  return [...counts.entries()]
    .filter(([entity, count]) => {
      if (ENTITY_STOP_WORDS.has(entity)) return false;
      const key = entity.toLowerCase();
      if (allowedEntities.has(key)) return false;
      if (canonCorpus.includes(key)) return false;
      const looksLikeFullName = /\s/.test(entity);
      const repeatedSingleName = !looksLikeFullName && count >= 2;
      return looksLikeFullName || repeatedSingleName;
    })
    .map(([entity]) => entity)
    .slice(0, 8);
}

export function validateCanonBrainV3ChunkBeforeMerge(
  project: BookProject,
  chunkText: string,
): CanonBrainV3ChunkValidationResult {
  const report = buildCanonBrainV3Report(project);
  const issues = [...report.issues];
  const unauthorizedEntities = detectUnauthorizedChunkEntities(project, report.database, chunkText);

  if (unauthorizedEntities.length) {
    issues.push({
      id: `unauthorized-entities-${unauthorizedEntities.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      severity: "CRITICAL",
      category: "isolation",
      message: "Il chunk contiene entita nominate non presenti nel canon del progetto attivo.",
      evidence: unauthorizedEntities,
      fix: "Rigenera il chunk usando solo personaggi, luoghi, oggetti e promesse narrative del Canon Brain V3.",
    });
  }

  const blocking = issues.filter((issue) => issue.severity === "CRITICAL" && issue.category === "isolation");

  return {
    passed: blocking.length === 0,
    reason: blocking.length ? blocking.map((issue) => `${issue.id}: ${issue.evidence.join(", ")}`).join(" | ") : undefined,
    issues,
    unauthorizedEntities,
    report,
  };
}

export function detectProjectMemoryBleed(activeProject: BookProject, otherProjects: BookProject[]): CanonBrainV3Issue[] {
  const activeNames = new Set(collectCharacterLocks(activeProject).map((character) => character.canonicalName.toLowerCase()));
  const activeText = clean([
    activeProject.config.title,
    activeProject.blueprint?.overview,
    ...(activeProject.chapters || []).map((chapter) => `${chapter.title} ${chapter.content}`),
  ].join(" ")).toLowerCase();

  return otherProjects.flatMap((project) => {
    if (project.id === activeProject.id) return [];
    return collectCharacterLocks(project)
      .filter((character) => character.canonicalName && !activeNames.has(character.canonicalName.toLowerCase()))
      .filter((character) => activeText.includes(character.canonicalName.toLowerCase()))
      .map((character) => ({
        id: `memory-bleed-${project.id}-${character.canonicalName}`,
        severity: "CRITICAL" as const,
        category: "isolation" as const,
        message: `Possibile contaminazione: "${character.canonicalName}" appartiene a "${project.config.title || project.id}" ma compare nel progetto attivo.`,
        evidence: [`activeProject=${activeProject.id}`, `foreignProject=${project.id}`, `foreignCharacter=${character.canonicalName}`],
        fix: "Rimuovi il personaggio estraneo o spostalo nel canon del progetto attivo solo se e' davvero previsto.",
      }));
  });
}
