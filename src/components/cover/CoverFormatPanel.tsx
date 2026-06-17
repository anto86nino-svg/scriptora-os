import { Upload, Wand2 } from "lucide-react";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { creditModeDisclosure, creditModeLabel } from "@/lib/credit-economy";

type CoverMode = "epub" | "kdp" | "lulu" | "custom";
type PaperType = "white" | "cream" | "color";

type TrimPreset = { id: string; label: string };

type Props = {
  italianUi?: boolean;
  devCreditMode: boolean;
  mode: CoverMode;
  onModeChange: (mode: CoverMode) => void;
  trimId: string;
  onTrimChange: (id: string) => void;
  trimPresets: TrimPreset[];
  pageCount: number;
  onPageCountChange: (n: number) => void;
  paperType: PaperType;
  onPaperTypeChange: (p: PaperType) => void;
  showGuides: boolean;
  onShowGuidesChange: (v: boolean) => void;
  customWidth: number;
  customHeight: number;
  customSpine: number;
  dpi: number;
  onCustomWidthChange: (n: number) => void;
  onCustomHeightChange: (n: number) => void;
  onCustomSpineChange: (n: number) => void;
  onDpiChange: (n: number) => void;
  coverGenreBrief: string;
  onCoverGenreBriefChange: (v: string) => void;
  onGenerateBackground: () => void;
  scriptoraArtDirection?: { label: string } | null;
  showAuthorPhoto: boolean;
  hasAuthorPhoto: boolean;
  onShowAuthorPhotoChange: (v: boolean) => void;
  onUploadAuthorPhoto: () => void;
  onRemoveAuthorPhoto: () => void;
};

export function CoverFormatPanel({
  italianUi = true,
  devCreditMode,
  mode,
  onModeChange,
  trimId,
  onTrimChange,
  trimPresets,
  pageCount,
  onPageCountChange,
  paperType,
  onPaperTypeChange,
  showGuides,
  onShowGuidesChange,
  customWidth,
  customHeight,
  customSpine,
  dpi,
  onCustomWidthChange,
  onCustomHeightChange,
  onCustomSpineChange,
  onDpiChange,
  coverGenreBrief,
  onCoverGenreBriefChange,
  onGenerateBackground,
  scriptoraArtDirection,
  showAuthorPhoto,
  hasAuthorPhoto,
  onShowAuthorPhotoChange,
  onUploadAuthorPhoto,
  onRemoveAuthorPhoto,
}: Props) {
  return (
    <div className="space-y-4 text-xs">
      <section className="rounded-2xl border border-border/50 bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">{creditModeLabel(devCreditMode)}</span>
        {" · "}
        {italianUi ? "Sfondo AI consuma crediti. Salvataggio gratuito." : "AI background uses credits. Saving is free."}
        <p className="mt-1">{creditModeDisclosure(devCreditMode)}</p>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{italianUi ? "Formato export" : "Export format"}</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["epub", "EPUB"],
              ["kdp", "Amazon KDP"],
              ["lulu", "Lulu"],
              ["custom", "Custom"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                mode === value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/70 bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {(mode === "kdp" || mode === "lulu") && (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Trim size</span>
            <select
              value={trimId}
              onChange={(e) => onTrimChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {trimPresets.map((trim) => (
                <option key={trim.id} value={trim.id}>
                  {trim.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{italianUi ? "Pagine" : "Pages"}</span>
            <input
              type="number"
              min={24}
              max={828}
              value={pageCount}
              onChange={(e) => onPageCountChange(Number(e.target.value) || 24)}
              className="w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{italianUi ? "Carta" : "Paper"}</span>
            <select
              value={paperType}
              onChange={(e) => onPaperTypeChange(e.target.value as PaperType)}
              className="w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="cream">Cream</option>
              <option value="white">White</option>
              <option value="color">Color</option>
            </select>
          </label>
          <label className="flex items-end gap-2 rounded-xl border border-border/70 bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showGuides} onChange={(e) => onShowGuidesChange(e.target.checked)} />
            {italianUi ? "Guide taglio" : "Trim guides"}
          </label>
        </div>
      )}

      {mode === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Larghezza in" value={customWidth} min={1} max={30} step={0.1} onChange={onCustomWidthChange} />
          <NumberField label="Altezza in" value={customHeight} min={1} max={30} step={0.1} onChange={onCustomHeightChange} />
          <NumberField label="Dorso in" value={customSpine} min={0} max={3} step={0.01} onChange={onCustomSpineChange} />
          <NumberField label="DPI" value={dpi} min={72} max={450} step={1} onChange={onDpiChange} />
        </div>
      )}

      <section className="space-y-2 rounded-2xl border border-border/50 p-3">
        <p className="text-sm font-semibold text-foreground">{italianUi ? "Sfondo AI" : "AI background"}</p>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">{italianUi ? "Genere / atmosfera" : "Genre / mood"}</span>
          <input
            value={coverGenreBrief}
            onChange={(e) => onCoverGenreBriefChange(e.target.value)}
            placeholder={italianUi ? "thriller, romance dark, business..." : "thriller, dark romance, business..."}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          type="button"
          onClick={onGenerateBackground}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/12 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/18"
        >
          <Wand2 className="h-4 w-4" />
          {italianUi ? "Genera sfondo Scriptora" : "Generate Scriptora background"}
        </button>
        <CreditCostBadge operation="cover_generation" prominent className="mx-auto" />
        {scriptoraArtDirection && (
          <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] text-primary">
            {italianUi ? "Direzione" : "Direction"}: {scriptoraArtDirection.label}
          </p>
        )}
      </section>

      {mode !== "epub" && (
        <section className="rounded-2xl border border-border/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground">{italianUi ? "Foto autore" : "Author photo"}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {italianUi ? "Opzionale nel retro copertina." : "Optional on back cover."}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={showAuthorPhoto && hasAuthorPhoto}
                disabled={!hasAuthorPhoto}
                onChange={(e) => onShowAuthorPhotoChange(e.target.checked)}
              />
              {italianUi ? "Mostra" : "Show"}
            </label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onUploadAuthorPhoto}
              className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-xs font-semibold"
            >
              <Upload className="h-3.5 w-3.5" />
              {italianUi ? "Carica" : "Upload"}
            </button>
            {hasAuthorPhoto ? (
              <button
                type="button"
                onClick={onRemoveAuthorPhoto}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
              >
                {italianUi ? "Rimuovi" : "Remove"}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-center text-xs text-muted-foreground">
                —
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-surface px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}
