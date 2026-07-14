import { useEffect, useMemo, useState } from "react";
import {
  X, Search, Zap, Palette, PenLine, Globe, Brain, UserRound, CreditCard,
  BookOpen, Cloud, Wrench, ChevronRight, ExternalLink,
} from "lucide-react";
import { UI_LANGUAGES, useUILanguage } from "@/lib/i18n";
import { FONT_OPTIONS } from "@/lib/settings";
import { WRITING_FONTS } from "@/lib/scriptora-appearance";
import {
  THEME_QUICK_PICKS,
  getSettingsSnapshot,
  loadHubPreferences,
  saveHubPreferences,
  setThemeBackground,
  setThemeWritingFont,
  setUiLanguage,
  setVisualPerformancePreset,
  setWritingPreferences,
  clearNonEssentialCaches,
  restoreHubPreferencesDefaults,
  type ScriptoraHubPreferences,
} from "@/lib/settings-store";
import type { VisualPerformancePreset } from "@/lib/performance-mode";
import { setHumanizerLayerEnabled } from "@/lib/HumanizerLayer";
import { setGenreBrainEnabled } from "@/lib/GenreBrain";
import { setStoryBibleLockEnabled } from "@/lib/StoryBibleLock";
import { setAdvancedLaunchpadEnabled } from "@/components/one-flow/ProfileMenuDialog";
import { isDevMode } from "@/lib/dev-mode";
import { isDevUnlimitedCredits, setDevUnlimitedCredits } from "@/lib/billing/devMode";
import { loadCreditWallet } from "@/lib/billing/wallet";
import { formatCredits } from "@/lib/credit-economy";
import { isUserAuthorIdentityConfigured, getSelectedAuthorIdentity } from "@/lib/author-identity";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";

type CategoryId =
  | "workspace" | "theme" | "writing" | "language" | "ai"
  | "author" | "billing" | "export" | "privacy" | "advanced";

const CATEGORIES: Array<{ id: CategoryId; label: string; emoji: string; icon: typeof Zap }> = [
  { id: "workspace", label: "Workspace Experience", emoji: "⚡", icon: Zap },
  { id: "theme", label: "Theme & Atmosphere", emoji: "🎭", icon: Palette },
  { id: "writing", label: "Writing Experience", emoji: "✍️", icon: PenLine },
  { id: "language", label: "Language & Localization", emoji: "🌍", icon: Globe },
  { id: "ai", label: "AI Writing Engine", emoji: "🧠", icon: Brain },
  { id: "author", label: "Author Identity", emoji: "👤", icon: UserRound },
  { id: "billing", label: "Credits & Billing", emoji: "💳", icon: CreditCard },
  { id: "export", label: "Export & Publishing", emoji: "📚", icon: BookOpen },
  { id: "privacy", label: "Privacy & Backup", emoji: "☁️", icon: Cloud },
  { id: "advanced", label: "Advanced / Developer", emoji: "🛠", icon: Wrench },
];

export interface ScriptoraSettingsHubProps {
  open: boolean;
  onClose: () => void;
  onOpenAppearance?: () => void;
  onOpenAuthorIdentity?: () => void;
  onOpenUsage?: () => void;
}

