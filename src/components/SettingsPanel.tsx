import { UILanguage, UI_LANGUAGES, t, setUILanguage, getUILanguage } from "@/lib/i18n";
import { WritingSettings, FONT_OPTIONS } from "@/lib/settings";
import { MobileFullscreenShell } from "@/mobile/MobileFullscreenShell";
import { X, Globe, Type } from "lucide-react";
import type { ReactNode } from "react";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: WritingSettings;
  onUpdateSettings: (s: WritingSettings) => void;
  onLanguageChange: (lang: UILanguage) => void;
  variant?: "dialog" | "mobile";
}

function SettingsPanelBody({
  settings,
  onUpdateSettings,
  onLanguageChange,
}: Pick<SettingsPanelProps, "settings" | "onUpdateSettings" | "onLanguageChange">) {
  const uiLang = getUILanguage();

  return (
    <div className="space-y-6 p-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("interface_language")}
          </label>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {UI_LANGUAGES.map((l) => (
            <button
              key={l.value}
              onClick={() => {
                setUILanguage(l.value);
                onLanguageChange(l.value);
              }}
              className={`rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                uiLang === l.value
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "border border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-primary" />
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("font")}
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onUpdateSettings({ ...settings, fontFamily: f.value })}
              className={`rounded-lg px-3 py-2.5 text-left text-xs transition-all ${
                settings.fontFamily === f.value
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "border border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("font_size")}
          </label>
          <span className="font-mono text-xs text-foreground">{settings.fontSize}px</span>
        </div>
        <input
          type="range"
          min={12}
          max={24}
          step={1}
          value={settings.fontSize}
          onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
          className="w-full accent-[hsl(var(--primary))]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("line_spacing")}
          </label>
          <span className="font-mono text-xs text-foreground">{settings.lineSpacing.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={1.2}
          max={3}
          step={0.1}
          value={settings.lineSpacing}
          onChange={(e) => onUpdateSettings({ ...settings, lineSpacing: parseFloat(e.target.value) })}
          className="w-full accent-[hsl(var(--primary))]"
        />
      </div>
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  onUpdateSettings,
  onLanguageChange,
  variant = "dialog",
}: SettingsPanelProps) {
  if (!open) return null;

  if (variant === "mobile") {
    return (
      <MobileSettingsShell onClose={onClose}>
        <SettingsPanelBody
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onLanguageChange={onLanguageChange}
        />
      </MobileSettingsShell>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("settings")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <SettingsPanelBody
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onLanguageChange={onLanguageChange}
        />
      </div>
    </div>
  );
}

function MobileSettingsShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <MobileFullscreenShell title={t("settings")} subtitle="Lingua · Font · Spaziatura" onClose={onClose}>
      <div className="scriptora-mobile-enter text-foreground">{children}</div>
    </MobileFullscreenShell>
  );
}
