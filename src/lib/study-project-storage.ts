import type { StudySessionResult } from "@/lib/study-session";
import { computeStudySourceHash } from "@/lib/study-os/session-store";

const STORAGE_KEY = "scriptora-study-projects-v1";
const CHANGE_EVENT = "scriptora-study-projects-change";

export type StudySourceType = "pdf" | "epub" | "docx" | "notes" | "text" | "image";

export interface StudyQuizAttempt {
  score: number;
  mode: "practice" | "exam";
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
  grade10?: number;
  grade30?: number;
  judgement?: string;
}

export interface StudyProjectRecord {
  id: string;
  title: string;
  sourceName: string;
  sourceType: StudySourceType;
  rawTextPreview: string;
  rawText: string;
  rawTextLength: number;
  rawTextStoredLength?: number;
  rawTextTruncatedForStorage?: boolean;
  storageMode?: "full" | "preview" | "ultra-light";
  sourceHash: string;
  result: StudySessionResult;
  quizAttempts: StudyQuizAttempt[];
  earnedBadges: string[];
  createdAt: string;
  updatedAt: string;
}

function detectSourceType(name: string): StudySourceType {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  if (/\.(png|jpe?g|webp|heic|heif)$/i.test(lower)) return "image";
  if (lower.includes("appunt")) return "notes";
  return "text";
}

function readAll(): StudyProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r: StudyProjectRecord) => ({
      ...r,
      rawText: r.rawText || r.rawTextPreview || "",
      sourceHash: r.sourceHash || computeStudySourceHash(r.rawText || r.rawTextPreview || "", r.sourceName),
    }));
  } catch {
    return [];
  }
}

function makeStudyRawTextPreview(text: string, head = 20000, tail = 8000): string {
  const clean = text || "";
  if (clean.length <= head + tail + 500) return clean;
  return [
    clean.slice(0, head).trim(),
    "",
    `[...testo completo troppo lungo per lo storage locale: salvata anteprima. Caratteri originali: ${clean.length.toLocaleString("it-IT")}...]`,
    "",
    clean.slice(-tail).trim(),
  ].join("\n\n");
}

function prepareStudyProjectForStorage(record: StudyProjectRecord, mode: "full" | "preview" | "ultra-light" = "full"): StudyProjectRecord {
  const originalRaw = record.rawText || "";
  const shouldPreview = mode !== "full" || originalRaw.length > 50000;

  if (!shouldPreview) {
    return {
      ...record,
      rawTextPreview: originalRaw.slice(0, 4000),
      rawTextStoredLength: originalRaw.length,
      rawTextTruncatedForStorage: false,
      storageMode: "full",
    };
  }

  const preview = mode === "ultra-light"
    ? makeStudyRawTextPreview(originalRaw, 9000, 3000)
    : makeStudyRawTextPreview(originalRaw, 20000, 8000);

  return {
    ...record,
    rawTextPreview: preview.slice(0, 4000),
    rawText: preview,
    rawTextStoredLength: preview.length,
    rawTextTruncatedForStorage: preview.length < originalRaw.length,
    storageMode: mode,
  };
}

function isQuotaExceededError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  const name = error instanceof DOMException ? error.name : "";
  return /QuotaExceededError|quota|exceeded/i.test(`${name} ${message}`);
}

