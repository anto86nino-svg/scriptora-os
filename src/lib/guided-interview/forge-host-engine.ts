import type { GuidedInterviewState } from "./types";
import { getForgeDaypart, type ForgeDaypart } from "./opening-experience";
import { countForgeUserAnswers } from "./opening-experience";

export type ForgeHostContext = {
  penName?: string | null;
  authorName?: string | null;
  genderHint?: "m" | "f" | "neutral";
  isResuming?: boolean;
  date?: Date;
};

function resolveDisplayName(ctx: ForgeHostContext, state?: GuidedInterviewState): string {
  const fromCtx = ctx.penName?.trim() || ctx.authorName?.trim();
  if (fromCtx) return fromCtx;
  const fromState = state?.extracted?.authorName?.trim();
  if (fromState) return fromState;
  return "";
}

function resolveAuthorFallback(ctx: ForgeHostContext): string {
  if (ctx.genderHint === "f") return "scrittrice";
  return "scrittore";
}

function daypartGreeting(daypart: ForgeDaypart): string {
  switch (daypart) {
    case "morning":
      return "Buongiorno";
    case "afternoon":
      return "Buon pomeriggio";
    case "evening":
      return "Buonasera";
    case "night":
      return "Buonasera";
  }
}

export function buildForgeHostGreeting(
  ctx: ForgeHostContext = {},
  state?: GuidedInterviewState,
): string {
  const date = ctx.date ?? new Date();
  const daypart = getForgeDaypart(date);
  const name = resolveDisplayName(ctx, state);
  const fallback = resolveAuthorFallback(ctx);
  const address = name || fallback;

  if (ctx.isResuming || (state && countForgeUserAnswers(state) > 0)) {
    return `Bentornato, ${name || address}. Riprendiamo da dove eravamo rimasti.`;
  }

  return `${daypartGreeting(daypart)}, ${address}.`;
}

export function buildForgeHostIntro(ctx: ForgeHostContext = {}, state?: GuidedInterviewState): string {
  const greeting = buildForgeHostGreeting(ctx, state);
  if (ctx.isResuming || (state && countForgeUserAnswers(state) > 0)) {
    return greeting;
  }
  return `${greeting} Sono qui per costruire il libro con te — una decisione alla volta.`;
}
