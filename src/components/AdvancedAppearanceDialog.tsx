import { useEffect, useRef, useState } from "react";
import { Settings, X, Check, Languages, Type, Image as ImageIcon, Save, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  SCRIPTORA_BACKGROUNDS,
  SCRIPTORA_THEME_GROUPS,
  WRITING_FONTS,
  loadScriptoraAppearance,
  saveScriptoraAppearance,
  getCustomScriptoraBackground,
  saveCustomScriptoraBackground,
  removeCustomScriptoraBackground,
  type ScriptoraBackgroundId,
  type ScriptoraWritingFont,
  type ScriptoraThemeCategory,
} from "@/lib/scriptora-appearance";
import { getUILanguage, setUILanguage, t, UI_LANGUAGES, useUILanguage, type UILanguage } from "@/lib/i18n";
import {
  loadVisualPreset,
  saveVisualPreset,
  type VisualPerformancePreset,
} from "@/lib/performance-mode";

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

async function compressImageToDataUrl(file: File): Promise<string> {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = objectUrl;
  });

  const maxWidth = 1920;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Canvas not supported");
  }

  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(objectUrl);

  return canvas.toDataURL("image/webp", 0.82);
}

export function AdvancedAppearanceDialog({ open, onClose, onLanguageChanged }: Props) {
  useUILanguage();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [backgroundId, setBackgroundId] = useState<ScriptoraBackgroundId>("clean-pro");
  const [writingFont, setWritingFont] = useState<ScriptoraWritingFont>("system");
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(getUILanguage());
  const [hasCustomBackground, setHasCustomBackground] = useState(false);
  const [isUploadingCustomBackground, setIsUploadingCustomBackground] = useState(false);
  const [visualPreset, setVisualPreset] =
    useState<VisualPerformancePreset>(loadVisualPreset());

  useEffect(() => {
    if (!open) return;

    const saved = loadScriptoraAppearance();

    setBackgroundId(saved.backgroundId);
    setWritingFont(saved.writingFont);
    setUiLanguage(getUILanguage());
    setHasCustomBackground(Boolean(getCustomScriptoraBackground()));
  }, [open]);

  if (!open) return null;

  const applyBackground = (id: ScriptoraBackgroundId) => {
    if (id === "custom-personal" && !getCustomScriptoraBackground()) {
      toast.error("Carica prima una tua immagine personale.");
      return;
    }

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

  const handleCustomBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Carica un file immagine valido.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingCustomBackground(true);

      const dataUrl = await compressImageToDataUrl(file);

      saveCustomScriptoraBackground(dataUrl);
      setHasCustomBackground(true);

      setBackgroundId("custom-personal");
      saveScriptoraAppearance({ backgroundId: "custom-personal", writingFont });

      window.dispatchEvent(new Event("scriptora-appearance-change"));
      toast.success("Sfondo personale salvato.");
    } catch {
      toast.error("Non sono riuscito a caricare lo sfondo.");
    } finally {
      setIsUploadingCustomBackground(false);
      event.target.value = "";
    }
  };

  const removePersonalBackground = () => {
    removeCustomScriptoraBackground();
    setHasCustomBackground(false);

    if (backgroundId === "custom-personal") {
      setBackgroundId("midnight-ink");
      saveScriptoraAppearance({ backgroundId: "midnight-ink", writingFont });
    }

    window.dispatchEvent(new Event("scriptora-appearance-change"));
    toast.success("Sfondo personale rimosso.");
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

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sfondo personale</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Carica una tua foto: famiglia, mare, scrivania, città o qualsiasi immagine che ti ispira.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleCustomBackgroundUpload}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingCustomBackground}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-foreground hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {isUploadingCustomBackground ? "Caricamento..." : "Carica immagine"}
                  </button>

                  {hasCustomBackground && (
                    <button
                      type="button"
                      onClick={() => applyBackground("custom-personal")}
                      className="inline-flex items-center rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/25"
                    >
                      <Check className="mr-2 h-3.5 w-3.5" />
                      Usa sfondo personale
                    </button>
                  )}

                  {hasCustomBackground && (
                    <button
                      type="button"
                      onClick={removePersonalBackground}
                      className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {SCRIPTORA_THEME_GROUPS.map((group) => {
                const groupBgs = SCRIPTORA_BACKGROUNDS.filter((b) => b.category === group.category);
                if (groupBgs.length === 0) return null;
                const isPremiumPack = ["horror-crime", "dark-romance", "fantasy", "scifi", "classic-premium"].includes(group.category);

                return (
                  <div key={group.category}>
                    {/* Group header */}
                    <div className={`mb-3 flex items-start gap-3 rounded-xl px-3 py-2 ${isPremiumPack ? "border border-white/8 bg-white/[0.03]" : ""}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isPremiumPack && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                              Theme
                            </span>
                          )}
                          <h4 className={`font-semibold ${isPremiumPack ? "text-foreground" : "text-muted-foreground"}`}>
                            {group.label}
                          </h4>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{group.subtitle}</p>
                      </div>
                    </div>

                    {/* Backgrounds in this group */}
                    <div className={`grid gap-3 ${isPremiumPack ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"}`}>
                      {groupBgs.map((bg) => {
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
                            <div className={`transition-transform duration-500 group-hover:scale-105 ${isPremiumPack ? "h-40" : "h-32"}`} style={{ background: bg.css }} />
                            <div className="space-y-1 bg-card/90 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">{bg.name}</p>
                                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                              </div>
                              <p className="text-xs text-muted-foreground">{bg.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3">
              <h3 className="font-semibold">Prestazioni dispositivo</h3>
              <p className="text-sm text-muted-foreground">
                Controlla qualità grafica, animazioni ed effetti visivi.
              </p>
            </div>

            <div className="grid gap-2">
              {[
                {
                  id: "premium",
                  label: "Qualità Massima",
                  description: "Massima immersione visiva e atmosfera."
                },
                {
                  id: "balanced",
                  label: "Bilanciata",
                  description: "Equilibrio tra qualità e fluidità."
                },
                {
                  id: "performance",
                  label: "Prestazioni Massime",
                  description: "Massima velocità e minore uso di risorse."
                }
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    saveVisualPreset(
                      preset.id as VisualPerformancePreset
                    );
                    setVisualPreset(
                      preset.id as VisualPerformancePreset
                    );
                  }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    visualPreset === preset.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{preset.label}</span>
                    {visualPreset === preset.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
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