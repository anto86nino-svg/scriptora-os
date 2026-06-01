import { useEffect, useState } from "react";
import {
  FlaskConical,
  RotateCcw,
  Shield,
  Sparkles,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import {
  DEV_SIMULATION_CHANGE_EVENT,
  DEV_SIMULATION_PRESETS,
  applyDevSimulationPreset,
  buildSimulatedCreditWalletSnapshot,
  disableDevUserSimulation,
  getSimulationWalletStatus,
  isDevUserSimulationActive,
  isDevUserSimulationAvailable,
  readDevSimulationState,
  resetSimulationCredits,
  resetSimulationMonth,
  resetSimulationWallet,
  setSimulationArea,
  setSimulationBooksThisMonth,
  setSimulationMode,
  setSimulationUsedCredits,
  updateSimulationFlags,
  type DevSimulationPresetId,
  type SimulationArea,
  type SimulationMode,
} from "@/lib/dev/devUserSimulation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface DevUserSimulationPanelProps {
  open: boolean;
  onClose: () => void;
}

const MODES: SimulationMode[] = ["OFF", "FREE", "PRO", "PREMIUM", "EXPIRED"];

const AREAS: { id: SimulationArea; label: string }[] = [
  { id: "full_os", label: "Full Scriptora OS" },
  { id: "writer_only", label: "Writer Only" },
  { id: "developmental_editor", label: "Developmental Editor" },
  { id: "market_intelligence", label: "Market Intelligence" },
  { id: "kdp_publisher", label: "KDP Publisher" },
  { id: "cover_creator", label: "Cover Creator" },
];

export function DevUserSimulationPanel({ open, onClose }: DevUserSimulationPanelProps) {
  const available = isDevUserSimulationAvailable();
  const [state, setState] = useState(readDevSimulationState());
  const wallet = buildSimulatedCreditWalletSnapshot();
  const walletStatus = getSimulationWalletStatus();
  const active = isDevUserSimulationActive();

  useEffect(() => {
    const sync = () => setState(readDevSimulationState());
    window.addEventListener(DEV_SIMULATION_CHANGE_EVENT, sync);
    return () => window.removeEventListener(DEV_SIMULATION_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (open) setState(readDevSimulationState());
  }, [open]);

  if (!available) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="scriptora-dev-simulation-panel max-w-lg max-h-[90dvh] overflow-hidden flex flex-col gap-0 p-0 border-border">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UserCog className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Founder QA</span>
          </div>
          <DialogTitle className="text-base">Dev User Simulation</DialogTitle>
          <DialogDescription className="text-xs">
            Local sandbox only — real gating, real credit costs. Never touches Supabase or Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="scriptora-dev-simulation-panel__body min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mode</p>
            <div className="flex flex-wrap gap-1.5">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    if (mode === "OFF") disableDevUserSimulation();
                    else setSimulationMode(mode);
                  }}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors ${
                    state.mode === mode
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/40 text-foreground hover:bg-muted/70"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Area focus</p>
            <select
              value={state.area}
              onChange={(e) => setSimulationArea(e.target.value as SimulationArea)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              disabled={!active}
            >
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </section>

          <section className="grid grid-cols-2 gap-2">
            <Stat label="Credits" value={`${wallet.availableCredits} / ${wallet.monthlyAllowance}`} icon={<Wallet className="h-3 w-3" />} />
            <Stat label="Books (mo)" value={String(state.booksThisMonth)} icon={<Sparkles className="h-3 w-3" />} />
            <Stat label="Wallet" value={walletStatus} icon={<Shield className="h-3 w-3" />} />
            <Stat label="Subscription" value={state.subscriptionState} icon={<FlaskConical className="h-3 w-3" />} />
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Flags</p>
            <div className="space-y-1.5">
              <FlagToggle label="Real gating enabled" checked={state.flags.realGatingEnabled} onChange={(v) => updateSimulationFlags({ realGatingEnabled: v })} />
              <FlagToggle label="Real paywall enabled" checked={state.flags.realPaywallEnabled} onChange={(v) => updateSimulationFlags({ realPaywallEnabled: v })} />
              <FlagToggle label="Simulate expired plan" checked={state.flags.simulateExpiredPlan} onChange={(v) => updateSimulationFlags({ simulateExpiredPlan: v })} />
              <FlagToggle label="Simulate low credits" checked={state.flags.simulateLowCredits} onChange={(v) => updateSimulationFlags({ simulateLowCredits: v })} />
              <FlagToggle label="Show locked state" checked={state.flags.showLockedState} onChange={(v) => updateSimulationFlags({ showLockedState: v })} />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manual tuning</p>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-muted-foreground">Used credits</label>
              <input
                type="number"
                min={0}
                max={wallet.monthlyAllowance}
                value={state.usedCredits}
                onChange={(e) => setSimulationUsedCredits(Number(e.target.value))}
                className="w-20 rounded border border-border bg-background px-2 py-1 font-mono"
                disabled={!active}
              />
              <label className="text-muted-foreground ml-2">Books</label>
              <input
                type="number"
                min={0}
                value={state.booksThisMonth}
                onChange={(e) => setSimulationBooksThisMonth(Number(e.target.value))}
                className="w-16 rounded border border-border bg-background px-2 py-1 font-mono"
                disabled={!active}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Founder presets</p>
            <div className="grid gap-1.5 max-h-36 overflow-y-auto">
              {DEV_SIMULATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDevSimulationPreset(preset.id as DevSimulationPresetId)}
                  className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                >
                  <p className="font-semibold text-foreground">{preset.label}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-2">
            <ActionBtn onClick={resetSimulationMonth} icon={<RotateCcw className="h-3 w-3" />}>Reset month</ActionBtn>
            <ActionBtn onClick={resetSimulationCredits} icon={<RotateCcw className="h-3 w-3" />}>Reset credits</ActionBtn>
            <ActionBtn onClick={resetSimulationWallet} icon={<RotateCcw className="h-3 w-3" />}>Reset wallet</ActionBtn>
            <ActionBtn onClick={disableDevUserSimulation} icon={<X className="h-3 w-3" />}>Disable</ActionBtn>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/15 px-3 py-2">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}

function FlagToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-border" />
      <span>{label}</span>
    </label>
  );
}

function ActionBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-[10px] hover:bg-muted/50 transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}
