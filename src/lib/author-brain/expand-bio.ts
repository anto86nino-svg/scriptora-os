import { supabase } from "@/integrations/supabase/client";
import type { ExpandAuthorBioInput, ExpandAuthorBioResult } from "./types";
import { buildExpandBioPassiveContext } from "./passive-intelligence";
import type { AuthorIdentity } from "@/types/book";

const MIN_SEED_LENGTH = 12;

export function validateAuthorBrainSeed(seed: string): string | null {
  const trimmed = String(seed || "").trim();
  if (trimmed.length < MIN_SEED_LENGTH) {
    return `Write at least ${MIN_SEED_LENGTH} characters about yourself before expanding.`;
  }
  return null;
}

export async function expandAuthorBio(input: ExpandAuthorBioInput): Promise<ExpandAuthorBioResult> {
  const seed = String(input.seed || "").trim();
  const validationError = validateAuthorBrainSeed(seed);
  if (validationError) throw new Error(validationError);

  const { data, error } = await supabase.functions.invoke("expand-author-bio", {
    body: {
      seed,
      penName: String(input.penName || "").trim() || "Author",
      language: input.language || "Italian",
      archetype: input.archetype || "",
      voice: input.voice || "",
      recurringThemes: input.recurringThemes || "",
      authorPresence: input.authorPresence || [],
      readerEmotionalGoals: input.readerEmotionalGoals || [],
      authorMessage: input.authorMessage || "",
      toneDirective: input.toneDirective || "",
      userId: input.userId ?? null,
    },
  });

  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

  const biography = String((data as ExpandAuthorBioResult)?.biography || "").trim();
  if (!biography) throw new Error("Scriptora returned an empty bio. Try again or edit manually.");

  return { biography };
}

/** Expand bio with optional full identity for passive voice memory (V5) */
export async function expandAuthorBioFromIdentity(
  identity: AuthorIdentity,
  userId?: string | null,
): Promise<ExpandAuthorBioResult> {
  const passive = buildExpandBioPassiveContext(identity);
  return expandAuthorBio({
    seed: String(identity.authorBrainSeed || "").trim(),
    penName: identity.penName,
    language: identity.language || "Italian",
    archetype: identity.archetype,
    voice: identity.voice,
    recurringThemes: identity.recurringThemes,
    authorPresence: passive.authorPresence,
    readerEmotionalGoals: passive.readerEmotionalGoals,
    authorMessage: passive.authorMessage,
    toneDirective: passive.toneDirective,
    userId,
  });
}
