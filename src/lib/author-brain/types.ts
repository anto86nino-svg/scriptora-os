/**
 * Author Brain — types and utilities.
 * V1: seed + biography expand
 * V2: published books + author platform (data collection only)
 */

/** V1 persisted on AuthorIdentity.authorBrainSeed + AuthorIdentity.biography */
export interface AuthorBrainFoundation {
  seed: string;
}

/** Reserved for Step 3+ — auto-injection, CTA generation (NOT built in V2) */
export interface AuthorBrainFutureAutomation {
  autoInjectAboutAuthor?: never;
  autoInjectOtherBooks?: never;
  autoFollowCta?: never;
  kdpSync?: never;
}

export interface ExpandAuthorBioInput {
  seed: string;
  penName: string;
  language?: string;
  archetype?: string;
  voice?: string;
  recurringThemes?: string;
  authorPresence?: string[];
  readerEmotionalGoals?: string[];
  authorMessage?: string;
  toneDirective?: string;
  userId?: string | null;
}

export interface ExpandAuthorBioResult {
  biography: string;
}

export type {
  AuthorPlatform,
  AuthorPublishedBook,
  AuthorPublishedBookLinks,
} from "@/types/book";
