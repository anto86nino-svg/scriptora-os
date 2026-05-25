import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, ImagePlus, Settings2, Upload, Wand2, X } from "lucide-react";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";

interface CoverGeneratorProps {
  title: string;
  subtitle: string;
  authorName?: string;
  description?: string;
  authorBio?: string;
  primaryActionLabel?: string;
  showPrimaryAction?: boolean;
  onGenerate: (dataUrl: string) => void;
  onClose: () => void;
}

type CoverMode = "epub" | "kdp" | "lulu" | "custom";
type PaperType = "white" | "cream" | "color";
type ImageFit = "cover" | "contain" | "soft";

type CoverTemplate = {
  name: string;
  mood: string;
  dark: boolean;
  palette: [string, string, string, string];
  textColor: string;
  mutedText: string;
  accentColor: string;
  font: string;
};

type TrimPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

type CoverSpec = {
  label: string;
  width: number;
  height: number;
  dpi: number;
  isPrint: boolean;
  bleedPx: number;
  trimWidthPx: number;
  trimHeightPx: number;
  spinePx: number;
  spineIn: number;
  frontRect: Rect;
  backRect?: Rect;
  spineRect?: Rect;
  exportNote: string;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const TEMPLATES: CoverTemplate[] = [
  {
    name: "Literary Night",
    mood: "Romanzo premium",
    dark: true,
    palette: ["#05070f", "#10233f", "#5b3b82", "#e6c36a"],
    textColor: "#fff8e8",
    mutedText: "#d9c9aa",
    accentColor: "#e6c36a",
    font: "Georgia",
  },
  {
    name: "Editorial Ivory",
    mood: "Saggio pulito",
    dark: false,
    palette: ["#f7efe0", "#e5d0aa", "#24211c", "#8f5f2d"],
    textColor: "#211d17",
    mutedText: "#5f5143",
    accentColor: "#8f5f2d",
    font: "Georgia",
  },
  {
    name: "Thriller Smoke",
    mood: "Noir / thriller",
    dark: true,
    palette: ["#060606", "#171717", "#3b0c0c", "#d7d7d7"],
    textColor: "#f6f2ea",
    mutedText: "#c4b8a7",
    accentColor: "#c72d2d",
    font: "Times New Roman",
  },
  {
    name: "Emerald Study",
    mood: "Business / self-help",
    dark: true,
    palette: ["#02120c", "#064e3b", "#0f766e", "#d4af37"],
    textColor: "#f1fff8",
    mutedText: "#cde7dc",
    accentColor: "#d4af37",
    font: "Palatino",
  },
  {
    name: "Romance Dusk",
    mood: "Romance elegante",
    dark: true,
    palette: ["#160713", "#3b0f2d", "#7f1d58", "#f0b8c8"],
    textColor: "#fff1f5",
    mutedText: "#f3c8d3",
    accentColor: "#f0b8c8",
    font: "Georgia",
  },
  {
    name: "Ocean Press",
    mood: "Memoir / narrativa",
    dark: true,
    palette: ["#04131c", "#075985", "#0ea5e9", "#d5f3ff"],
    textColor: "#f2fbff",
    mutedText: "#c8e8f2",
    accentColor: "#7dd3fc",
    font: "Georgia",
  },
  {
    name: "Golden Minimal",
    mood: "Manuale premium",
    dark: false,
    palette: ["#f8fafc", "#e8edf2", "#101828", "#c89211"],
    textColor: "#111827",
    mutedText: "#475467",
    accentColor: "#c89211",
    font: "Arial",
  },
  {
    name: "Cyber Ink",
    mood: "Tech / futuristico",
    dark: true,
    palette: ["#020617", "#111827", "#2563eb", "#22d3ee"],
    textColor: "#f8fbff",
    mutedText: "#b8c7df",
    accentColor: "#22d3ee",
    font: "Arial",
  },
  {
    name: "Vintage Sepia",
    mood: "Storico / classico",
    dark: false,
    palette: ["#efe3cc", "#b98a55", "#3d2412", "#7c2d12"],
    textColor: "#2b170d",
    mutedText: "#6e4a2f",
    accentColor: "#7c2d12",
    font: "Palatino",
  },
  {
    name: "Obsidian Luxe",
    mood: "Dark premium",
    dark: true,
    palette: ["#000000", "#0b0b0f", "#343434", "#f5d27a"],
    textColor: "#fff9ea",
    mutedText: "#cfc6b3",
    accentColor: "#f5d27a",
    font: "Georgia",
  },
];

const TRIM_PRESETS: TrimPreset[] = [
  { id: "5x8", label: "5 x 8 in", width: 5, height: 8 },
  { id: "5.5x8.5", label: "5.5 x 8.5 in", width: 5.5, height: 8.5 },
  { id: "6x9", label: "6 x 9 in", width: 6, height: 9 },
  { id: "7x10", label: "7 x 10 in", width: 7, height: 10 },
  { id: "8.5x11", label: "8.5 x 11 in", width: 8.5, height: 11 },
];

const PAPER_SPINE_FACTORS: Record<PaperType, number> = {
  white: 0.002252,
  cream: 0.0025,
  color: 0.002347,
};

const BLEED_IN = 0.125;
const EPUB_WIDTH = 1600;
const EPUB_HEIGHT = 2560;

export function CoverGenerator({
  title,
  subtitle,
  authorName,
  description,
  authorBio,
  primaryActionLabel = "Usa per EPUB",
  showPrimaryAction = true,
  onGenerate,
  onClose,
}: CoverGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authorPhotoInputRef = useRef<HTMLInputElement>(null);
  const selectedIdentity = useMemo(() => {
    try {
      return getSelectedAuthorIdentity();
    } catch {
      return null;
    }
  }, []);

  const [mode, setMode] = useState<CoverMode>("epub");
  const [coverTitle, setCoverTitle] = useState(title || "Untitled Book");
  const [coverSubtitle, setCoverSubtitle] = useState(subtitle || "");
  const [coverAuthor, setCoverAuthor] = useState(
    authorName || selectedIdentity?.penName || "",
  );
  const [bookDescription, setBookDescription] = useState(
    description || "Scrivi qui una descrizione editoriale del libro: promessa, conflitto, tono e motivo per cui il lettore dovrebbe aprirlo.",
  );
  const [coverAuthorBio, setCoverAuthorBio] = useState(
    authorBio || selectedIdentity?.biography || "Breve bio autore, credibilita e nota editoriale.",
  );
  const [backTagline, setBackTagline] = useState("Una storia creata con Scriptora OS");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [trimId, setTrimId] = useState("6x9");
  const [pageCount, setPageCount] = useState(260);
  const [paperType, setPaperType] = useState<PaperType>("cream");
  const [customWidth, setCustomWidth] = useState(6);
  const [customHeight, setCustomHeight] = useState(9);
  const [customSpine, setCustomSpine] = useState(0.65);
  const [dpi, setDpi] = useState(300);
  const [imageFit, setImageFit] = useState<ImageFit>("soft");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [showAuthorPhoto, setShowAuthorPhoto] = useState(false);
  const [scriptoraSeed, setScriptoraSeed] = useState(1);
  const [showGuides, setShowGuides] = useState(false);

  const template = TEMPLATES[selectedTemplate];
  const spec = useMemo(
    () => getCoverSpec(mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi),
    [mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi],
  );

  useEffect(() => {
    void drawCover();
  }, [
    spec,
    template,
    coverTitle,
    coverSubtitle,
    coverAuthor,
    bookDescription,
    coverAuthorBio,
    backTagline,
    uploadedImage,
    authorPhoto,
    showAuthorPhoto,
    imageFit,
    scriptoraSeed,
    showGuides,
  ]);

  async function drawCover() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = spec.width;
    canvas.height = spec.height;

    ctx.clearRect(0, 0, spec.width, spec.height);
    drawTemplateBackground(ctx, { x: 0, y: 0, w: spec.width, h: spec.height }, template, scriptoraSeed);

    if (spec.isPrint && spec.backRect && spec.spineRect) {
      drawPanelTint(ctx, spec.backRect, template, 0.06);
      drawPanelTint(ctx, spec.spineRect, template, 0.12);
      drawPanelTint(ctx, spec.frontRect, template, 0.04);
      await drawFrontCover(ctx, spec.frontRect, template, uploadedImage, imageFit);
      drawBackCover(ctx, spec.backRect, template);
      drawSpine(ctx, spec.spineRect, template);
      if (showGuides) drawPrintGuides(ctx, spec, template);
    } else {
      await drawFrontCover(ctx, spec.frontRect, template, uploadedImage, imageFit);
    }
  }

  async function drawFrontCover(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    coverTemplate: CoverTemplate,
    imageData: string | null,
    fit: ImageFit,
  ) {
    if (imageData) {
      const image = await loadImage(imageData);
      drawImageInRect(ctx, image, rect, fit);
      const overlay = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      overlay.addColorStop(0, coverTemplate.dark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)");
      overlay.addColorStop(0.55, coverTemplate.dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.22)");
      overlay.addColorStop(1, coverTemplate.dark ? "rgba(0,0,0,0.68)" : "rgba(255,255,255,0.52)");
      ctx.fillStyle = overlay;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      drawTemplateBackground(ctx, rect, coverTemplate, scriptoraSeed + 11);
      drawCoverOrnaments(ctx, rect, coverTemplate, scriptoraSeed);
    }

    if (showAuthorPhoto && authorPhoto) {
      try {
        const photo = await loadImage(authorPhoto);
        drawAuthorPhotoBadge(ctx, rect, coverTemplate, photo);
      } catch {
        // Ignore image decode failures; the cover remains usable.
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const marginX = rect.w * 0.105;
    const titleSize = clamp(Math.round(rect.w * (coverTitle.length > 36 ? 0.066 : coverTitle.length > 22 ? 0.078 : 0.091)), 46, 150);
    const subtitleSize = clamp(Math.round(rect.w * 0.034), 24, 58);
    const authorSize = clamp(Math.round(rect.w * 0.032), 24, 50);
    const x = rect.x + rect.w / 2;

    ctx.fillStyle = coverTemplate.accentColor;
    ctx.font = `600 ${clamp(Math.round(rect.w * 0.018), 14, 28)}px Arial, sans-serif`;
    ctx.letterSpacing = "0px";
    ctx.fillText(backTagline.toUpperCase().slice(0, 58), x, rect.y + rect.h * 0.16);

    drawAccentRule(ctx, rect.x + marginX, rect.y + rect.h * 0.24, rect.w - marginX * 2, coverTemplate);

    ctx.fillStyle = coverTemplate.textColor;
    ctx.font = `700 ${titleSize}px ${coverTemplate.font}, serif`;
    wrapText(ctx, coverTitle.toUpperCase(), x, rect.y + rect.h * 0.43, rect.w - marginX * 2, titleSize * 1.05, 5);

    if (coverSubtitle) {
      ctx.fillStyle = coverTemplate.mutedText;
      ctx.font = `italic ${subtitleSize}px ${coverTemplate.font}, serif`;
      wrapText(ctx, coverSubtitle, x, rect.y + rect.h * 0.61, rect.w - marginX * 2.3, subtitleSize * 1.28, 3);
    }

    if (coverAuthor) {
      ctx.fillStyle = coverTemplate.textColor;
      ctx.font = `600 ${authorSize}px Arial, sans-serif`;
      ctx.fillText(coverAuthor.toUpperCase(), x, rect.y + rect.h * 0.84);
    }

    drawAccentRule(ctx, rect.x + rect.w * 0.42, rect.y + rect.h * 0.91, rect.w * 0.16, coverTemplate);
  }

  function drawBackCover(ctx: CanvasRenderingContext2D, rect: Rect, coverTemplate: CoverTemplate) {
    const pad = rect.w * 0.1;
    const top = rect.y + rect.h * 0.12;
    const textX = rect.x + pad;
    const maxWidth = rect.w - pad * 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillStyle = coverTemplate.accentColor;
    ctx.font = `700 ${clamp(Math.round(rect.w * 0.043), 28, 54)}px ${coverTemplate.font}, serif`;
    wrapText(ctx, backTagline || "Il libro", textX, top, maxWidth, rect.w * 0.058, 3, "left");

    ctx.fillStyle = coverTemplate.mutedText;
    ctx.font = `${clamp(Math.round(rect.w * 0.026), 18, 34)}px Georgia, serif`;
    wrapText(ctx, bookDescription, textX, top + rect.h * 0.17, maxWidth, rect.w * 0.041, 10, "left");

    const bioTop = rect.y + rect.h * 0.61;
    ctx.fillStyle = coverTemplate.textColor;
    ctx.font = `700 ${clamp(Math.round(rect.w * 0.025), 18, 30)}px Arial, sans-serif`;
    ctx.fillText(coverAuthor || "Autore", textX, bioTop);

    ctx.fillStyle = coverTemplate.mutedText;
    ctx.font = `${clamp(Math.round(rect.w * 0.021), 16, 26)}px Arial, sans-serif`;
    wrapText(ctx, coverAuthorBio, textX, bioTop + rect.h * 0.045, maxWidth, rect.w * 0.034, 5, "left");

    const barcodeW = rect.w * 0.25;
    const barcodeH = rect.h * 0.09;
    const barcodeX = rect.x + rect.w - pad - barcodeW;
    const barcodeY = rect.y + rect.h - pad - barcodeH;
    ctx.fillStyle = coverTemplate.dark ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.95)";
    roundRect(ctx, barcodeX, barcodeY, barcodeW, barcodeH, 10, true, false);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `600 ${clamp(Math.round(rect.w * 0.014), 10, 18)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("ISBN / BARCODE", barcodeX + barcodeW / 2, barcodeY + barcodeH / 2 - 8);
    ctx.fillText("placeholder", barcodeX + barcodeW / 2, barcodeY + barcodeH / 2 + 12);
  }

  function drawSpine(ctx: CanvasRenderingContext2D, rect: Rect, coverTemplate: CoverTemplate) {
    ctx.save();
    ctx.fillStyle = coverTemplate.dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.22)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (rect.w > 34) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = coverTemplate.textColor;
      ctx.font = `700 ${clamp(Math.round(rect.w * 0.42), 14, 34)}px ${coverTemplate.font}, serif`;
      const spineText = `${coverTitle.toUpperCase()}${coverAuthor ? `   |   ${coverAuthor.toUpperCase()}` : ""}`;
      ctx.fillText(spineText.slice(0, 90), 0, 0, rect.h * 0.84);
    }
    ctx.restore();
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 6,
    align: CanvasTextAlign = "center",
  ) {
    const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    let line = "";
    const lines: string[] = [];

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines && visibleLines.length) {
      visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/[.,;:!?]$/, "")}...`;
    }

    const previousAlign = ctx.textAlign;
    ctx.textAlign = align;
    const startY = align === "center" ? y - ((visibleLines.length - 1) * lineHeight) / 2 : y;
    visibleLines.forEach((l, i) => {
      ctx.fillText(l, x, startY + i * lineHeight);
    });
    ctx.textAlign = previousAlign;
  }

  function handleUseForEpub() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!spec.isPrint) {
      onGenerate(canvas.toDataURL("image/jpeg", 0.95));
      return;
    }
    const front = document.createElement("canvas");
    front.width = EPUB_WIDTH;
    front.height = EPUB_HEIGHT;
    const ctx = front.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      canvas,
      spec.frontRect.x,
      spec.frontRect.y,
      spec.frontRect.w,
      spec.frontRect.h,
      0,
      0,
      EPUB_WIDTH,
      EPUB_HEIGHT,
    );
    onGenerate(front.toDataURL("image/jpeg", 0.95));
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const cleanTitle = coverTitle.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "scriptora-cover";
    link.download = `${cleanTitle}-${mode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function handleAuthorPhotoUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAuthorPhoto(String(reader.result || ""));
      setShowAuthorPhoto(true);
    };
    reader.readAsDataURL(file);
  }

  function generateScriptoraBackground() {
    setUploadedImage(null);
    setScriptoraSeed((current) => current + 1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card/95 border border-border/80 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-border/70 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
              <BookOpen className="h-4 w-4" />
              Scriptora Cover Studio
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">Copertine EPUB, KDP e Lulu</h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-full border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background transition-colors grid place-items-center"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_390px] max-h-[calc(92vh-78px)] overflow-y-auto">
          <div className="p-4 sm:p-6 bg-black/20 flex flex-col items-center justify-center gap-4">
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{spec.label}</span>
              <span>{spec.width} x {spec.height}px - {spec.exportNote}</span>
            </div>
            <div className="w-full min-h-[360px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-h-[66vh] w-auto max-w-full rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5 bg-background/55">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Settings2 className="h-4 w-4 text-primary" />
                Formato
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["epub", "EPUB"],
                  ["kdp", "Amazon KDP"],
                  ["lulu", "Lulu"],
                  ["custom", "Custom"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value as CoverMode)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      mode === value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/70 bg-surface/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(mode === "kdp" || mode === "lulu") && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Trim size</span>
                    <select
                      value={trimId}
                      onChange={(e) => setTrimId(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {TRIM_PRESETS.map((trim) => (
                        <option key={trim.id} value={trim.id}>{trim.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Pagine</span>
                    <input
                      type="number"
                      min={24}
                      max={828}
                      value={pageCount}
                      onChange={(e) => setPageCount(Number(e.target.value) || 24)}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Carta</span>
                    <select
                      value={paperType}
                      onChange={(e) => setPaperType(e.target.value as PaperType)}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="cream">Cream</option>
                      <option value="white">White</option>
                      <option value="color">Color</option>
                    </select>
                  </label>
                  <label className="flex items-end gap-2 rounded-lg border border-border/70 bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showGuides}
                      onChange={(e) => setShowGuides(e.target.checked)}
                    />
                    Guide taglio
                  </label>
                </div>
              )}

              {mode === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Larghezza in" value={customWidth} min={1} max={30} step={0.1} onChange={setCustomWidth} />
                  <NumberField label="Altezza in" value={customHeight} min={1} max={30} step={0.1} onChange={setCustomHeight} />
                  <NumberField label="Dorso in" value={customSpine} min={0} max={3} step={0.01} onChange={setCustomSpine} />
                  <NumberField label="DPI" value={dpi} min={72} max={450} step={1} onChange={setDpi} />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Testi copertina</p>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Titolo</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Sottotitolo</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverSubtitle}
                  onChange={(e) => setCoverSubtitle(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Autore</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverAuthor}
                  onChange={(e) => setCoverAuthor(e.target.value)}
                />
              </label>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Retro copertina</p>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Headline retro</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={backTagline}
                  onChange={(e) => setBackTagline(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Descrizione libro</span>
                <textarea
                  rows={4}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Bio autore</span>
                <textarea
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverAuthorBio}
                  onChange={(e) => setCoverAuthorBio(e.target.value)}
                />
              </label>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Immagine e stile</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-surface/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Carica immagine
                </button>
                <button
                  type="button"
                  onClick={generateScriptoraBackground}
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/12 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/18 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                  Sfondo Scriptora
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Rimuovi immagine caricata
                </button>
              )}
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Adattamento immagine</span>
                <select
                  value={imageFit}
                  onChange={(e) => setImageFit(e.target.value as ImageFit)}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="soft">Cover morbida</option>
                  <option value="cover">Riempi</option>
                  <option value="contain">Contieni</option>
                </select>
              </label>

              <div className="rounded-xl border border-border/70 bg-surface/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Foto autore opzionale</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                      Se la carichi, appare in alto a sinistra come badge editoriale.
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showAuthorPhoto && Boolean(authorPhoto)}
                      disabled={!authorPhoto}
                      onChange={(e) => setShowAuthorPhoto(e.target.checked)}
                    />
                    Mostra
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => authorPhotoInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border/70 bg-background/45 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/70 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Carica foto
                  </button>
                  {authorPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthorPhoto(null);
                        setShowAuthorPhoto(false);
                      }}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors"
                    >
                      Rimuovi
                    </button>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-center text-xs text-muted-foreground">
                      Nessuna foto
                    </div>
                  )}
                </div>
                <input
                  ref={authorPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAuthorPhotoUpload(e.target.files?.[0])}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTemplate(i)}
                    className={`min-h-16 rounded-xl border p-2 text-left transition-colors ${
                      i === selectedTemplate
                        ? "border-primary bg-primary/15"
                        : "border-border/70 bg-surface/50 hover:bg-surface"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-7 w-7 rounded-lg border border-white/20 shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]}, ${t.palette[3]})` }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">{t.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{t.mood}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className={`sticky bottom-0 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 grid gap-2 border-t border-border/70 bg-background/90 p-4 backdrop-blur-xl sm:p-5 ${showPrimaryAction ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground hover:bg-surface/80 transition-colors"
              >
                <Download className="h-4 w-4" />
                Scarica PNG
              </button>
              {showPrimaryAction && (
                <button
                  onClick={handleUseForEpub}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <ImagePlus className="h-4 w-4" />
                  {primaryActionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function getCoverSpec(
  mode: CoverMode,
  trimId: string,
  pageCount: number,
  paperType: PaperType,
  customWidth: number,
  customHeight: number,
  customSpine: number,
  dpi: number,
): CoverSpec {
  if (mode === "epub") {
    return {
      label: "EPUB front cover 1.6:1",
      width: EPUB_WIDTH,
      height: EPUB_HEIGHT,
      dpi: 300,
      isPrint: false,
      bleedPx: 0,
      trimWidthPx: EPUB_WIDTH,
      trimHeightPx: EPUB_HEIGHT,
      spinePx: 0,
      spineIn: 0,
      frontRect: { x: 0, y: 0, w: EPUB_WIDTH, h: EPUB_HEIGHT },
      exportNote: "cover digitale",
    };
  }

  const selectedTrim = TRIM_PRESETS.find((trim) => trim.id === trimId) || TRIM_PRESETS[2];
  const outputDpi = clamp(Math.round(dpi), 72, 450);
  const trimWidth = mode === "custom" ? customWidth : selectedTrim.width;
  const trimHeight = mode === "custom" ? customHeight : selectedTrim.height;
  const safePages = clamp(Math.round(pageCount), 24, 828);
  const spineIn = mode === "custom"
    ? Math.max(0, customSpine)
    : mode === "lulu"
      ? Math.max(0.06, safePages / 444 + 0.06)
      : Math.max(0.06, safePages * PAPER_SPINE_FACTORS[paperType]);
  const bleedPx = Math.round(BLEED_IN * outputDpi);
  const trimWidthPx = Math.round(trimWidth * outputDpi);
  const trimHeightPx = Math.round(trimHeight * outputDpi);
  const spinePx = Math.round(spineIn * outputDpi);
  const width = trimWidthPx * 2 + spinePx + bleedPx * 2;
  const height = trimHeightPx + bleedPx * 2;
  const backRect = { x: bleedPx, y: bleedPx, w: trimWidthPx, h: trimHeightPx };
  const spineRect = { x: bleedPx + trimWidthPx, y: bleedPx, w: spinePx, h: trimHeightPx };
  const frontRect = { x: bleedPx + trimWidthPx + spinePx, y: bleedPx, w: trimWidthPx, h: trimHeightPx };

  return {
    label: `${mode === "kdp" ? "Amazon KDP" : mode === "lulu" ? "Lulu" : "Custom"} full wrap - ${trimWidth} x ${trimHeight} in`,
    width,
    height,
    dpi: outputDpi,
    isPrint: true,
    bleedPx,
    trimWidthPx,
    trimHeightPx,
    spinePx,
    spineIn,
    frontRect,
    backRect,
    spineRect,
    exportNote: `dorso ${spineIn.toFixed(2)} in, bleed 0.125 in`,
  };
}

function drawTemplateBackground(ctx: CanvasRenderingContext2D, rect: Rect, template: CoverTemplate, seed: number) {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  gradient.addColorStop(0, template.palette[0]);
  gradient.addColorStop(0.46, template.palette[1]);
  gradient.addColorStop(1, template.palette[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.save();
  ctx.globalAlpha = template.dark ? 0.28 : 0.18;
  for (let i = 0; i < 7; i += 1) {
    const cx = rect.x + pseudo(seed + i * 9) * rect.w;
    const cy = rect.y + pseudo(seed + i * 13) * rect.h;
    const radius = rect.w * (0.22 + pseudo(seed + i * 17) * 0.22);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, template.palette[3]);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = template.dark ? 0.08 : 0.12;
  ctx.fillStyle = template.dark ? "#ffffff" : "#000000";
  const dotStep = Math.max(18, Math.round(rect.w / 42));
  for (let x = rect.x; x < rect.x + rect.w; x += dotStep) {
    for (let y = rect.y; y < rect.y + rect.h; y += dotStep) {
      if (pseudo(x + y + seed) > 0.76) ctx.fillRect(x, y, 1.2, 1.2);
    }
  }
  ctx.restore();
}

function drawCoverOrnaments(ctx: CanvasRenderingContext2D, rect: Rect, template: CoverTemplate, seed: number) {
  ctx.save();
  ctx.globalAlpha = 0.36;
  ctx.strokeStyle = template.accentColor;
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  const inset = rect.w * 0.085;
  roundRect(ctx, rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2, rect.w * 0.025, false, true);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5; i += 1) {
    const y = rect.y + rect.h * (0.18 + i * 0.14 + pseudo(seed + i) * 0.03);
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * 0.1, y);
    ctx.bezierCurveTo(
      rect.x + rect.w * 0.32,
      y - rect.h * 0.04,
      rect.x + rect.w * 0.68,
      y + rect.h * 0.04,
      rect.x + rect.w * 0.9,
      y,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawPanelTint(ctx: CanvasRenderingContext2D, rect: Rect, template: CoverTemplate, alpha: number) {
  ctx.save();
  ctx.fillStyle = template.dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawAccentRule(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, template: CoverTemplate) {
  ctx.save();
  ctx.strokeStyle = template.accentColor;
  ctx.lineWidth = Math.max(3, width * 0.006);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.restore();
}

function drawPrintGuides(ctx: CanvasRenderingContext2D, spec: CoverSpec, template: CoverTemplate) {
  if (!spec.backRect || !spec.spineRect) return;
  ctx.save();
  ctx.setLineDash([18, 12]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(spec.bleedPx, spec.bleedPx, spec.width - spec.bleedPx * 2, spec.height - spec.bleedPx * 2);

  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = template.accentColor;
  ctx.strokeRect(spec.backRect.x, spec.backRect.y, spec.backRect.w, spec.backRect.h);
  ctx.strokeRect(spec.frontRect.x, spec.frontRect.y, spec.frontRect.w, spec.frontRect.h);
  ctx.strokeRect(spec.spineRect.x, spec.spineRect.y, spec.spineRect.w, spec.spineRect.h);

  ctx.setLineDash([]);
  ctx.fillStyle = template.textColor;
  ctx.font = `600 ${Math.max(18, spec.width * 0.006)}px Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("BACK", spec.backRect.x + 24, spec.backRect.y + 22);
  ctx.fillText("FRONT", spec.frontRect.x + 24, spec.frontRect.y + 22);
  if (spec.spineRect.w > 60) ctx.fillText("SPINE", spec.spineRect.x + 10, spec.spineRect.y + 22);
  ctx.restore();
}

function drawImageInRect(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rect: Rect, fit: ImageFit) {
  const imageRatio = image.width / image.height;
  const rectRatio = rect.w / rect.h;
  let drawW = rect.w;
  let drawH = rect.h;

  if (fit === "contain") {
    if (imageRatio > rectRatio) {
      drawW = rect.w;
      drawH = rect.w / imageRatio;
    } else {
      drawH = rect.h;
      drawW = rect.h * imageRatio;
    }
  } else {
    if (imageRatio > rectRatio) {
      drawH = rect.h;
      drawW = rect.h * imageRatio;
    } else {
      drawW = rect.w;
      drawH = rect.w / imageRatio;
    }
  }

  const x = rect.x + (rect.w - drawW) / 2;
  const y = rect.y + (rect.h - drawH) / 2;
  if (fit === "soft") {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.filter = "blur(22px)";
    ctx.drawImage(image, rect.x - rect.w * 0.04, rect.y - rect.h * 0.04, rect.w * 1.08, rect.h * 1.08);
    ctx.restore();
  }
  ctx.drawImage(image, x, y, drawW, drawH);
}

function drawAuthorPhotoBadge(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  template: CoverTemplate,
  image: HTMLImageElement,
) {
  const size = clamp(Math.round(rect.w * 0.13), 72, 220);
  const x = rect.x + rect.w * 0.085;
  const y = rect.y + rect.h * 0.06;
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.035;
  ctx.fillStyle = template.dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.57, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.clip();
  drawImageCover(ctx, image, x, y, size, size);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = Math.max(3, size * 0.035);
  ctx.strokeStyle = template.accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.strokeStyle = template.dark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const rectRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > rectRatio) {
    sw = image.height * rectRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / rectRatio;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pseudo(value: number) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
