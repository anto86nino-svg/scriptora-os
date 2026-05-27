import { useEffect, useState } from "react";
import { UILanguage, UI_LANGUAGES, t, setUILanguage, getUILanguage } from "@/lib/i18n";
import { WritingSettings, FONT_OPTIONS } from "@/lib/settings";
import { X, Globe, Type, HelpCircle } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: WritingSettings;
  onUpdateSettings: (s: WritingSettings) => void;
  onLanguageChange: (lang: UILanguage) => void;
}

export function SettingsPanel({ open, onClose, settings, onUpdateSettings, onLanguageChange }: SettingsPanelProps) {
  if (!open) return null;

  const uiLang = getUILanguage();
  const [guideEnabled, setGuideEnabled] = useState(() => localStorage.getItem("scriptora-guided-flow") === "on");

  useEffect(() => {
    const syncGuideToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") setGuideEnabled(detail.enabled);
    };

    window.addEventListener("scriptora-guided-flow-change", syncGuideToggle as EventListener);
    return () => window.removeEventListener("scriptora-guided-flow-change", syncGuideToggle as EventListener);
  }, []);

  const toggleGuide = () => {
    const next = !guideEnabled;
    localStorage.setItem("scriptora-guided-flow", next ? "on" : "off");
    setGuideEnabled(next);
    window.dispatchEvent(new CustomEvent("scriptora-guided-flow-change", { detail: { enabled: next, resetCollapsed: next } }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("settings")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Interface Language */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("interface_language")}</label>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {UI_LANGUAGES.map(l => (
                <button key={l.value} onClick={() => { setUILanguage(l.value); onLanguageChange(l.value); }}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    uiLang === l.value ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-3.5 w-3.5 text-primary" />
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("font")}</label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_OPTIONS.map(f => (
                <button key={f.value} onClick={() => onUpdateSettings({ ...settings, fontFamily: f.value })}
                  className={`px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                    settings.fontFamily === f.value ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                  }`}
                  style={{ fontFamily: f.value }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("font_size")}</label>
              <span className="text-xs text-foreground font-mono">{settings.fontSize}px</span>
            </div>
            <input type="range" min={12} max={24} step={1} value={settings.fontSize}
              onChange={e => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
              className="w-full accent-[hsl(var(--primary))]" />
          </div>

          {/* Line Spacing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("line_spacing")}</label>
              <span className="text-xs text-foreground font-mono">{settings.lineSpacing.toFixed(1)}×</span>
            </div>
            <input type="range" min={1.2} max={3} step={0.1} value={settings.lineSpacing}
              onChange={e => onUpdateSettings({ ...settings, lineSpacing: parseFloat(e.target.value) })}
              className="w-full accent-[hsl(var(--primary))]" />
          </div>

          {/* Scriptora Guide */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Guida Scriptora</label>
            </div>
            <p className="text-sm text-foreground/80 mb-3">Mostra istruzioni step-by-step dentro le funzioni di Scriptora.</p>
            <button
              type="button"
              onClick={toggleGuide}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${guideEnabled ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"}`}
              aria-pressed={guideEnabled}
            >
              Guida step-by-step: {guideEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