export function ScriptoraSettingsHub({
  open,
  onClose,
  onOpenAppearance,
  onOpenAuthorIdentity,
  onOpenUsage,
}: ScriptoraSettingsHubProps) {
  useUILanguage();
  const { plan } = usePlan();
  const devMode = isDevMode();
  const [active, setActive] = useState<CategoryId>("workspace");
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState(getSettingsSnapshot);
  const [hub, setHub] = useState<ScriptoraHubPreferences>(() => loadHubPreferences());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const author = getSelectedAuthorIdentity();

  const refresh = () => {
    setSnapshot(getSettingsSnapshot());
    setHub(loadHubPreferences());
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    const onChange = () => refresh();
    window.addEventListener("scriptora-settings-hub-change", onChange);
    window.addEventListener("scriptora-performance-mode-change", onChange);
    window.addEventListener("scriptora-language-change", onChange);
    window.addEventListener("scriptora-credits-change", onChange);
    return () => {
      window.removeEventListener("scriptora-settings-hub-change", onChange);
      window.removeEventListener("scriptora-performance-mode-change", onChange);
      window.removeEventListener("scriptora-language-change", onChange);
      window.removeEventListener("scriptora-credits-change", onChange);
    };
  }, [open]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q));
  }, [query]);

  const patchHub = (patch: Partial<ScriptoraHubPreferences>) => {
    const next = saveHubPreferences(patch);
    setHub(next);
  };

  if (!open) return null;

  const wallet = loadCreditWallet();

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div
        className="scriptora-modal-panel scriptora-settings-hub flex max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-slate-950/95 shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:max-h-[min(92dvh,900px)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 safe-area-pt">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Scriptora OS</p>
            <h2 className="text-lg font-bold text-white sm:text-xl">Settings Hub</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca impostazione…"
              className="w-full rounded-xl border border-white/12 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35 focus:border-sky-400/40 focus:outline-none"
            />
          </label>
        </div>

        <div className="scriptora-modal-body flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <aside className="shrink-0 overflow-x-auto border-b border-white/10 lg:w-56 lg:border-b-0 lg:border-r">
            <nav className="flex gap-1 p-2 lg:flex-col lg:overflow-y-auto lg:p-3">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const selected = active === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActive(cat.id);
                      if (cat.id === "advanced") setAdvancedOpen(true);
                    }}
                    className={`flex min-w-[148px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors lg:min-w-0 lg:w-full ${
                      selected
                        ? "border border-sky-400/30 bg-sky-400/12 text-sky-100"
                        : "border border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{cat.emoji} {cat.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="scriptora-settings-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5 safe-area-pb">
            {active === "workspace" && (
              <Section title="Workspace Experience" subtitle="Prestazioni, focus e fluidità dell'OS.">
                <PresetRow
                  label="Performance Mode"
                  options={[
                    { id: "premium", label: "Qualità massima" },
                    { id: "balanced", label: "Bilanciata" },
                    { id: "performance", label: "Prestazioni massime" },
                  ]}
                  value={snapshot.visualPreset}
                  onChange={(id) => setVisualPerformancePreset(id as VisualPerformancePreset)}
                />
                <Toggle label="Riduci animazioni" checked={hub.reduceAnimations} onChange={(v) => patchHub({ reduceAnimations: v })} hint="Meno motion per dispositivi lenti." />
                <Toggle label="Auto save" checked={hub.autoSave} onChange={(v) => patchHub({ autoSave: v })} hint="I progetti vengono salvati automaticamente durante la scrittura." />
                <Toggle label="Focus writing mode" checked={hub.focusWritingMode} onChange={(v) => patchHub({ focusWritingMode: v })} hint="Riduce distrazioni nell'editor." />
                <Toggle label="Smart cache" checked={hub.smartCache} onChange={(v) => patchHub({ smartCache: v })} hint="Mantiene cache locale per sessioni più fluide." />
                <Toggle label="Smooth transitions" checked={hub.smoothTransitions} onChange={(v) => patchHub({ smoothTransitions: v })} />
                <Toggle label="Streaming preview" checked={hub.preferStreamingPreview} onChange={(v) => patchHub({ preferStreamingPreview: v })} hint="Preferenza UI per anteprima in streaming." />
                <Toggle label="Launchpad avanzato" checked={snapshot.advancedLaunchpad} onChange={setAdvancedLaunchpadEnabled} hint="Mostra strumenti OS secondari nella Home." />
              </Section>
            )}

            {active === "theme" && (
              <Section title="Theme & Atmosphere" subtitle="Atmosfera editoriale — collegato a Appearance OS.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {THEME_QUICK_PICKS.map((pick) => (
                    <button
                      key={pick.id}
                      type="button"
                      onClick={() => {
                        setThemeBackground(pick.backgroundId);
                        refresh();
                      }}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        snapshot.appearance.backgroundId === pick.backgroundId
                          ? "border-sky-400/35 bg-sky-400/10"
                          : "border-white/12 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <span className="text-sm font-semibold text-white">{pick.emoji} {pick.label}</span>
                      <p className="mt-1 text-[11px] text-white/55">{snapshot.activeBackground?.id === pick.backgroundId ? "Attivo ora" : "Applica tema"}</p>
                    </button>
                  ))}
                </div>
                <Slider label="Atmosphere intensity" value={hub.atmosphereIntensity} onChange={(v) => patchHub({ atmosphereIntensity: v })} />
                <Slider label="Glow level" value={hub.glowLevel} onChange={(v) => patchHub({ glowLevel: v })} />
                <Slider label="Texture intensity" value={hub.textureIntensity} onChange={(v) => patchHub({ textureIntensity: v })} />
                <Toggle label="Dynamic background" checked={hub.dynamicBackground} onChange={(v) => patchHub({ dynamicBackground: v })} />
                <Toggle label="Cinematic mode" checked={hub.cinematicMode} onChange={(v) => patchHub({ cinematicMode: v })} />
                {onOpenAppearance && (
                  <ActionButton label="Apri editor atmosfera completo" onClick={() => { onOpenAppearance(); onClose(); }} />
                )}
              </Section>
            )}

            {active === "writing" && (
              <Section title="Writing Experience" subtitle="Font, spaziatura e comfort di scrittura.">
                <div className="grid grid-cols-2 gap-2">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.value}
                      type="button"
                      onClick={() => {
                        setWritingPreferences({ ...snapshot.writing, fontFamily: font.value });
                        refresh();
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs ${
                        snapshot.writing.fontFamily === font.value
                          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-100"
                          : "border-white/12 text-white/75 hover:bg-white/5"
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
                <Slider
                  label="Font size"
                  value={snapshot.writing.fontSize}
                  min={12}
                  max={24}
                  onChange={(v) => {
                    setWritingPreferences({ ...snapshot.writing, fontSize: v });
                    refresh();
                  }}
                />
                <Slider
                  label="Line spacing"
                  value={Math.round(snapshot.writing.lineSpacing * 10)}
                  min={12}
                  max={30}
                  onChange={(v) => {
                    setWritingPreferences({ ...snapshot.writing, lineSpacing: v / 10 });
                    refresh();
                  }}
                />
                <PresetRow
                  label="Editor width"
                  options={[
                    { id: "narrow", label: "Stretto" },
                    { id: "medium", label: "Medio" },
                    { id: "wide", label: "Ampio" },
                  ]}
                  value={hub.editorWidth}
                  onChange={(id) => patchHub({ editorWidth: id as ScriptoraHubPreferences["editorWidth"] })}
                />
                <div className="grid grid-cols-2 gap-2">
                  {WRITING_FONTS.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => {
                        setThemeWritingFont(font.id);
                        refresh();
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs ${
                        snapshot.appearance.writingFont === font.id
                          ? "border-sky-400/35 bg-sky-400/10"
                          : "border-white/12 text-white/75"
                      }`}
                      style={{ fontFamily: font.css }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
                <Toggle label="Focus paragraph" checked={hub.focusParagraph} onChange={(v) => patchHub({ focusParagraph: v })} />
                <Toggle label="Typewriter mode" checked={hub.typewriterMode} onChange={(v) => patchHub({ typewriterMode: v })} />
                <Toggle label="Smooth scroll" checked={hub.smoothScroll} onChange={(v) => patchHub({ smoothScroll: v })} />
              </Section>
            )}

            {active === "language" && (
              <Section title="Language & Localization" subtitle="Lingua interfaccia — diagnostica e report seguono questa scelta.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {UI_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        setUiLanguage(lang.value);
                        refresh();
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                        snapshot.uiLanguage === lang.value
                          ? "border-sky-400/35 bg-sky-400/12 text-sky-100"
                          : "border-white/12 text-white/75 hover:bg-white/5"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/50">
                  La lingua del libro resta separata. UI, etichette e copy dell&apos;app seguono la selezione qui.
                </p>
              </Section>
            )}

            {active === "ai" && (
              <Section title="AI Writing Engine" subtitle="Layer configurabili — non modificano il generation engine core.">
                <Toggle label="Humanizer Layer" checked={snapshot.humanizer} onChange={setHumanizerLayerEnabled} hint="Narrative humanization attiva." />
                <PresetRow
                  label="Humanizer intensity"
                  options={[
                    { id: "light", label: "Light" },
                    { id: "balanced", label: "Balanced" },
                    { id: "deep", label: "Deep" },
                  ]}
                  value={hub.humanizerIntensity}
                  onChange={(id) => patchHub({ humanizerIntensity: id as ScriptoraHubPreferences["humanizerIntensity"] })}
                />
                <Toggle label="Genre Brain" checked={snapshot.genreBrain} onChange={setGenreBrainEnabled} />
                <Toggle label="Story Bible Lock" checked={snapshot.storyBibleLock} onChange={setStoryBibleLockEnabled} />
                <Toggle label="Slow burn protection" checked={hub.slowBurnProtection} onChange={(v) => patchHub({ slowBurnProtection: v })} />
                <Toggle label="Emotional realism" checked={hub.emotionalRealism} onChange={(v) => patchHub({ emotionalRealism: v })} />
                <Toggle label="Show don't tell" checked={hub.showDontTell} onChange={(v) => patchHub({ showDontTell: v })} />
                <Slider label="Creativity vs consistency" value={hub.creativityVsConsistency} onChange={(v) => patchHub({ creativityVsConsistency: v })} />
                <Toggle label="Preserve author voice" checked={hub.preserveAuthorVoice} onChange={(v) => patchHub({ preserveAuthorVoice: v })} />
                <Toggle label="Narrative tension" checked={hub.narrativeTension} onChange={(v) => patchHub({ narrativeTension: v })} />
                <p className="text-[11px] text-amber-200/70">
                  Le preferenze AI avanzate (intensità, slow burn, tension) sono salvate come config layer. I toggle engine wired: Humanizer, Genre Brain, Story Bible Lock.
                </p>
              </Section>
            )}

            {active === "author" && (
              <Section title="Author Identity" subtitle="Branding autore per front matter, export e voce editoriale.">
                <div className="rounded-xl border border-white/12 bg-white/5 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-white">
                    {isUserAuthorIdentityConfigured(author) ? "✓ Identità attiva" : "⚠ Non configurata"}
                  </p>
                  <p className="text-white/70"><span className="text-white/45">Nome:</span> {author.name || "—"}</p>
                  <p className="text-white/70"><span className="text-white/45">Pseudonimo:</span> {author.penName || "—"}</p>
                  <p className="line-clamp-3 text-white/70"><span className="text-white/45">Bio:</span> {author.biography || "—"}</p>
                  <p className="line-clamp-2 text-white/70"><span className="text-white/45">Stile:</span> {author.voice || "—"}</p>
                </div>
                {onOpenAuthorIdentity && (
                  <ActionButton label="Apri editor completo" onClick={() => { onOpenAuthorIdentity(); onClose(); }} />
                )}
              </Section>
            )}

            {active === "billing" && (
              <Section title="Credits & Billing" subtitle="Wallet, piano e acquisto crediti.">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">Saldo wallet</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">{formatCredits(wallet.balance)}</p>
                  <p className="mt-1 text-xs text-white/60">Piano: {plan} · Wallet plan: {wallet.planId}</p>
                </div>
                {onOpenUsage && (
                  <ActionButton label="Acquista crediti e storico utilizzo" onClick={() => { onOpenUsage(); onClose(); }} />
                )}
                {devMode && !import.meta.env.PROD && (
                  <Toggle
                    label="DEV SIMULATION"
                    checked={isDevUnlimitedCredits()}
                    onChange={setDevUnlimitedCredits}
                    hint="Solo Dev Mode. Crediti simulati quando attivo."
                  />
                )}
              </Section>
            )}

            {active === "export" && (
              <Section title="Export & Publishing" subtitle="Preferenze export — formato default salvato localmente.">
                <PresetRow
                  label="Formato default"
                  options={[
                    { id: "epub", label: "EPUB" },
                    { id: "pdf", label: "PDF" },
                    { id: "docx", label: "DOCX" },
                    { id: "kdp", label: "KDP optimized" },
                  ]}
                  value={hub.defaultExportFormat}
                  onChange={(id) => patchHub({ defaultExportFormat: id as ScriptoraHubPreferences["defaultExportFormat"] })}
                />
                <Toggle label="Auto front matter" checked={hub.autoFrontMatter} onChange={(v) => patchHub({ autoFrontMatter: v })} />
                <Toggle label="Author signature in export" checked={hub.authorSignatureInExport} onChange={(v) => patchHub({ authorSignatureInExport: v })} />
                <p className="text-[11px] text-white/50">Il formato default sarà usato come preselezione in Export Studio (collegamento progressivo).</p>
              </Section>
            )}

            {active === "privacy" && (
              <Section title="Privacy & Backup" subtitle="Cache, preferenze e ripristino.">
                <ActionButton
                  label="Pulisci cache non essenziale"
                  onClick={() => {
                    const removed = clearNonEssentialCaches();
                    toast.success(removed.length ? `Cache pulita (${removed.length} voci)` : "Nessuna cache da pulire");
                    refresh();
                  }}
                />
                <ActionButton
                  label="Ripristina preferenze hub"
                  onClick={() => {
                    restoreHubPreferencesDefaults();
                    refresh();
                    toast.message("Preferenze hub ripristinate");
                  }}
                />
                <p className="text-[11px] text-white/50">
                  I progetti e il wallet non vengono toccati. Sync cloud segue Supabase/auth esistente.
                </p>
              </Section>
            )}

            {active === "advanced" && (
              <Section title="Advanced / Developer" subtitle="Strumenti sotto il cofano — collassati per utenti normali.">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white"
                >
                  <span>Mostra opzioni avanzate</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-90" : ""}`} />
                </button>
                {advancedOpen && (
                  <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                    <InfoRow label="Build" value={import.meta.env.MODE} />
                    <InfoRow label="App version" value="Scriptora OS" />
                    <InfoRow label="Verbose logs" value={localStorage.getItem("scriptora-verbose") === "1" ? "ON" : "OFF"} />
                    <ActionButton
                      label={localStorage.getItem("scriptora-verbose") === "1" ? "Disattiva debug overlay" : "Attiva debug overlay"}
                      onClick={() => {
                        const on = localStorage.getItem("scriptora-verbose") === "1";
                        localStorage.setItem("scriptora-verbose", on ? "0" : "1");
                        refresh();
                        toast.message(on ? "Debug overlay off" : "Debug overlay on");
                      }}
                    />
                    {devMode && <InfoRow label="Dev Mode" value="ATTIVO" />}
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-white/55">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-white/50">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-sky-400" />
    </label>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="tabular-nums text-white/60">{value}{max === 100 && min === 0 ? "%" : ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-400"
      />
    </label>
  );
}

function PresetRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="mb-2 text-sm font-medium text-white">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              value === opt.id
                ? "border-sky-400/35 bg-sky-400/12 text-sky-100"
                : "border-white/12 text-white/70 hover:bg-white/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-between rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 hover:bg-sky-400/16"
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 opacity-70" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className="font-mono text-white/80">{value}</span>
    </div>
  );
}
