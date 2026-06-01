/**
 * Dev-only user simulation — local sandbox, never touches Supabase / Stripe.
 * Uses REAL creditPolicy + plan limits; persists in localStorage only.
 */
import {
  calculateCreditCost,
  canRunCreditOperation,
  getMonthlyCreditsForPlan,
  type CreditCostParams,
  type CreditOperation,
  type CreditRunCheckResult,
} from "@/lib/billing/creditPolicy";
import { mapPlanTierToScriptoraPlan } from "@/lib/billing/planAdapter";
import type { CreditWalletSnapshot } from "@/lib/billing/creditWallet";
import { canUseDevTools } from "@/lib/app-environment";
import { isDevMode } from "@/lib/dev-mode";
import type { PlanTier } from "@/lib/plan";
import { getDevPlanOverride } from "@/lib/dev-plan-override";

export type SimulationMode = "OFF" | "FREE" | "PRO" | "PREMIUM" | "EXPIRED";

export type SimulationArea =
  | "full_os"
  | "writer_only"
  | "developmental_editor"
  | "market_intelligence"
  | "kdp_publisher"
  | "cover_creator";

export interface DevSimulationFlags {
  realGatingEnabled: boolean;
  realPaywallEnabled: boolean;
  simulateExpiredPlan: boolean;
  simulateLowCredits: boolean;
  showLockedState: boolean;
}

export interface DevSimulationState {
  mode: SimulationMode;
  area: SimulationArea;
  usedCredits: number;
  booksThisMonth: number;
  bookLimitReached: boolean;
  subscriptionState: "active" | "expired" | "none";
  flags: DevSimulationFlags;
  periodStart: string;
  updatedAt: string;
}

export type DevSimulationPresetId =
  | "free_curious"
  | "free_frustrated"
  | "power_romance"
  | "heavy_writer"
  | "market_intel"
  | "kdp_publisher"
  | "anti_ai_author"
  | "expired_premium"
  | "low_credit_anxiety";

const STORAGE_KEY = "scriptora-dev-user-simulation-v1";
export const DEV_SIMULATION_CHANGE_EVENT = "scriptora-dev-simulation-change";

const DEFAULT_FLAGS: DevSimulationFlags = {
  realGatingEnabled: true,
  realPaywallEnabled: true,
  simulateExpiredPlan: false,
  simulateLowCredits: false,
  showLockedState: true,
};

function currentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function defaultState(): DevSimulationState {
  return {
    mode: "OFF",
    area: "full_os",
    usedCredits: 0,
    booksThisMonth: 0,
    bookLimitReached: false,
    subscriptionState: "none",
    flags: { ...DEFAULT_FLAGS },
    periodStart: currentPeriodStart(),
    updatedAt: new Date().toISOString(),
  };
}

/** Dev panel + simulation logic never run in production builds without dev tools. */
export function isDevUserSimulationAvailable(): boolean {
  if (!import.meta.env.DEV && !canUseDevTools()) return false;
  return canUseDevTools() && isDevMode();
}

export function isDevUserSimulationActive(): boolean {
  if (!isDevUserSimulationAvailable()) return false;
  return readDevSimulationState().mode !== "OFF";
}

export function readDevSimulationState(): DevSimulationState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as DevSimulationState;
    const periodStart = currentPeriodStart();
    if (parsed.periodStart !== periodStart) {
      return {
        ...parsed,
        usedCredits: 0,
        booksThisMonth: 0,
        bookLimitReached: false,
        periodStart,
        updatedAt: new Date().toISOString(),
      };
    }
    return { ...defaultState(), ...parsed, flags: { ...DEFAULT_FLAGS, ...parsed.flags } };
  } catch {
    return defaultState();
  }
}

