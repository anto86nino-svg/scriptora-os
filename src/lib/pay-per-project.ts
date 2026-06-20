import type { BookLength } from "@/types/book";
import { safeParseStorage } from "@/lib/user-friendly-error";

export type PayPerProjectTierId = "short_book" | "medium_book" | "long_book" | "premium_publishing";

export interface PayPerProjectTier {
  id: PayPerProjectTierId;
  name: string;
  priceLabel: string;
  priceNumeric: number;
  description: string;
  recommendedBookLength: BookLength | "premium";
}

export interface ProjectUnlockRecord {
  projectId: string;
  tierId: PayPerProjectTierId;
  unlockedAt: string;
  checkoutMode: "dev" | "pending_checkout" | "external";
}

const STORAGE_KEY = "scriptora-project-unlocks-v1";

export const PAY_PER_PROJECT_TIERS: PayPerProjectTier[] = [
  {
    id: "short_book",
    name: "Short Book",
    priceLabel: "€3,99",
    priceNumeric: 3.99,
    recommendedBookLength: "short",
    description: "Poesia, racconto lungo, manualetto o libro breve.",
  },
  {
    id: "medium_book",
    name: "Medium Book",
    priceLabel: "€6,99",
    priceNumeric: 6.99,
    recommendedBookLength: "medium",
    description: "Libro medio, self-help medio, romance/thriller breve-medio o saggio medio.",
  },
  {
    id: "long_book",
    name: "Long Book",
    priceLabel: "€11,99",
    priceNumeric: 11.99,
    recommendedBookLength: "long",
    description: "Romanzo lungo, fantasy/thriller corposo o nonfiction lunga.",
  },
  {
    id: "premium_publishing",
    name: "Premium Publishing Project",
    priceLabel: "€19,99",
    priceNumeric: 19.99,
    recommendedBookLength: "premium",
    description: "Libro completo con publishing pack essenziale: keyword, KDP, export e cover base.",
  },
];

export function recommendPayPerProjectTier(bookLength?: BookLength): PayPerProjectTier {
  if (bookLength === "short") return PAY_PER_PROJECT_TIERS[0];
  if (bookLength === "long" || bookLength === "custom") return PAY_PER_PROJECT_TIERS[2];
  return PAY_PER_PROJECT_TIERS[1];
}

export function listProjectUnlocks(): ProjectUnlockRecord[] {
  if (typeof localStorage === "undefined") return [];
  return safeParseStorage<ProjectUnlockRecord[]>(localStorage.getItem(STORAGE_KEY), [])
    .filter((item) => typeof item?.projectId === "string" && typeof item?.tierId === "string");
}

export function isProjectUnlocked(projectId?: string | null): boolean {
  if (!projectId) return false;
  return listProjectUnlocks().some((record) => record.projectId === projectId);
}

export function getProjectUnlock(projectId?: string | null): ProjectUnlockRecord | null {
  if (!projectId) return null;
  return listProjectUnlocks().find((record) => record.projectId === projectId) || null;
}

export function saveProjectUnlock(record: ProjectUnlockRecord): ProjectUnlockRecord {
  const existing = listProjectUnlocks().filter((item) => item.projectId !== record.projectId);
  const next = [...existing, record];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return record;
}

export function createPendingProjectUnlock(projectId: string, tierId: PayPerProjectTierId): ProjectUnlockRecord {
  return saveProjectUnlock({
    projectId,
    tierId,
    checkoutMode: "pending_checkout",
    unlockedAt: new Date().toISOString(),
  });
}
