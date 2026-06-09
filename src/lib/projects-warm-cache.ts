import type { BookProject } from "@/types/book";

const REMOTE_REFRESH_TTL_MS = 90_000;

interface WarmEntry {
  userId: string;
  projects: BookProject[];
  remoteFetchedAt: number;
}

let warm: WarmEntry | null = null;

export function getWarmProjects(userId: string): BookProject[] | null {
  if (!warm || warm.userId !== userId) return null;
  return warm.projects;
}

export function setWarmProjects(userId: string, projects: BookProject[], options?: { remote?: boolean }): void {
  warm = {
    userId,
    projects,
    remoteFetchedAt: options?.remote ? Date.now() : warm?.userId === userId ? warm.remoteFetchedAt : 0,
  };
}

export function shouldSkipRemoteProjectsRefresh(userId: string): boolean {
  if (!warm || warm.userId !== userId) return false;
  return Date.now() - warm.remoteFetchedAt < REMOTE_REFRESH_TTL_MS;
}

export function markRemoteProjectsFetched(userId: string, projects: BookProject[]): void {
  setWarmProjects(userId, projects, { remote: true });
}

export function clearWarmProjects(): void {
  warm = null;
}