function writeDevSimulationState(state: DevSimulationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(DEV_SIMULATION_CHANGE_EVENT));
    window.dispatchEvent(new Event("scriptora-credit-wallet-change"));
    window.dispatchEvent(new Event("nexora-plan-change"));
    window.dispatchEvent(new Event("nexora-usage-change"));
  } catch {
    /* quota / private mode */
  }
}

export function modeToPlanTier(mode: SimulationMode): PlanTier {
  switch (mode) {
    case "FREE":
    case "EXPIRED":
      return "free";
    case "PRO":
      return "pro";
    case "PREMIUM":
      return "premium";
    default:
      return getDevPlanOverride();
  }
}

/** Plan tier for gating when simulation is active; otherwise null. */
export function getSimulatedPlanTier(): PlanTier | null {
  if (!isDevUserSimulationActive()) return null;
  return modeToPlanTier(readDevSimulationState().mode);
}

export function getEffectiveDevPlanTier(): PlanTier {
  const simulated = getSimulatedPlanTier();
  if (simulated) return simulated;
  if (isDevMode()) return getDevPlanOverride();
  return "free";
}

export function setSimulationMode(mode: SimulationMode): void {
  if (!isDevUserSimulationAvailable()) return;
  const prev = readDevSimulationState();
  const plan = modeToPlanTier(mode);
  const scriptoraPlan = mapPlanTierToScriptoraPlan(plan);
  const monthly = getMonthlyCreditsForPlan(scriptoraPlan);

  let usedCredits = prev.usedCredits;
  let booksThisMonth = prev.booksThisMonth;
  let bookLimitReached = prev.bookLimitReached;
  let subscriptionState: DevSimulationState["subscriptionState"] = "none";

  if (mode === "OFF") {
    writeDevSimulationState(defaultState());
    return;
  }

  if (mode === "EXPIRED") {
    subscriptionState = "expired";
    usedCredits = Math.min(usedCredits, getMonthlyCreditsForPlan("free"));
    bookLimitReached = booksThisMonth >= 1;
  } else {
    subscriptionState = "active";
    usedCredits = Math.min(usedCredits, monthly);
  }

  writeDevSimulationState({
    ...prev,
    mode,
    usedCredits,
    booksThisMonth,
    bookLimitReached,
    subscriptionState,
    periodStart: currentPeriodStart(),
    updatedAt: new Date().toISOString(),
  });
}

export function setSimulationArea(area: SimulationArea): void {
  if (!isDevUserSimulationAvailable()) return;
  writeDevSimulationState({ ...readDevSimulationState(), area, updatedAt: new Date().toISOString() });
}

export function updateSimulationFlags(partial: Partial<DevSimulationFlags>): void {
  if (!isDevUserSimulationAvailable()) return;
  const state = readDevSimulationState();
  writeDevSimulationState({
    ...state,
    flags: { ...state.flags, ...partial },
    updatedAt: new Date().toISOString(),
  });
}

export function setSimulationUsedCredits(usedCredits: number): void {
  if (!isDevUserSimulationAvailable()) return;
  const state = readDevSimulationState();
  const plan = mapPlanTierToScriptoraPlan(getEffectiveDevPlanTier());
  const cap = getMonthlyCreditsForPlan(plan);
  writeDevSimulationState({
    ...state,
    usedCredits: Math.max(0, Math.min(cap, usedCredits)),
    updatedAt: new Date().toISOString(),
  });
}

export function setSimulationBooksThisMonth(count: number, bookLimitReached = false): void {
  if (!isDevUserSimulationAvailable()) return;
  writeDevSimulationState({
    ...readDevSimulationState(),
    booksThisMonth: Math.max(0, count),
    bookLimitReached,
    updatedAt: new Date().toISOString(),
  });
}

export function resetSimulationMonth(): void {
  if (!isDevUserSimulationAvailable()) return;
  writeDevSimulationState({
    ...readDevSimulationState(),
    usedCredits: 0,
    booksThisMonth: 0,
    bookLimitReached: false,
    periodStart: currentPeriodStart(),
    updatedAt: new Date().toISOString(),
  });
}

