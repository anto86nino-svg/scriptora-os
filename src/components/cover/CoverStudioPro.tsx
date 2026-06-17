import { useMemo, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Layers,
  Trash2, Type, ImagePlus, Download, Sparkles, AlertTriangle, Check, Eye, EyeOff, Lock, Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoverStudioPackage } from "@/lib/cover-studio";
import { assessCoverReadinessPro } from "@/lib/cover-studio/cover-readiness-pro";
import {
  COVER_BACKGROUND_CATEGORIES,
  COVER_BACKGROUND_PRESETS,
  filterBackgrounds,
  type CoverBackgroundCategory,
} from "@/lib/cover-studio/cover-backgrounds";
import {
  COVER_STICKER_PRESETS,
  STICKER_CATEGORIES,
  filterStickers,
} from "@/lib/cover-studio/cover-stickers";
import {
  applyTextPositionPreset,
  createStickerLayer,
  duplicateLayer,
  quickPosition,
  removeLayer,
  reorderLayer,
  updateLayer,
  type CoverComposition,
  type CoverLayer,
  type TextPositionPreset,
} from "@/lib/cover-studio/cover-layers";
import {
  applyCompositionLayoutPreset,
  COMPOSITION_LAYOUT_PRESETS,
  getLayerDisplayName,
  toggleLayerLock,
  toggleLayerVisibility,
  type CompositionLayoutPreset,
} from "@/lib/cover-studio/cover-composition-utils";
import { assessPrintCompatibility } from "@/lib/cover-studio/cover-print-check";
import { COVER_VIEW_MODES, type CoverViewMode } from "@/lib/cover-studio/cover-view-modes";

import { CoverStickerSvg } from "@/components/cover/CoverStickerSvg";
import { EFFECT_CONTROLS } from "@/lib/cover-studio/cover-effects";
import { sanitizeCoverVisibleText } from "@/lib/cover-studio/cover-text-sanitize";
import {
  applyVisualIntensity,
  VISUAL_INTENSITY_OPTIONS,
} from "@/lib/cover-studio/cover-visual-intensity";

interface Props {
  pkg: CoverStudioPackage;
  italianUi: boolean;
  composition: CoverComposition;
  onCompositionChange: (next: CoverComposition) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  genre?: string;
  selectedTemplateId: string;
  onSelectVariant: (templateIndex: number, templateId: string) => void;
  onSaveProject?: () => void;
  onOpenExport?: () => void;
  saved: boolean;
  coverTitle: string;
  coverSubtitle: string;
  coverAuthor: string;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  backTagline?: string;
  backBlurb?: string;
  backBio?: string;
  backQuote?: string;
  onBackTaglineChange?: (value: string) => void;
  onBackBlurbChange?: (value: string) => void;
  onBackBioChange?: (value: string) => void;
  onBackQuoteChange?: (value: string) => void;
  onUploadBackImage?: (file: File) => void;
  onUploadFrontImage?: (file: File | undefined) => void;
  onRemoveFrontImage?: () => void;
  onRemoveBackImage?: () => void;
  hasFrontImage?: boolean;
  hasBackImage?: boolean;
  imageFit?: "cover" | "contain" | "soft";
  onImageFitChange?: (fit: "cover" | "contain" | "soft") => void;
  isPrintMode?: boolean;
  spineWidthIn?: number;
  pageCount?: number;
  hasAuthorPhoto?: boolean;
  /** Mobile: show only one tab panel (parent owns bottom nav) */
  mobileTabFilter?: "style" | "text" | "images" | "layers" | "stickers" | "effects" | "print" | "readiness" | null;
  hideHeader?: boolean;
  onTextFieldFocus?: (field: "title" | "subtitle" | "author") => void;
  onTextFieldBlur?: () => void;
}

const TEXT_PRESETS: { id: TextPositionPreset; label: string }[] = [
  { id: "classic", label: "Layout classico" },
  { id: "thriller", label: "Layout thriller" },
  { id: "romance", label: "Layout romance" },
  { id: "nonfiction", label: "Layout nonfiction" },
  { id: "study", label: "Layout study/workbook" },
  { id: "title-top", label: "Titolo alto" },
  { id: "title-center", label: "Titolo centro" },
  { id: "title-bottom", label: "Titolo basso" },
  { id: "author-bottom", label: "Autore basso" },
];

