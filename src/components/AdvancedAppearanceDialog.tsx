import { useEffect, useState } from "react";
import { Settings, X, Check, Languages, Type, Image as ImageIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  SCRIPTORA_BACKGROUNDS,
  WRITING_FONTS,
  loadScriptoraAppearance,
  saveScriptoraAppearance,
  type ScriptoraBackgroundId,
  type ScriptoraWritingFont,
} from "@/lib/scriptora-appearance";
import { getUILanguage, setUILanguage, t, UI_LANGUAGES, useUILanguage, type UILanguage } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onLanguageChanged?: () => void;
}

function normalizeLanguageOption(option: any): { value: UILanguage; label: string } {
  if (typeof option === "string") return { value: option as UILanguage, label: option };

  return {
    value: String(option?.value ?? option?.code ?? option?.id ?? "it") as UILanguage,
    label: String(option?.label ?? option?.name ?? option?.value ?? "Italiano"),
  };
}

export function AdvancedAppearanceDialog({ open, onClose, onLanguageChanged }: Props) {
  useUILanguage();
  const [backgroundId, setBackgroundId] = useState<ScriptoraBackgroundId>("midnight-ink");
  const [writingFont, setWritingFont] = useState<ScriptoraWritingFont>("system");
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(getUILanguage());

  useEffect(() => {
    if (!open) return;
    const saved = loadScriptoraAppearance();
    setBackgroundId(saved.backgroundId);
    setWritingFont(saved.writingFont);
    setUiLanguage(getUILanguage());
  }, [open]);

  if (!open) return null;

  const applyBackground = (id: ScriptoraBackgroundId) => {
    setBackgroundId(id);
    saveScriptoraAppearance({ backgroundId: id, writingFont });
    window.dispatchEvent(new Event("scriptora-appearance-change"));
    toast.success(t("toast_background_saved"));
  };

  const applyFont = (id: ScriptoraWritingFont) => {
    setWritingFont(id);
    saveScriptoraAppearance({ backgroundId, writingFont: id });
    window.dispatchEvent(new Event("scriptora-appearance-change"));
    toast.success(t("toast_font_saved"));
  };

  const applyLanguage = (lang: UILanguage) => {
    setUiLanguage(lang);
    setUILanguage(lang);
    onLanguageChanged?.();
    toast.success(t("toast_language_saved"));
  };

  const finish = () => {
    saveScriptoraAppearance({ backgroundId, writingFont });
    setUILanguage(uiLanguage);
    onLanguageChanged?.();
    window.dispatchEvent(new Event("scriptora-appearance-change"));
    toast.success(t("toast_settings_applied"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t("advanced_settings_title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("advanced_settings_desc")}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <section className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{t("app_language")}</h3>
            </div>

            <p className="mb-3 text-xs text-muted-foreground">
              {t("app_language_desc")}
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {UI_LANGUAGES.map((item: any) => {
                const lang = normalizeLanguageOption(item);
                const active = uiLanguage === lang.value;

                return (
                  <button
                    key={lang.value}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); applyLanguage(lang.value); }}
                    onTouchStart={(e) => { e.preventDefault(); applyLanguage(lang.value); }}
                    onClick={() => applyLanguage(lang.value)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                      active
                        ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3 w-3" />}
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{t("writing_atmospheres")}</h3>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              {t("writing_atmospheres_desc")}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SCRIPTORA_BACKGROUNDS.map((bg) => {
                const active = backgroundId === bg.id;

                return (
                  <button
                    key={bg.id}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); applyBackground(bg.id); }}
                    onTouchStart={(e) => { e.preventDefault(); applyBackground(bg.id); }}
                    onClick={() => applyBackground(bg.id)}
                    className={`group overflow-hidden rounded-3xl border text-left transition-all duration-300 hover:scale-[1.02] ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border/70 hover:border-primary/50"
                    }`}
                  >
                    <div className="h-32 transition-transform duration-500 group-hover:scale-105" style={{ background: bg.css }} />
                    <div className="space-y-1 bg-card/90 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{bg.name}</p>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{bg.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{t("writing_font")}</h3>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {WRITING_FONTS.map((font) => {
                const active = writingFont === font.id;

                return (
                  <button
                    key={font.id}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); applyFont(font.id); }}
                    onTouchStart={(e) => { e.preventDefault(); applyFont(font.id); }}
                    onClick={() => applyFont(font.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active ? "border-primary bg-primary/15 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:border-primary/50"
                    }`}
                    style={{ fontFamily: font.css }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{font.name}</p>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("font_sample")}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              {t("close")}
            </button>

            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); finish(); }}
              onTouchStart={(e) => { e.preventDefault(); finish(); }}
              onClick={finish}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {t("done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