export function resetSimulationCredits(): void {
  if (!isDevUserSimulationAvailable()) return;
  writeDevSimulationState({
    ...readDevSimulationState(),
    usedCredits: 0,
    updatedAt: new Date().toISOString(),
  });
}

export function resetSimulationWallet(): void {
  resetSimulationMonth();
}

export function disableDevUserSimulation(): void {
  if (!isDevUserSimulationAvailable()) return;
  writeDevSimulationState(defaultState());
}

export function buildSimulatedCreditWalletSnapshot(): CreditWalletSnapshot {
  const state = readDevSimulationState();
  const planTier = getEffectiveDevPlanTier();
  const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
  const monthlyAllowance = getMonthlyCreditsForPlan(scriptoraPlan);
  const availableCredits = Math.max(0, monthlyAllowance - state.usedCredits);

  return {
    plan: scriptoraPlan,
    monthlyAllowance,
    usedCredits: state.usedCredits,
    availableCredits,
    periodStart: state.periodStart,
    source: "local-fallback",
    updatedAt: state.updatedAt,
  };
}

export function getSimulatedBooksThisMonth(fallback: number): number {
  if (!isDevUserSimulationActive()) return fallback;
  return readDevSimulationState().booksThisMonth;
}

export function isSimulatedFreeBookLimitReached(actualProjectCount: number): boolean {
  if (!isDevUserSimulationActive()) {
    return false;
  }
  const state = readDevSimulationState();
  if (state.bookLimitReached) return true;
  const tier = getSimulatedPlanTier();
  if (tier !== "free") return false;
  return state.booksThisMonth >= 1 || actualProjectCount > 0;
}

export function isDevSimulationCreditEnforcementActive(): boolean {
  if (!isDevUserSimulationActive()) return false;
  return readDevSimulationState().flags.realGatingEnabled;
}

export function isDevSimulationPaywallActive(): boolean {
  if (!isDevUserSimulationActive()) return false;
  return readDevSimulationState().flags.realPaywallEnabled;
}

/** Consume credits using REAL pricing — blocks when insufficient. */
export function consumeDevSimulatedCredits(params: CreditCostParams): CreditRunCheckResult {
  if (!isDevUserSimulationActive()) {
    const cost = calculateCreditCost(params);
    return { allowed: true, requiredCredits: cost, missingCredits: 0 };
  }

  const state = readDevSimulationState();
  const planTier = getEffectiveDevPlanTier();
  const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
  const wallet = buildSimulatedCreditWalletSnapshot();

  const check = canRunCreditOperation({
    ...params,
    plan: scriptoraPlan,
    availableCredits: wallet.availableCredits,
  });

  if (check.allowed && state.flags.realGatingEnabled) {
    writeDevSimulationState({
      ...state,
      usedCredits: state.usedCredits + check.requiredCredits,
      updatedAt: new Date().toISOString(),
    });
    window.dispatchEvent(new Event("scriptora-credit-wallet-change"));
  }

  return check;
}

export function recordDevSimulationBookCreated(): void {
  if (!isDevUserSimulationActive()) return;
  const state = readDevSimulationState();
  const next = state.booksThisMonth + 1;
  const tier = getSimulatedPlanTier();
  const limitReached = tier === "free" && next >= 1;
  writeDevSimulationState({
    ...state,
    booksThisMonth: next,
    bookLimitReached: limitReached || state.bookLimitReached,
    updatedAt: new Date().toISOString(),
  });
}

export function getSimulationWalletStatus(): "active" | "exhausted" | "expired" {
  const state = readDevSimulationState();
  if (state.subscriptionState === "expired") return "expired";
  const wallet = buildSimulatedCreditWalletSnapshot();
  if (wallet.availableCredits <= 0) return "exhausted";
  return "active";
}