function writeAll(records: StudyProjectRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;

    const previewRecords = records.map((record) => prepareStudyProjectForStorage(record, "preview"));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previewRecords));
    } catch (previewError) {
      if (!isQuotaExceededError(previewError)) throw previewError;

      const ultraLightRecords = previewRecords
        .slice(0, 12)
        .map((record) => prepareStudyProjectForStorage(record, "ultra-light"));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ultraLightRecords));
    }
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listStudyProjects(): StudyProjectRecord[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getStudyProject(id: string): StudyProjectRecord | null {
  return readAll().find((r) => r.id === id) || null;
}

export function saveStudyProject(input: {
  title: string;
  sourceName: string;
  rawText: string;
  result: StudySessionResult;
  id?: string;
}): StudyProjectRecord {
  const all = readAll();
  const now = new Date().toISOString();
  const existing = input.id ? all.find((r) => r.id === input.id) : undefined;
  const fullRawText = input.rawText || "";
  const record: StudyProjectRecord = prepareStudyProjectForStorage({
    id: existing?.id || `study-${crypto.randomUUID()}`,
    title: input.title || input.result.title || "Studio",
    sourceName: input.sourceName,
    sourceType: detectSourceType(input.sourceName),
    rawTextPreview: fullRawText.slice(0, 4000),
    rawText: fullRawText,
    rawTextLength: fullRawText.length,
    sourceHash: computeStudySourceHash(fullRawText, input.sourceName),
    result: input.result,
    quizAttempts: existing?.quizAttempts || [],
    earnedBadges: existing?.earnedBadges || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }, fullRawText.length > 50000 ? "preview" : "full");

  const next = [record, ...all.filter((r) => r.id !== record.id)];
  writeAll(next);
  return record;
}

export function recordStudyQuizAttempt(
  projectId: string,
  attempt: Omit<StudyQuizAttempt, "completedAt"> & { completedAt?: string },
): StudyProjectRecord | null {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === projectId);
  if (idx < 0) return null;
  const project = all[idx];
  const nextAttempt: StudyQuizAttempt = {
    ...attempt,
    completedAt: attempt.completedAt || new Date().toISOString(),
  };
  const updated: StudyProjectRecord = {
    ...project,
    quizAttempts: [nextAttempt, ...project.quizAttempts].slice(0, 24),
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function addStudyProjectBadges(projectId: string, badges: string[]): void {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === projectId);
  if (idx < 0) return;
  const merged = Array.from(new Set([...(all[idx].earnedBadges || []), ...badges]));
  all[idx] = { ...all[idx], earnedBadges: merged, updatedAt: new Date().toISOString() };
  writeAll(all);
}

export function deleteStudyProject(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function getStudyLearningMetrics() {
  const projects = listStudyProjects();
  const attempts = projects.flatMap((p) => p.quizAttempts);
  const sessions = projects.length;
  const completedSessions = projects.filter((p) => p.quizAttempts.length > 0).length;
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;
  const subjects = Array.from(new Set(projects.map((p) => p.result.detectedSubject || p.title)));
  const badges = Array.from(new Set(projects.flatMap((p) => p.earnedBadges)));
  const level =
    avgScore >= 90 ? "Advanced" : avgScore >= 75 ? "Proficient" : avgScore >= 55 ? "Developing" : "Beginner";

  const minutesStudied = projects.reduce((sum, project) => {
    const classified = project.result.classification?.estimatedStudyMinutes;
    return sum + (classified || Math.max(10, Math.round((project.result.words || 0) / 180)));
  }, 0);
  const weakPoints = attempts
    .filter((attempt) => attempt.score < 70)
    .flatMap((attempt) => projects.find((project) => project.quizAttempts.includes(attempt))?.result.keyConcepts?.slice(0, 3) || [])
    .filter(Boolean)
    .slice(0, 12);
  const strongPoints = attempts
    .filter((attempt) => attempt.score >= 75)
    .flatMap((attempt) => projects.find((project) => project.quizAttempts.includes(attempt))?.result.keyConcepts?.slice(0, 3) || [])
    .filter(Boolean)
    .slice(0, 12);
  const recentAttempts = attempts
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const recentAsc = recentAttempts.slice(0, 5).reverse();
  const trend = recentAsc.length >= 2
    ? recentAsc[recentAsc.length - 1].score - recentAsc[0].score
    : 0;
  const streakDays = Array.from(new Set(
    projects
      .map((project) => project.updatedAt.slice(0, 10))
      .concat(attempts.map((attempt) => attempt.completedAt.slice(0, 10))),
  )).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const iso = day.toISOString().slice(0, 10);
    if (streakDays.includes(iso)) streak += 1;
    else if (i > 0) break;
  }

  return {
    sessions,
    completedSessions,
    avgScore,
    level,
    subjects,
    badges,
    minutesStudied,
    hoursStudied: Math.round((minutesStudied / 60) * 10) / 10,
    weakPoints: Array.from(new Set(weakPoints)).slice(0, 6),
    strongPoints: Array.from(new Set(strongPoints)).slice(0, 6),
    streak,
    trend,
    attempts: attempts.slice(0, 12),
    projects: projects.slice(0, 8),
  };
}