export function CoverStudioPro({
  pkg,
  italianUi,
  composition,
  onCompositionChange,
  selectedLayerId,
  onSelectLayer,
  genre,
  selectedTemplateId,
  onSelectVariant,
  onSaveProject,
  onOpenExport,
  saved,
  coverTitle,
  coverSubtitle,
  coverAuthor,
  onTitleChange,
  onSubtitleChange,
  onAuthorChange,
  backTagline = "",
  backBlurb = "",
  backBio = "",
  backQuote = "",
  onBackTaglineChange,
  onBackBlurbChange,
  onBackBioChange,
  onBackQuoteChange,
  onUploadBackImage,
  onUploadFrontImage,
  onRemoveFrontImage,
  onRemoveBackImage,
  hasFrontImage = false,
  hasBackImage = false,
  imageFit = "cover",
  onImageFitChange,
  isPrintMode = false,
  spineWidthIn = 0.5,
  pageCount = 260,
  hasAuthorPhoto = false,
  mobileTabFilter = null,
  hideHeader = false,
  onTextFieldFocus,
  onTextFieldBlur,
}: Props) {
  const [bgCategory, setBgCategory] = useState<CoverBackgroundCategory | "all">("all");
  const [stickerCategory, setStickerCategory] = useState("Tutti");

  const readinessPro = useMemo(
    () => assessCoverReadinessPro(composition, pkg.score, genre ?? pkg.brief.genre, italianUi),
    [composition, pkg.score, genre, pkg.brief.genre, italianUi],
  );

  const printCheck = useMemo(
    () =>
      assessPrintCompatibility({
        composition,
        score: pkg.score,
        genre: genre ?? pkg.brief.genre,
        spineWidthIn,
        pageCount,
        italian: italianUi,
      }),
    [composition, pkg.score, genre, pkg.brief.genre, spineWidthIn, pageCount, italianUi],
  );

  const selectedLayer = (composition.layers || []).find((l) => l.id === selectedLayerId) ?? null;
  const backgrounds = useMemo(() => filterBackgrounds(bgCategory, genre), [bgCategory, genre]);
  const stickers = useMemo(() => filterStickers(stickerCategory), [stickerCategory]);

  const patch = (fn: (c: CoverComposition) => CoverComposition) => {
    onCompositionChange(fn({ ...composition, updatedAt: new Date().toISOString() }));
  };

  const patchLayer = (id: string, layerPatch: Partial<CoverLayer>) => {
    patch((c) => ({ ...c, layers: updateLayer(c.layers, id, layerPatch) }));
  };

  const patchEffects = (key: keyof CoverComposition["effects"], value: number) => {
    patch((c) => ({ ...c, effects: { ...c.effects, [key]: value } }));
  };

  const mobileSingleTab = mobileTabFilter ?? null;
  const defaultTab = mobileSingleTab ?? "style";

  return (
    <div className="cover-studio-pro w-full min-w-0 max-w-full overflow-x-hidden">
      {!hideHeader && (
      <div className="mb-3 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Cover Studio Pro</h3>
          <Badge variant="outline" className="text-[9px]">Concept cover digitale</Badge>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {italianUi
            ? "Builder copertina digitale — trascina elementi sulla preview, pronta per anteprima store."
            : "Digital cover builder — drag elements on preview, store-preview ready."}
        </p>
      </div>
      )}

      <Tabs defaultValue={defaultTab} value={mobileSingleTab ?? undefined} className="w-full min-w-0">
        {!mobileSingleTab && (
        <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-0.5 overflow-x-auto bg-muted/40 p-1 [-webkit-overflow-scrolling:touch]">
          {(["style", "text", "images", "layers", "stickers", "effects", "print", "readiness"] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="shrink-0 px-2.5 py-1.5 text-[10px] sm:text-xs">
              {tab === "style" && (italianUi ? "Stile" : "Style")}
              {tab === "text" && "Testo"}
              {tab === "images" && (italianUi ? "Immagini" : "Images")}
              {tab === "layers" && "Layer"}
              {tab === "stickers" && "Sticker"}
              {tab === "effects" && (italianUi ? "Effetti" : "Effects")}
              {tab === "print" && (italianUi ? "Stampa" : "Print")}
              {tab === "readiness" && "Readiness"}
            </TabsTrigger>
          ))}
        </TabsList>
        )}

        <TabsContent value="style" className="mt-3 space-y-4 text-xs">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {italianUi ? "Intensità visiva" : "Visual intensity"}
            </p>
            <div className="flex flex-wrap gap-1">
              {VISUAL_INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch((c) => applyVisualIntensity(c, opt.id))}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition ${
                    (composition.visualIntensity ?? "premium") === opt.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {italianUi ? opt.labelIt : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">{pkg.brief.visualPromise}</p>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {italianUi ? "Layout intelligenti" : "Smart layouts"}
            </p>
            <div className="flex flex-wrap gap-1">
              {COMPOSITION_LAYOUT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      italianUi
                        ? "Questo aggiornerà posizione e stile dei layer testuali. Gli sticker esistenti restano. Continuare?"
                        : "This updates text layer positions and styles. Existing stickers stay. Continue?",
                    );
                    if (!ok) return;
                    patch((c) => applyCompositionLayoutPreset(c, p.id as CompositionLayoutPreset));
                  }}
                  className="rounded-lg border border-border/70 px-2 py-1 text-[10px] hover:bg-muted/40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {pkg.variants.map((v) => (
              <button
                key={v.templateId}
                type="button"
                onClick={() => onSelectVariant(v.templateIndex, v.templateId)}
                className={`rounded-xl border p-2.5 text-left transition ${
                  selectedTemplateId === v.templateId ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{v.label}</span>
                  <Badge variant="outline" className="text-[10px]">{v.score}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{v.description}</p>
              </button>
            ))}
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {italianUi ? "Sfondi procedurali" : "Procedural backgrounds"}
            </p>
            <div className="flex flex-wrap gap-1">
              {COVER_BACKGROUND_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setBgCategory(cat.id)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    bgCategory === cat.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  title={bg.name}
                  onClick={() => patch((c) => ({ ...c, backgroundPresetId: bg.id }))}
                  className={`group relative aspect-[2/3] overflow-hidden rounded-lg border transition ${
                    composition.backgroundPresetId === bg.id ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="absolute inset-0" style={bg.previewStyle} />
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[8px] text-white truncate">
                    {bg.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {COVER_BACKGROUND_PRESETS.length} sfondi · {italianUi ? "nessuna immagine remota" : "no remote images"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-3 space-y-3">
          <div className="grid gap-2">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">{italianUi ? "Titolo" : "Title"}</span>
              <input
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                value={coverTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onFocus={() => onTextFieldFocus?.("title")}
                onBlur={() => onTextFieldBlur?.()}
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">{italianUi ? "Sottotitolo" : "Subtitle"}</span>
              <input
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                value={coverSubtitle}
                onChange={(e) => onSubtitleChange(e.target.value)}
                onFocus={() => onTextFieldFocus?.("subtitle")}
                onBlur={() => onTextFieldBlur?.()}
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">{italianUi ? "Autore" : "Author"}</span>
              <input
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                value={coverAuthor}
                onChange={(e) => onAuthorChange(e.target.value)}
                onFocus={() => onTextFieldFocus?.("author")}
                onBlur={() => onTextFieldBlur?.()}
              />
            </label>
          </div>

          {isPrintMode && (
            <div className="space-y-2 rounded-xl border border-border/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {italianUi ? "Testi retro / dorso" : "Back / spine copy"}
              </p>
              {onBackTaglineChange && (
                <label className="block space-y-1">
                  <span className="text-muted-foreground">Tagline / CTA</span>
                  <input className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm" value={backTagline} onChange={(e) => onBackTaglineChange(e.target.value)} />
                </label>
              )}
              {onBackBlurbChange && (
                <label className="block space-y-1">
                  <span className="text-muted-foreground">{italianUi ? "Descrizione libro" : "Book description"}</span>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                    value={backBlurb}
                    onChange={(e) => onBackBlurbChange(e.target.value)}
                    onBlur={(e) => onBackBlurbChange(sanitizeCoverVisibleText(e.target.value, backBlurb))}
                  />
                </label>
              )}
              {onBackBioChange && (
                <label className="block space-y-1">
                  <span className="text-muted-foreground">{italianUi ? "Bio autore" : "Author bio"}</span>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                    value={backBio}
                    onChange={(e) => onBackBioChange(e.target.value)}
                    onBlur={(e) => onBackBioChange(sanitizeCoverVisibleText(e.target.value, backBio))}
                  />
                </label>
              )}
              {onBackQuoteChange && (
                <label className="block space-y-1">
                  <span className="text-muted-foreground">{italianUi ? "Citazione recensione" : "Review quote"}</span>
                  <input className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm" value={backQuote} onChange={(e) => onBackQuoteChange(e.target.value)} />
                </label>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {TEXT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => patch((c) => ({ ...c, layers: applyTextPositionPreset(c.layers, p.id) }))}
                className="rounded-lg border border-border/70 px-2 py-1 text-[10px] hover:bg-muted/40"
              >
                {p.label}
              </button>
            ))}
          </div>

          <LayerPicker
            layers={(composition.layers || []).filter((l) => l.type === "title" || l.type === "subtitle" || l.type === "author")}
            selectedId={selectedLayerId}
            onSelect={onSelectLayer}
            italianUi={italianUi}
          />

          {selectedLayer && ["title", "subtitle", "author", "back-tagline", "back-blurb", "back-bio", "back-quote", "spine-title", "spine-author"].includes(selectedLayer.type) && (
            <TextLayerControls layer={selectedLayer} onChange={(p) => patchLayer(selectedLayer.id, p)} italianUi={italianUi} />
          )}
        </TabsContent>

        <TabsContent value="images" className="mt-3 space-y-3 text-xs">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {italianUi
              ? "Carica immagini dedicate per fronte e retro. In modalità wrap KDP/Lulu ogni immagine resta nel proprio pannello."
              : "Upload dedicated front and back images. In KDP/Lulu wrap mode each image stays on its panel."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border/60 p-3">
              <p className="font-semibold text-foreground">{italianUi ? "Fronte" : "Front cover"}</p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-surface/40 px-3 py-3 text-[11px] font-medium hover:bg-surface/70">
                <ImagePlus className="h-4 w-4" />
                {italianUi ? "Carica immagine fronte" : "Upload front image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onUploadFrontImage?.(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {hasFrontImage && onRemoveFrontImage && (
                <button type="button" onClick={onRemoveFrontImage} className="text-[10px] text-destructive hover:underline">
                  {italianUi ? "Rimuovi immagine fronte" : "Remove front image"}
                </button>
              )}
            </div>
            {isPrintMode && (
              <div className="space-y-2 rounded-xl border border-border/60 p-3">
                <p className="font-semibold text-foreground">{italianUi ? "Retro" : "Back cover"}</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-surface/40 px-3 py-3 text-[11px] font-medium hover:bg-surface/70">
                  <ImagePlus className="h-4 w-4" />
                  {italianUi ? "Carica immagine retro" : "Upload back image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadBackImage?.(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {hasBackImage && onRemoveBackImage && (
                  <button type="button" onClick={onRemoveBackImage} className="text-[10px] text-destructive hover:underline">
                    {italianUi ? "Rimuovi immagine retro" : "Remove back image"}
                  </button>
                )}
              </div>
            )}
          </div>
          {onImageFitChange && (
            <label className="block space-y-1">
              <span className="text-muted-foreground">{italianUi ? "Adattamento immagine" : "Image fit"}</span>
              <select
                value={imageFit}
                onChange={(e) => onImageFitChange(e.target.value as "cover" | "contain" | "soft")}
                className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
              >
                <option value="soft">{italianUi ? "Cover morbida" : "Soft cover"}</option>
                <option value="cover">{italianUi ? "Riempi" : "Fill"}</option>
                <option value="contain">{italianUi ? "Contieni" : "Contain"}</option>
              </select>
            </label>
          )}
        </TabsContent>

        <TabsContent value="layers" className="mt-3 space-y-2">
          <LayerListPanel
            layers={[...composition.layers].sort((a, b) => b.zIndex - a.zIndex)}
            selectedId={selectedLayerId}
            italianUi={italianUi}
            onSelect={onSelectLayer}
            onToggleVisible={(id) => patch((c) => ({ ...c, layers: toggleLayerVisibility(c.layers, id) }))}
            onToggleLock={(id) => patch((c) => ({ ...c, layers: toggleLayerLock(c.layers, id) }))}
            onReorder={(id, dir) => patch((c) => ({ ...c, layers: reorderLayer(c.layers, id, dir) }))}
            onDuplicate={(id) => patch((c) => ({ ...c, layers: duplicateLayer(c.layers, id) }))}
            onDelete={(id) => {
              patch((c) => ({ ...c, layers: removeLayer(c.layers, id) }));
              if (selectedLayerId === id) onSelectLayer(null);
            }}
          />
          {selectedLayer && (
            <p className="text-[10px] text-muted-foreground">
              {italianUi ? "Trascina anche sulla preview oppure usa gli slider nel tab Testo/Sticker." : "Drag on preview or use sliders in Text/Sticker tabs."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="stickers" className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            {STICKER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setStickerCategory(cat)}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                  stickerCategory === cat ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {stickers.map((st) => (
              <button
                key={st.id}
                type="button"
                title={st.name}
                onClick={() => {
                  const layer = createStickerLayer(st.id, st.name);
                  layer.style = { color: st.defaultStyle.color };
                  layer.width = st.defaultStyle.width;
                  layer.height = st.defaultStyle.height;
                  layer.opacity = st.defaultStyle.opacity;
                  layer.rotation = st.defaultStyle.rotation;
                  patch((c) => ({ ...c, layers: [...c.layers, layer] }));
                  onSelectLayer(layer.id);
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-border/60 p-2 hover:border-primary/40 hover:bg-primary/5"
              >
                <CoverStickerSvg symbol={st.symbol} color={st.defaultStyle.color} size={28} />
                <span className="w-full truncate text-center text-[8px] text-muted-foreground">{st.name}</span>
              </button>
            ))}
          </div>

          <LayerPicker
            layers={(composition.layers || []).filter((l) => l.type === "sticker")}
            selectedId={selectedLayerId}
            onSelect={onSelectLayer}
            italianUi={italianUi}
          />

          {selectedLayer?.type === "sticker" && (
            <StickerLayerControls
              layer={selectedLayer}
              onChange={(p) => patchLayer(selectedLayer.id, p)}
              onDuplicate={() => patch((c) => ({ ...c, layers: duplicateLayer(c.layers, selectedLayer.id) }))}
              onDelete={() => {
                patch((c) => ({ ...c, layers: removeLayer(c.layers, selectedLayer.id) }));
                onSelectLayer(null);
              }}
              onReorder={(dir) => patch((c) => ({ ...c, layers: reorderLayer(c.layers, selectedLayer.id, dir) }))}
              italianUi={italianUi}
            />
          )}
        </TabsContent>

        <TabsContent value="effects" className="mt-3 space-y-3">
          {EFFECT_CONTROLS.map(({ key, labelIt, label }) => (
            <label key={key} className="block space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{italianUi ? labelIt : label}</span>
                <span className="tabular-nums font-medium">{composition.effects[key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={composition.effects[key]}
                onChange={(e) => patchEffects(key, Number(e.target.value))}
                className="h-2 w-full accent-primary"
              />
            </label>
          ))}
          {readinessPro.warnings.some((w) => w.includes("leggib") || w.includes("readable") || w.includes("contrasto")) && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {italianUi ? "Il titolo potrebbe essere poco leggibile in miniatura." : "Title may be hard to read at thumbnail size."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="print" className="mt-3 space-y-3 text-xs">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {italianUi
              ? "Modalità libro aperto per KDP/Lulu — fronte, dorso e retro. Da verificare prima di stampa paperback."
              : "Open book mode for KDP/Lulu — front, spine and back. Verify before paperback print."}
          </p>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {italianUi ? "Vista editoriale" : "Editorial view"}
            </p>
            <div className="flex flex-wrap gap-1">
              {COVER_VIEW_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!isPrintMode && m.id !== "front" && m.id !== "thumbnail"}
                  onClick={() => patch((c) => ({ ...c, viewMode: m.id as CoverViewMode }))}
                  className={`rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40 ${
                    (composition.viewMode ?? "front") === m.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/70 hover:bg-muted/40"
                  }`}
                >
                  {italianUi ? m.labelIt : m.labelEn}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={composition.wrapLabels !== false}
              onChange={(e) => patch((c) => ({ ...c, wrapLabels: e.target.checked }))}
            />
            {italianUi ? "Etichette pannelli wrap (BACK / SPINE / FRONT)" : "Wrap panel labels (BACK / SPINE / FRONT)"}
          </label>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={Boolean(composition.showPrintGuides)}
              onChange={(e) => patch((c) => ({ ...c, showPrintGuides: e.target.checked }))}
            />
            {italianUi ? "Mostra guide stampa (non esportate)" : "Show print guides (not exported)"}
          </label>
          {isPrintMode && (
            <div className="flex flex-wrap gap-1">
              {(["front", "back", "spine"] as const).map((panel) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => patch((c) => ({ ...c, activePanel: panel }))}
                  className={`rounded-lg border px-2 py-1 text-[10px] ${
                    (composition.activePanel ?? "front") === panel
                      ? "border-primary bg-primary/15"
                      : "border-border/70"
                  }`}
                >
                  {panel === "front" ? "Front" : panel === "back" ? "Retro" : "Dorso"}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2 rounded-xl border border-border/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {italianUi ? "Retro editoriale" : "Back matter"}
            </p>
            {onBackTaglineChange && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">Tagline / CTA</span>
                <input className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm" value={backTagline} onChange={(e) => onBackTaglineChange(e.target.value)} />
              </label>
            )}
            {onBackBlurbChange && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">{italianUi ? "Testo retro" : "Back blurb"}</span>
                <textarea rows={3} className="w-full resize-none rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" value={backBlurb} onChange={(e) => onBackBlurbChange(e.target.value)} />
              </label>
            )}
            {onBackBioChange && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">{italianUi ? "Bio autore" : "Author bio"}</span>
                <textarea rows={2} className="w-full resize-none rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" value={backBio} onChange={(e) => onBackBioChange(e.target.value)} />
              </label>
            )}
            {onBackQuoteChange && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">{italianUi ? "Citazione recensione" : "Review quote"}</span>
                <input className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm" value={backQuote} onChange={(e) => onBackQuoteChange(e.target.value)} />
              </label>
            )}
            <p className="text-[10px] text-muted-foreground">
              {hasAuthorPhoto
                ? italianUi ? "Layout: foto autore + bio affiancata" : "Layout: author photo + bio side-by-side"
                : italianUi ? "Layout: bio full width" : "Layout: full-width bio"}
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                {italianUi ? "Verifica compatibilità stampa" : "Print compatibility"}
              </p>
              <Badge
                variant={printCheck.overall === "pass" ? "default" : printCheck.overall === "warning" ? "secondary" : "destructive"}
                className="text-[10px] uppercase"
              >
                {printCheck.overall}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{printCheck.summary}</p>
            {printCheck.items.map((item) => (
              <p key={item.id} className={`flex gap-1 text-[10px] ${item.status === "pass" ? "text-primary" : item.status === "warning" ? "text-amber-500" : "text-destructive"}`}>
                {item.status === "pass" ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                <span>{item.message}{item.suggestion ? ` → ${item.suggestion}` : ""}</span>
              </p>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="readiness" className="mt-3 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {[
              [italianUi ? "Titolo" : "Title read", readinessPro.titleReadability],
              [italianUi ? "Genere" : "Genre match", readinessPro.genreMatch],
              [italianUi ? "Miniatura" : "Thumbnail", readinessPro.thumbnailImpact],
              [italianUi ? "Autore" : "Author vis", readinessPro.authorVisibility],
              [italianUi ? "Contrasto" : "Contrast", readinessPro.contrast],
              [italianUi ? "Store digitale" : "Digital store", readinessPro.digitalReadiness],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-lg border border-border/60 px-2 py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="float-right font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {italianUi ? "Readiness store digitale · non paperback wrap" : "Digital store readiness · not paperback wrap"}
          </Badge>
          {readinessPro.strengths.map((s) => (
            <p key={s} className="text-primary flex items-center gap-1"><Check className="h-3 w-3" />{s}</p>
          ))}
          {readinessPro.warnings.map((w) => (
            <p key={w} className="text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{w}</p>
          ))}
          {readinessPro.improvements.map((i) => (
            <p key={i} className="text-muted-foreground">→ {i}</p>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {onSaveProject && (
              <Button size="sm" variant="default" onClick={onSaveProject} className="min-h-[44px]">
                <ImagePlus className="mr-1 h-3.5 w-3.5" />
                {italianUi ? "Salva cover" : "Save cover"}
              </Button>
            )}
            {onOpenExport && (
              <Button size="sm" variant="outline" onClick={onOpenExport} className="min-h-[44px]">
                <Download className="mr-1 h-3.5 w-3.5" />
                {italianUi ? "Usa nel progetto" : "Use in project"}
              </Button>
            )}
          </div>
          {saved && (
            <p className="text-primary flex items-center gap-1 text-[11px]">
              <Check className="h-3.5 w-3.5" />
              {italianUi ? "Cover salvata nel progetto" : "Cover saved to project"}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LayerListPanel({
  layers,
  selectedId,
  italianUi,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onReorder,
  onDuplicate,
  onDelete,
}: {
  layers: CoverLayer[];
  selectedId: string | null;
  italianUi: boolean;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1">
      {layers.map((layer) => {
        const isCore = layer.type === "title" || layer.type === "subtitle" || layer.type === "author";
        return (
          <div
            key={layer.id}
            className={`cover-studio-layer-row rounded-lg border px-2 py-1.5 ${
              selectedId === layer.id ? "border-primary bg-primary/10" : "border-border/60"
            }`}
          >
            <button type="button" className="min-w-0 flex-1 truncate text-left text-[11px] font-medium" onClick={() => onSelect(layer.id)}>
              {getLayerDisplayName(layer, italianUi)}
            </button>
            <button type="button" className="p-1 text-muted-foreground" onClick={() => onToggleVisible(layer.id)} aria-label="visibility">
              {layer.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className="p-1 text-muted-foreground" onClick={() => onToggleLock(layer.id)} aria-label="lock">
              {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className="p-1" onClick={() => onReorder(layer.id, "up")}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1" onClick={() => onReorder(layer.id, "down")}><ArrowDown className="h-3.5 w-3.5" /></button>
            {!isCore && (
              <>
                <button type="button" className="p-1" onClick={() => onDuplicate(layer.id)}><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" className="p-1 text-destructive" onClick={() => onDelete(layer.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LayerPicker({
  layers,
  selectedId,
  onSelect,
  italianUi,
}: {
  layers: CoverLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  italianUi: boolean;
}) {
  if (layers.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Layers className="h-3 w-3" /> {italianUi ? "Layer" : "Layers"}
      </p>
      <div className="flex flex-wrap gap-1">
        {layers.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect(l.id)}
            className={`rounded-lg border px-2 py-1 text-[10px] ${
              selectedId === l.id ? "border-primary bg-primary/10 text-primary" : "border-border/70"
            }`}
          >
            {l.type}{l.content ? `: ${l.content.slice(0, 12)}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextLayerControls({
  layer,
  onChange,
  italianUi,
}: {
  layer: CoverLayer;
  onChange: (p: Partial<CoverLayer>) => void;
  italianUi: boolean;
}) {
  const style = layer.style ?? {};
  const setStyle = (key: string, val: string | number) =>
    onChange({ style: { ...style, [key]: val } });

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
      <p className="flex items-center gap-1 text-[11px] font-semibold"><Type className="h-3.5 w-3.5" />{layer.type}</p>
      <SliderRow label="X %" value={layer.x} onChange={(v) => onChange({ x: v })} />
      <SliderRow label="Y %" value={layer.y} onChange={(v) => onChange({ y: v })} />
      <SliderRow label={italianUi ? "Dimensione" : "Size"} value={Number(style.fontSize ?? 100)} min={50} max={160} onChange={(v) => setStyle("fontSize", v)} />
      <SliderRow label={italianUi ? "Larghezza box" : "Box width"} value={layer.width ?? 80} min={40} max={95} onChange={(v) => onChange({ width: v })} />
      <div className="flex flex-wrap gap-1">
        {(["top", "center", "bottom", "left", "right"] as const).map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(quickPosition(layer, pos))}
            className="rounded border border-border/60 px-2 py-1 text-[10px] capitalize hover:bg-muted/40"
          >
            {pos}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {[
          { align: "left", icon: AlignLeft },
          { align: "center", icon: AlignCenter },
          { align: "right", icon: AlignRight },
        ].map(({ align, icon: Icon }) => (
          <button
            key={align}
            type="button"
            onClick={() => setStyle("align", align)}
            className={`rounded border p-1.5 ${style.align === align ? "border-primary bg-primary/10" : "border-border/60"}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <label className="block text-[10px] text-muted-foreground">
        {italianUi ? "Colore" : "Color"}
        <input type="color" value={String(style.color ?? "#fff8e8")} onChange={(e) => setStyle("color", e.target.value)} className="mt-1 h-8 w-full rounded border border-border" />
      </label>
      <SliderRow label="Letter spacing" value={Number(style.letterSpacing ?? 0)} min={0} max={12} onChange={(v) => setStyle("letterSpacing", v)} />
      <label className="flex items-center gap-2 text-[10px]">
        <input type="checkbox" checked={Boolean(style.uppercase)} onChange={(e) => setStyle("uppercase", e.target.checked ? 1 : 0)} />
        UPPERCASE
      </label>
      <SliderRow label={italianUi ? "Rotazione" : "Rotation"} value={layer.rotation ?? 0} min={-12} max={12} onChange={(v) => onChange({ rotation: v })} />
      <SliderRow label="Line height" value={Number(style.lineHeight ?? 1.1) * 100} min={90} max={160} onChange={(v) => setStyle("lineHeight", v / 100)} />
      <label className="flex items-center gap-2 text-[10px]">
        <input type="checkbox" checked={Boolean(style.boxBackground)} onChange={(e) => setStyle("boxBackground", e.target.checked ? "rgba(0,0,0,0.45)" : "")} />
        {italianUi ? "Box sfondo titolo" : "Title background box"}
      </label>
      <button
        type="button"
        onClick={() => onChange(applyTextPositionPreset([layer], "classic").find((l) => l.id === layer.id) ?? layer)}
        className="text-[10px] text-primary underline-offset-2 hover:underline"
      >
        {italianUi ? "Reset posizione" : "Reset position"}
      </button>
    </div>
  );
}

function StickerLayerControls({
  layer,
  onChange,
  onDuplicate,
  onDelete,
  onReorder,
  italianUi,
}: {
  layer: CoverLayer;
  onChange: (p: Partial<CoverLayer>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (dir: "up" | "down") => void;
  italianUi: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
      <p className="text-[11px] font-semibold">{layer.content ?? "Sticker"}</p>
      <SliderRow label="X %" value={layer.x} onChange={(v) => onChange({ x: v })} />
      <SliderRow label="Y %" value={layer.y} onChange={(v) => onChange({ y: v })} />
      <SliderRow label={italianUi ? "Dimensione" : "Size"} value={layer.width ?? 18} min={5} max={50} onChange={(v) => onChange({ width: v, height: v })} />
      <SliderRow label={italianUi ? "Rotazione" : "Rotation"} value={layer.rotation ?? 0} min={-180} max={180} onChange={(v) => onChange({ rotation: v })} />
      <SliderRow label="Opacity" value={Math.round((layer.opacity ?? 1) * 100)} min={10} max={100} onChange={(v) => onChange({ opacity: v / 100 })} />
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="outline" onClick={onDuplicate} className="h-8 text-[10px]"><Copy className="mr-1 h-3 w-3" />{italianUi ? "Duplica" : "Duplicate"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onReorder("up")} className="h-8 text-[10px]"><ArrowUp className="mr-1 h-3 w-3" />{italianUi ? "Avanti" : "Forward"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onReorder("down")} className="h-8 text-[10px]"><ArrowDown className="mr-1 h-3 w-3" />{italianUi ? "Indietro" : "Back"}</Button>
        <Button type="button" size="sm" variant="destructive" onClick={onDelete} className="h-8 text-[10px]"><Trash2 className="mr-1 h-3 w-3" />{italianUi ? "Elimina" : "Delete"}</Button>
      </div>
    </div>
  );
}

function SliderRow({
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
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full accent-primary" />
    </label>
  );
}