export interface DevSimulationPreset {
  id: DevSimulationPresetId;
  label: string;
  description: string;
  apply: () => void;
}

function applyPreset(config: {
  mode: SimulationMode;
  usedCredits: number;
  booksThisMonth: number;
  bookLimitReached?: boolean;
  subscriptionState?: DevSimulationState["subscriptionState"];
  area?: SimulationArea;
}): void {
  const flags = { ...DEFAULT_FLAGS };
  if (config.mode === "EXPIRED") {
    flags.simulateExpiredPlan = true;
  }
  if (config.usedCredits >= getMonthlyCreditsForPlan(mapPlanTierToScriptoraPlan(modeToPlanTier(config.mode))) - 20) {
    flags.simulateLowCredits = true;
  }

  writeDevSimulationState({
    mode: config.mode,
    area: config.area ?? "full_os",
    usedCredits: config.usedCredits,
    booksThisMonth: config.booksThisMonth,
    bookLimitReached: config.bookLimitReached ?? false,
    subscriptionState: config.subscriptionState ?? (config.mode === "EXPIRED" ? "expired" : "active"),
    flags,
    periodStart: currentPeriodStart(),
    updatedAt: new Date().toISOString(),
  });
}

export const DEV_SIMULATION_PRESETS: DevSimulationPreset[] = [
  {
    id: "free_curious",
    label: "Free Curious User",
    description: "12 credits left · no books yet",
    apply: () => applyPreset({ mode: "FREE", usedCredits: 28, booksThisMonth: 0 }),
  },
  {
    id: "free_frustrated",
    label: "Free Frustrated User",
    description: "0 credits · book limit reached",
    apply: () => applyPreset({ mode: "FREE", usedCredits: 40, booksThisMonth: 1, bookLimitReached: true }),
  },
  {
    id: "power_romance",
    label: "Power Romance Author",
    description: "Pro · moderate usage",
    apply: () => applyPreset({ mode: "PRO", usedCredits: 200, booksThisMonth: 2, area: "writer_only" }),
  },
  {
    id: "heavy_writer",
    label: "Heavy Writer",
    description: "Premium · 12 credits remaining",
    apply: () => applyPreset({ mode: "PREMIUM", usedCredits: 1988, booksThisMonth: 3 }),
  },
  {
    id: "market_intel",
    label: "Market Intelligence User",
    description: "Pro · market-focused",
    apply: () => applyPreset({ mode: "PRO", usedCredits: 500, booksThisMonth: 1, area: "market_intelligence" }),
  },
  {
    id: "kdp_publisher",
    label: "KDP Publisher",
    description: "Premium · launch path",
    apply: () => applyPreset({ mode: "PREMIUM", usedCredits: 100, booksThisMonth: 1, area: "kdp_publisher" }),
  },
  {
    id: "anti_ai_author",
    label: "Anti-AI Author",
    description: "Free · diagnostics only mindset",
    apply: () => applyPreset({ mode: "FREE", usedCredits: 35, booksThisMonth: 0, area: "developmental_editor" }),
  },
  {
    id: "expired_premium",
    label: "Expired Premium",
    description: "Downgraded to free · expired sub",
    apply: () =>
      applyPreset({
        mode: "EXPIRED",
        usedCredits: 38,
        booksThisMonth: 1,
        bookLimitReached: true,
        subscriptionState: "expired",
      }),
  },
  {
    id: "low_credit_anxiety",
    label: "Low Credit Anxiety",
    description: "Pro · 5 credits left",
    apply: () => applyPreset({ mode: "PRO", usedCredits: 695, booksThisMonth: 1 }),
  },
];

export function applyDevSimulationPreset(id: DevSimulationPresetId): void {
  const preset = DEV_SIMULATION_PRESETS.find((p) => p.id === id);
  preset?.apply();
}

/** Test helper */
export function __writeDevSimulationStateForTests(state: DevSimulationState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function __clearDevSimulationForTests(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
