import type { StudySessionResult } from "@/lib/study-session";

const STORAGE_KEY = "scriptora-study-projects-v1";
const CHANGE_EVENT = "scriptora-study-projects-change";

export type StudySourceType = "pdf" | "epub" | "docx" | "notes" | "text";

export interface StudyQuizAttempt {
  score: number;
  mode: "practice" | "exam";
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
}

export interface StudyProjectRecord {
  id: string;
  title: string;
  sourceName: string;
  sourceType: StudySourceType;
  rawTextPreview: string;
  rawText: string;
  rawTextLength: number;
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
    }));
  } catch {
    return [];
  }
}

function writeAll(records: StudyProjectRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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
  const record: StudyProjectRecord = {
    id: existing?.id || `study-${crypto.randomUUID()}`,
    title: input.title || input.result.title || "Studio",
    sourceName: input.sourceName,
    sourceType: detectSourceType(input.sourceName),
    rawTextPreview: input.rawText.slice(0, 4000),
    rawText: input.rawText,
    rawTextLength: input.rawText.length,
    result: input.result,
    quizAttempts: existing?.quizAttempts || [],
    earnedBadges: existing?.earnedBadges || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

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
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;
  const subjects = Array.from(new Set(projects.map((p) => p.result.detectedSubject || p.title)));
  const badges = Array.from(new Set(projects.flatMap((p) => p.earnedBadges)));
  const level =
    avgScore >= 90 ? "Advanced" : avgScore >= 75 ? "Proficient" : avgScore >= 55 ? "Developing" : "Beginner";

  return {
    sessions,
    avgScore,
    level,
    subjects,
    badges,
    attempts: attempts.slice(0, 12),
    projects: projects.slice(0, 8),
  };
}
