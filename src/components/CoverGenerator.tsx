import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, ImagePlus, Settings2, Upload, Wand2, X, Layers } from "lucide-react";
import { t } from "@/lib/i18n";
import { lockViewportScroll, unlockViewportScroll } from "@/lib/viewport-safe";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import {
  buildCoverDirectionSuggestions,
  COVER_TEMPLATE_FAMILIES,
  evaluateCoverReadiness,
  generateViaProvider,
  getActiveCoverProvider,
  matchTemplateFamily,
  prepareAudiobookAdaptation,
  recommendedTemplateIndex,
  type CoverArtDirection,
  type CoverMotif,
} from "@/lib/cover-studio";
import { CoverStudioIntelligencePanel } from "@/components/CoverStudioIntelligencePanel";

interface CoverGeneratorProps {
  title: string;
  subtitle: string;
  authorName?: string;
  description?: string;
  authorBio?: string;
  projectGenre?: string;
  primaryActionLabel?: string;
  showPrimaryAction?: boolean;
  embedded?: boolean;
  onGenerate: (dataUrl: string) => void;
  onClose: () => void;
}

type CoverMode = "epub" | "kdp" | "lulu" | "custom";
type PaperType = "white" | "cream" | "color";
type ImageFit = "cover" | "contain" | "soft";
type ScriptoraMotif = "thriller" | "romance" | "business" | "fantasy" | "memoir" | "historical" | "scifi" | "literary";

type ScriptoraArtDirection = {
  motif: ScriptoraMotif;
  label: string;
  templateIndex: number;
  seed: number;
};

function mapMotifForCanvas(motif: CoverMotif): ScriptoraMotif {
  if (motif === "dark-romance") return "romance";
  if (motif === "romantasy") return "fantasy";
  if (
    motif === "thriller" ||
    motif === "romance" ||
    motif === "business" ||
    motif === "fantasy" ||
    motif === "memoir" ||
    motif === "historical" ||
    motif === "scifi" ||
    motif === "literary"
  ) {
    return motif;
  }
  return "literary";
}

function toCanvasArtDirection(art: CoverArtDirection): ScriptoraArtDirection {
  return {
    motif: mapMotifForCanvas(art.motif),
    label: art.label,
    templateIndex: art.templateIndex,
    seed: art.seed,
  };
}

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
const FONT_OPTIONS = ["Template", "Georgia", "Times New Roman", "Palatino", "Arial", "Helvetica", "Verdana", "Trebuchet MS", "Courier New"];
const TEXT_COLOR_SWATCHES = ["#fff8e8", "#111827", "#e6c36a", "#f8fafc", "#c72d2d", "#7dd3fc", "#f0b8c8", "#064e3b", "#8f5f2d", "#f5d27a"];

export function CoverGenerator({
  title,
  subtitle,
  authorName,
  description,
  authorBio,
  projectGenre,
  primaryActionLabel = t("cover_confirm_save"),
  showPrimaryAction = true,
  embedded = false,
  onGenerate,
  onClose,
}: CoverGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authorPhotoInputRef = useRef<HTMLInputElement>(null);
  const drawRafRef = useRef<number | null>(null);
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
  const [coverGenreBrief, setCoverGenreBrief] = useState("");
  const [scriptoraArtDirection, setScriptoraArtDirection] = useState<ScriptoraArtDirection | null>(null);
  const [titleFont, setTitleFont] = useState("Template");
  const [subtitleFont, setSubtitleFont] = useState("Template");
  const [authorFont, setAuthorFont] = useState("Template");
  const [titleColor, setTitleColor] = useState(TEMPLATES[0].textColor);
  const [subtitleColor, setSubtitleColor] = useState(TEMPLATES[0].mutedText);
  const [authorColor, setAuthorColor] = useState(TEMPLATES[0].textColor);
  const [titleScale, setTitleScale] = useState(100);
  const [subtitleScale, setSubtitleScale] = useState(100);
  const [authorScale, setAuthorScale] = useState(100);

  const template = TEMPLATES[selectedTemplate];

  const selectTemplate = (index: number) => {
    setSelectedTemplate(index);
    const next = TEMPLATES[index];
    if (next) {
      setTitleColor(next.textColor);
      setSubtitleColor(next.mutedText);
      setAuthorColor(next.textColor);
    }
  };
  const resolveFont = (font: string) => (font === "Template" ? template.font : font);
  const spec = useMemo(
    () => getCoverSpec(mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi),
    [mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi],
  );

  const intelligenceSource = useMemo(
    () => [projectGenre, coverGenreBrief, coverTitle, coverSubtitle, bookDescription].filter(Boolean).join(" "),
    [projectGenre, coverGenreBrief, coverTitle, coverSubtitle, bookDescription],
  );

  useEffect(() => {
    if (embedded) return;
    lockViewportScroll();
    return () => unlockViewportScroll();
  }, [embedded]);

  const matchedFamily = useMemo(() => matchTemplateFamily(intelligenceSource), [intelligenceSource]);

  const coverDirection = useMemo(
    () => buildCoverDirectionSuggestions({
      genreBrief: coverGenreBrief,
      title: coverTitle,
      subtitle: coverSubtitle,
      description: bookDescription,
      templateName: template.name,
      templateMood: template.mood,
      templateDark: template.dark,
      titleColor,
      titleScale,
      hasUploadedImage: Boolean(uploadedImage),
      hasArtDirection: Boolean(scriptoraArtDirection),
      artDirectionLabel: scriptoraArtDirection?.label,
      projectGenre,
    }),
    [
      coverGenreBrief,
      coverTitle,
      coverSubtitle,
      bookDescription,
      template,
      titleColor,
      titleScale,
      uploadedImage,
      scriptoraArtDirection,
      projectGenre,
    ],
  );

  const coverReadiness = useMemo(
    () => evaluateCoverReadiness({
      genreBrief: coverGenreBrief,
      title: coverTitle,
      subtitle: coverSubtitle,
      templateName: template.name,
      templateDark: template.dark,
      titleColor,
      titleScale,
      hasUploadedImage: Boolean(uploadedImage),
      hasArtDirection: Boolean(scriptoraArtDirection),
      frontWidthPx: spec.frontRect.w,
      frontHeightPx: spec.frontRect.h,
    }),
    [
      coverGenreBrief,
      coverTitle,
      coverSubtitle,
      template,
      titleColor,
      titleScale,
      uploadedImage,
      scriptoraArtDirection,
      spec.frontRect.w,
      spec.frontRect.h,
    ],
  );

  const audiobookPrep = useMemo(
    () => prepareAudiobookAdaptation({
      frontWidthPx: spec.frontRect.w,
      frontHeightPx: spec.frontRect.h,
      title: coverTitle,
      titleScale,
    }),
    [spec.frontRect.w, spec.frontRect.h, coverTitle, titleScale],
  );

  const applyTemplateFamily = (familyId: string) => {
    const family = COVER_TEMPLATE_FAMILIES.find((f) => f.id === familyId);
    if (!family) return;
    selectTemplate(recommendedTemplateIndex(family));
    if (!coverGenreBrief.trim()) {
      setCoverGenreBrief(family.genreKeywords.slice(0, 2).join(", "));
    }
  };

  useEffect(() => {
    if (drawRafRef.current != null) {
      cancelAnimationFrame(drawRafRef.current);
    }
    drawRafRef.current = requestAnimationFrame(() => {
      void drawCover();
    });
    return () => {
      if (drawRafRef.current != null) {
        cancelAnimationFrame(drawRafRef.current);
      }
    };
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
    scriptoraArtDirection,
    showGuides,
    titleFont,
    subtitleFont,
    authorFont,
    titleColor,
    subtitleColor,
    authorColor,
    titleScale,
    subtitleScale,
    authorScale,
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
      let authorImage: HTMLImageElement | null = null;
      if (showAuthorPhoto && authorPhoto) {
        try {
          authorImage = await loadImage(authorPhoto);
        } catch {
          authorImage = null;
        }
      }
      drawPanelTint(ctx, spec.backRect, template, 0.06);
      drawPanelTint(ctx, spec.spineRect, template, 0.12);
      drawPanelTint(ctx, spec.frontRect, template, 0.04);
      await drawFrontCover(ctx, spec.frontRect, template, uploadedImage, imageFit);
      drawBackCover(ctx, spec.backRect, template, authorImage);
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
      drawScriptoraAiScene(ctx, rect, coverTemplate, scriptoraSeed, scriptoraArtDirection);
      drawCoverOrnaments(ctx, rect, coverTemplate, scriptoraSeed);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const marginX = rect.w * 0.105;
    const titleSize = clamp(Math.round(rect.w * (coverTitle.length > 36 ? 0.066 : coverTitle.length > 22 ? 0.078 : 0.091) * (titleScale / 100)), 32, 190);
    const subtitleSize = clamp(Math.round(rect.w * 0.034 * (subtitleScale / 100)), 18, 78);
    const authorSize = clamp(Math.round(rect.w * 0.032 * (authorScale / 100)), 18, 72);
    const x = rect.x + rect.w / 2;

    drawAccentRule(ctx, rect.x + marginX, rect.y + rect.h * 0.20, rect.w - marginX * 2, coverTemplate);

    ctx.fillStyle = titleColor || coverTemplate.textColor;
    ctx.font = `700 ${titleSize}px ${canvasFontFamily(resolveFont(titleFont), "serif")}`;
    wrapText(ctx, coverTitle.toUpperCase(), x, rect.y + rect.h * 0.43, rect.w - marginX * 2, titleSize * 1.05, 5);

    if (coverSubtitle) {
      ctx.fillStyle = subtitleColor || coverTemplate.mutedText;
      ctx.font = `italic ${subtitleSize}px ${canvasFontFamily(resolveFont(subtitleFont), "serif")}`;
      wrapText(ctx, coverSubtitle, x, rect.y + rect.h * 0.61, rect.w - marginX * 2.3, subtitleSize * 1.28, 3);
    }

    if (coverAuthor) {
      ctx.fillStyle = authorColor || coverTemplate.textColor;
      ctx.font = `600 ${authorSize}px ${canvasFontFamily(resolveFont(authorFont), "sans-serif")}`;
      ctx.fillText(coverAuthor.toUpperCase(), x, rect.y + rect.h * 0.84);
    }

    drawAccentRule(ctx, rect.x + rect.w * 0.42, rect.y + rect.h * 0.91, rect.w * 0.16, coverTemplate);
  }

  function drawBackCover(ctx: CanvasRenderingContext2D, rect: Rect, coverTemplate: CoverTemplate, authorImage: HTMLImageElement | null) {
    const pad = rect.w * 0.1;
    const top = rect.y + rect.h * 0.12;
    const textX = rect.x + pad;
    const maxWidth = rect.w - pad * 2;
    const photoGap = rect.w * 0.045;
    const photoW = authorImage ? clamp(Math.round(rect.w * 0.22), 120, 260) : 0;
    const photoH = authorImage ? Math.round(photoW * 1.22) : 0;
    const headlineX = authorImage ? textX + photoW + photoGap : textX;
    const headlineWidth = authorImage ? maxWidth - photoW - photoGap : maxWidth;
    const descriptionTop = authorImage
      ? Math.max(top + photoH + rect.h * 0.05, top + rect.h * 0.24)
      : top + rect.h * 0.17;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    if (authorImage) {
      drawAuthorPhotoBackMatter(ctx, { x: textX, y: top, w: photoW, h: photoH }, coverTemplate, authorImage);
    }

    ctx.fillStyle = coverTemplate.accentColor;
    ctx.font = `700 ${clamp(Math.round(rect.w * 0.043), 28, 54)}px ${coverTemplate.font}, serif`;
    wrapText(ctx, backTagline || "Il libro", headlineX, top, headlineWidth, rect.w * 0.058, authorImage ? 4 : 3, "left");

    ctx.fillStyle = coverTemplate.mutedText;
    ctx.font = `${clamp(Math.round(rect.w * 0.026), 18, 34)}px Georgia, serif`;
    wrapText(ctx, bookDescription, textX, descriptionTop, maxWidth, rect.w * 0.041, authorImage ? 7 : 10, "left");

    const bioTop = rect.y + rect.h * 0.61;
    ctx.fillStyle = authorColor || coverTemplate.textColor;
    ctx.font = `700 ${clamp(Math.round(rect.w * 0.025 * (authorScale / 100)), 16, 42)}px ${canvasFontFamily(resolveFont(authorFont), "sans-serif")}`;
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
    ctx.fillText("978-0000000000", barcodeX + barcodeW / 2, barcodeY + barcodeH / 2 + 12);
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

  async function generateScriptoraBackground() {
    const provider = getActiveCoverProvider();
    const result = await generateViaProvider(provider, {
      genreBrief: coverGenreBrief,
      title: coverTitle,
      subtitle: coverSubtitle,
      prompt: [coverGenreBrief, bookDescription, backTagline].filter(Boolean).join(" "),
      width: spec.frontRect.w,
      height: spec.frontRect.h,
    });
    if (!result.ok || !result.artDirection) return;
    const direction = toCanvasArtDirection(result.artDirection);
    setUploadedImage(null);
    selectTemplate(direction.templateIndex);
    setScriptoraArtDirection(direction);
    setScriptoraSeed(direction.seed + Date.now() % 997);
  }

  const panel = (
    <div className={`scriptora-modal-panel scriptora-mobile-work-panel scriptora-cover-studio-shell flex flex-col max-w-6xl lg:max-w-[1500px] lg:rounded-[2rem] lg:shadow-[0_32px_120px_rgba(0,0,0,0.55)] ${embedded ? "max-w-none rounded-none shadow-none lg:rounded-2xl" : ""}`}>
        <div className="scriptora-mobile-work-panel__header flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5 lg:px-7 lg:py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
              <BookOpen className="h-4 w-4" />
              Cover Studio Pro Max
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">Professional cover strategy + design environment</h2>
            <p className="hidden lg:block text-xs text-muted-foreground mt-0.5">Commercial positioning, visual direction, and export-ready layouts.</p>
          </div>
          {!embedded && (
            <button
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background transition-colors grid place-items-center"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="scriptora-modal-body scriptora-mobile-work-panel__body min-h-0 flex-1 overflow-y-auto grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)_360px] xl:overflow-hidden">
          <div className="scriptora-cover-preview-stage relative order-1 xl:order-none xl:col-start-2 xl:row-start-1 p-4 sm:p-6 lg:p-6 xl:p-8 bg-black/20 xl:bg-gradient-to-br xl:from-black/45 xl:via-background/80 xl:to-primary/10 flex flex-col items-center justify-center gap-4 xl:min-h-[calc(94vh-96px)] xl:overflow-hidden">
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground lg:absolute lg:left-8 lg:right-8 lg:top-6 lg:w-auto lg:rounded-2xl lg:border lg:border-white/10 lg:bg-background/35 lg:px-4 lg:py-3 lg:backdrop-blur-xl">
              <span>{spec.label}</span>
              <span>{spec.width} x {spec.height}px - {spec.exportNote}</span>
            </div>
            <div className="scriptora-cover-preview-frame w-full min-h-[220px] max-h-[38dvh] sm:min-h-[280px] sm:max-h-[42dvh] lg:min-h-0 lg:max-h-none lg:h-full flex items-center justify-center lg:pt-8">
              <div className="w-full flex items-center justify-center lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-white/[0.035] lg:p-6 xl:p-8 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_80px_rgba(0,0,0,0.45)]">
                <canvas
                  ref={canvasRef}
                  className="max-h-[34dvh] sm:max-h-[38dvh] lg:max-h-[72vh] xl:max-h-[76vh] w-auto max-w-full rounded-xl lg:rounded-2xl shadow-2xl lg:shadow-[0_26px_80px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
                />
              </div>
            </div>
          </div>

          <div className="order-2 xl:order-none xl:col-start-1 xl:row-start-1 p-4 sm:p-5 lg:p-5 xl:p-5 space-y-5 lg:space-y-5 bg-background/55 xl:bg-background/75 xl:max-h-[calc(94vh-96px)] xl:overflow-y-auto">
            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="lg:hidden">Template family</span>
                  <span className="hidden lg:inline">TEMPLATE FAMILIES</span>
                </div>
                <p className="hidden lg:block text-xs leading-5 text-muted-foreground">
                  Curated commercial directions — typography, layout, and emotional positioning.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {COVER_TEMPLATE_FAMILIES.map((family) => (
                  <button
                    key={family.id}
                    type="button"
                    onClick={() => applyTemplateFamily(family.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      matchedFamily?.id === family.id
                        ? "border-primary bg-primary/12 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                        : "border-border/70 bg-surface/50 hover:bg-surface"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-foreground">{family.label}</span>
                    <span className="block text-[10px] text-muted-foreground line-clamp-2">{family.tagline}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span className="lg:hidden">Formato</span>
                  <span className="hidden lg:inline">FORMAT & LAYOUT</span>
                </div>
                <p className="hidden lg:block text-xs leading-5 text-muted-foreground">
                  Visual positioning for EPUB, KDP, Lulu, or custom print specs.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {[
                  ["epub", "EPUB"],
                  ["kdp", "Amazon KDP"],
                  ["lulu", "Lulu"],
                  ["custom", "Custom"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value as CoverMode)}
                    className={`rounded-xl border px-3 py-2 lg:py-3 text-xs lg:text-sm font-semibold transition-colors ${
                      mode === value
                        ? "border-primary bg-primary/15 text-primary shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                        : "border-border/70 bg-surface/60 text-muted-foreground hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(mode === "kdp" || mode === "lulu") && (
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Trim size</span>
                    <select
                      value={trimId}
                      onChange={(e) => setTrimId(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-2 lg:px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                      className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-2 lg:px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Carta</span>
                    <select
                      value={paperType}
                      onChange={(e) => setPaperType(e.target.value as PaperType)}
                      className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-2 lg:px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="cream">Cream</option>
                      <option value="white">White</option>
                      <option value="color">Color</option>
                    </select>
                  </label>
                  <label className="flex items-end gap-2 rounded-lg lg:rounded-xl border border-border/70 bg-surface/40 px-3 py-2 lg:py-2.5 text-xs text-muted-foreground">
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
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  <NumberField label="Larghezza in" value={customWidth} min={1} max={30} step={0.1} onChange={setCustomWidth} />
                  <NumberField label="Altezza in" value={customHeight} min={1} max={30} step={0.1} onChange={setCustomHeight} />
                  <NumberField label="Dorso in" value={customSpine} min={0} max={3} step={0.01} onChange={setCustomSpine} />
                  <NumberField label="DPI" value={dpi} min={72} max={450} step={1} onChange={setDpi} />
                </div>
              )}

              <div className="hidden lg:grid grid-cols-2 gap-2 lg:gap-3">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => selectTemplate(i)}
                    className={`min-h-16 lg:min-h-[76px] rounded-xl lg:rounded-2xl border p-2 lg:p-3 text-left transition-all duration-200 ${
                      i === selectedTemplate
                        ? "border-primary bg-primary/15 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "border-border/70 bg-surface/50 hover:bg-surface hover:-translate-y-0.5"
                    }`}
                  >
                    <span className="flex items-center gap-2 lg:gap-3">
                      <span
                        className="h-7 w-7 lg:h-9 lg:w-9 rounded-lg lg:rounded-xl border border-white/20 shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]}, ${t.palette[3]})` }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs lg:text-sm font-semibold text-foreground">{t.name}</span>
                        <span className="block truncate text-[10px] lg:text-[11px] text-muted-foreground">{t.mood}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  <span className="lg:hidden">Testi copertina</span>
                  <span className="hidden lg:inline">TEXT SETTINGS</span>
                </p>
                <p className="hidden lg:block text-xs leading-5 text-muted-foreground">
                  Titolo, sottotitolo, autore e copy editoriale per fronte e retro.
                </p>
              </div>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Titolo</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Sottotitolo</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverSubtitle}
                  onChange={(e) => setCoverSubtitle(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Autore</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverAuthor}
                  onChange={(e) => setCoverAuthor(e.target.value)}
                />
              </label>
              <div className="grid gap-3 pt-2 lg:grid-cols-3">
                <TextStyleControls
                  label="Titolo"
                  fontValue={titleFont}
                  onFontChange={setTitleFont}
                  colorValue={titleColor}
                  onColorChange={setTitleColor}
                  scale={titleScale}
                  onScaleChange={setTitleScale}
                />
                <TextStyleControls
                  label="Sottotitolo"
                  fontValue={subtitleFont}
                  onFontChange={setSubtitleFont}
                  colorValue={subtitleColor}
                  onColorChange={setSubtitleColor}
                  scale={subtitleScale}
                  onScaleChange={setSubtitleScale}
                />
                <TextStyleControls
                  label="Autore"
                  fontValue={authorFont}
                  onFontChange={setAuthorFont}
                  colorValue={authorColor}
                  onColorChange={setAuthorColor}
                  scale={authorScale}
                  onScaleChange={setAuthorScale}
                />
              </div>
            </section>

            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <p className="text-sm font-semibold text-foreground">
                <span className="lg:hidden">Retro copertina</span>
                <span className="hidden lg:inline">BACK MATTER</span>
              </p>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Headline retro</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={backTagline}
                  onChange={(e) => setBackTagline(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Descrizione libro</span>
                <textarea
                  rows={4}
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Bio autore</span>
                <textarea
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverAuthorBio}
                  onChange={(e) => setCoverAuthorBio(e.target.value)}
                />
              </label>
            </section>

            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  <span className="lg:hidden">Immagine e stile</span>
                  <span className="hidden lg:inline">STILE VISIVO</span>
                </p>
                <p className="hidden lg:block text-xs leading-5 text-muted-foreground">
                  Scriptora interpreta genere e tono per creare solo lo sfondo. Titolo, sottotitolo e autore restano modificabili dai controlli testo.
                </p>
              </div>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Visual positioning brief</span>
                <input
                  value={coverGenreBrief}
                  onChange={(e) => setCoverGenreBrief(e.target.value)}
                  placeholder="es. dark romance, thriller commerciale, authority nonfiction..."
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-surface/60 px-3 py-2 lg:py-3 text-xs lg:text-sm font-semibold text-foreground hover:bg-surface transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Carica immagine
                </button>
                <button
                  type="button"
                  onClick={generateScriptoraBackground}
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/12 px-3 py-2 lg:py-3 text-xs lg:text-sm font-semibold text-primary hover:bg-primary/18 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="lg:hidden">Build direction</span>
                  <span className="hidden lg:inline">Build Cover Direction</span>
                </button>
              </div>
              {scriptoraArtDirection && (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] leading-4 text-primary">
                  Visual direction: {scriptoraArtDirection.label}. Procedural background — title controls remain yours.
                </div>
              )}
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
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-2 lg:px-3 py-2 lg:py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="soft">Cover morbida</option>
                  <option value="cover">Riempi</option>
                  <option value="contain">Contieni</option>
                </select>
              </label>

              {mode !== "epub" && (
                <div className="rounded-xl lg:rounded-2xl border border-border/70 bg-surface/40 p-3 lg:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Foto autore opzionale</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                        Disponibile solo per KDP, Lulu e Custom: viene inserita rettangolare nel back matter.
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
                      className="flex items-center justify-center gap-2 rounded-lg lg:rounded-xl border border-border/70 bg-background/45 px-3 py-2 lg:py-2.5 text-xs font-semibold text-foreground hover:bg-background/70 transition-colors"
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
                        className="rounded-lg lg:rounded-xl border border-border/70 bg-muted/30 px-3 py-2 lg:py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Rimuovi
                      </button>
                    ) : (
                      <div className="rounded-lg lg:rounded-xl border border-dashed border-border/70 px-3 py-2 lg:py-2.5 text-center text-xs text-muted-foreground">
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
              )}

              <div className="grid grid-cols-2 gap-2 lg:hidden">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => selectTemplate(i)}
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

            <div className={`hidden lg:grid -mx-4 sm:-mx-5 lg:mx-0 -mb-4 sm:-mb-5 lg:mb-0 gap-2 lg:gap-3 border-t lg:border border-border/70 bg-background/90 lg:bg-card/75 p-4 backdrop-blur-xl sm:p-5 lg:rounded-2xl lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${showPrimaryAction ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="col-span-full">
                <p className="text-sm font-semibold text-foreground">EXPORT</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("cover_studio_actions_hint")}</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="scriptora-modal-cta-secondary min-h-11 px-3 py-3 text-sm"
              >
                <Download className="h-4 w-4" />
                {t("cover_download_png")}
              </button>
              {showPrimaryAction && (
                <button
                  type="button"
                  onClick={handleUseForEpub}
                  className="scriptora-modal-cta-primary min-h-11 px-3 py-3 text-sm"
                >
                  <ImagePlus className="h-4 w-4" />
                  {primaryActionLabel}
                </button>
              )}
            </div>
          </div>

          <div className="order-3 xl:order-none xl:col-start-3 xl:row-start-1 p-4 sm:p-5 xl:p-5 xl:max-h-[calc(94vh-96px)] xl:overflow-y-auto bg-background/40 xl:bg-background/55">
            <CoverStudioIntelligencePanel
              direction={coverDirection}
              readiness={coverReadiness}
              audiobookPrep={audiobookPrep}
              matchedFamily={matchedFamily}
              onApplyFamily={(family) => applyTemplateFamily(family.id)}
            />
          </div>
        </div>

        {!embedded && (
          <div className="scriptora-cover-studio-actions shrink-0 border-t border-border/70 bg-background/95 px-3 py-3 pb-safe backdrop-blur-xl sm:px-4 lg:hidden">
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
              {t("cover_studio_actions_hint")}
            </p>
            <div className={`grid gap-2 ${showPrimaryAction ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {showPrimaryAction && (
                <button
                  type="button"
                  onClick={handleUseForEpub}
                  className="scriptora-modal-cta-primary min-h-11 w-full px-4 py-3 text-sm"
                >
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  {primaryActionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="scriptora-modal-cta-secondary min-h-11 w-full px-4 py-3 text-sm"
              >
                <Download className="h-4 w-4 shrink-0" />
                {t("cover_download_png")}
              </button>
            </div>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return (
      <div className="scriptora-landing-embedded-workspace relative max-h-[min(720px,78vh)] overflow-auto bg-background text-foreground">
        {panel}
      </div>
    );
  }

  return (
    <div className="scriptora-modal-overlay p-3 pb-safe pt-safe sm:p-5">
      {panel}
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

function TextStyleControls({
  label,
  fontValue,
  onFontChange,
  colorValue,
  onColorChange,
  scale,
  onScaleChange,
}: {
  label: string;
  fontValue: string;
  onFontChange: (value: string) => void;
  colorValue: string;
  onColorChange: (value: string) => void;
  scale: number;
  onScaleChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface/35 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <span className="text-[10px] font-medium text-muted-foreground">{scale}%</span>
      </div>
      <label className="space-y-1 block">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Font</span>
        <select
          value={fontValue}
          onChange={(e) => onFontChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background/70 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </label>
      <label className="mt-2 space-y-1 block">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Grandezza</span>
        <input
          type="range"
          min={70}
          max={150}
          step={5}
          value={scale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </label>
      <div className="mt-2 space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Colore</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-8 w-10 rounded-lg border border-border bg-background p-1"
            aria-label={`Colore ${label}`}
          />
          <div className="flex flex-wrap gap-1.5">
            {TEXT_COLOR_SWATCHES.slice(0, 8).map((color) => (
              <button
                key={`${label}-${color}`}
                type="button"
                onClick={() => onColorChange(color)}
                className="h-5 w-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                aria-label={`Usa colore ${color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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

function drawScriptoraAiScene(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  template: CoverTemplate,
  seed: number,
  direction: ScriptoraArtDirection | null,
) {
  if (!direction) return;
  ctx.save();
  ctx.globalCompositeOperation = template.dark ? "screen" : "multiply";

  if (direction.motif === "thriller") {
    drawSoftCircle(ctx, rect.x + rect.w * 0.68, rect.y + rect.h * 0.22, rect.w * 0.48, template.accentColor, 0.2);
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(2, rect.w * 0.004);
    for (let i = 0; i < 26; i += 1) {
      const x = rect.x + pseudo(seed + i * 3) * rect.w;
      const y = rect.y + pseudo(seed + i * 7) * rect.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - rect.w * 0.08, y + rect.h * 0.16);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = template.accentColor;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * 0.76, rect.y);
    ctx.lineTo(rect.x + rect.w * 0.98, rect.y);
    ctx.lineTo(rect.x + rect.w * 0.56, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w * 0.34, rect.y + rect.h);
    ctx.closePath();
    ctx.fill();
  } else if (direction.motif === "romance") {
    drawSoftCircle(ctx, rect.x + rect.w * 0.32, rect.y + rect.h * 0.18, rect.w * 0.42, template.accentColor, 0.3);
    drawSoftCircle(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.72, rect.w * 0.5, template.palette[2], 0.24);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = template.accentColor;
    for (let i = 0; i < 16; i += 1) {
      const x = rect.x + pseudo(seed + i * 11) * rect.w;
      const y = rect.y + pseudo(seed + i * 13) * rect.h;
      ctx.beginPath();
      ctx.ellipse(x, y, rect.w * 0.018, rect.h * 0.008, pseudo(seed + i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (direction.motif === "business") {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(2, rect.w * 0.003);
    for (let i = 0; i < 9; i += 1) {
      const y = rect.y + rect.h * (0.18 + i * 0.075);
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.1, y);
      ctx.lineTo(rect.x + rect.w * 0.9, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * 0.18, rect.y + rect.h * 0.74);
    ctx.lineTo(rect.x + rect.w * 0.38, rect.y + rect.h * 0.58);
    ctx.lineTo(rect.x + rect.w * 0.55, rect.y + rect.h * 0.62);
    ctx.lineTo(rect.x + rect.w * 0.82, rect.y + rect.h * 0.38);
    ctx.stroke();
    drawSoftCircle(ctx, rect.x + rect.w * 0.78, rect.y + rect.h * 0.32, rect.w * 0.32, template.accentColor, 0.18);
  } else if (direction.motif === "fantasy") {
    drawSoftCircle(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.18, rect.w * 0.22, template.accentColor, 0.34);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = template.accentColor;
    for (let i = 0; i < 42; i += 1) {
      const x = rect.x + pseudo(seed + i * 5) * rect.w;
      const y = rect.y + pseudo(seed + i * 17) * rect.h * 0.78;
      ctx.fillRect(x, y, Math.max(2, rect.w * 0.004), Math.max(2, rect.w * 0.004));
    }
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 5; i += 1) {
      const baseX = rect.x + rect.w * (0.08 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(baseX, rect.y + rect.h * 0.9);
      ctx.lineTo(baseX + rect.w * 0.11, rect.y + rect.h * (0.42 + pseudo(seed + i) * 0.14));
      ctx.lineTo(baseX + rect.w * 0.22, rect.y + rect.h * 0.9);
      ctx.closePath();
      ctx.fill();
    }
  } else if (direction.motif === "scifi") {
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(2, rect.w * 0.003);
    for (let i = 0; i < 12; i += 1) {
      const y = rect.y + rect.h * (0.2 + i * 0.055);
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.16, y);
      ctx.lineTo(rect.x + rect.w * 0.84, y + rect.h * 0.16);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x + rect.w * 0.52, rect.y + rect.h * 0.42, rect.w * (0.22 + i * 0.06), rect.h * (0.055 + i * 0.02), -0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawSoftCircle(ctx, rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, rect.w * 0.25, template.accentColor, 0.22);
  } else if (direction.motif === "memoir") {
    drawSoftCircle(ctx, rect.x + rect.w * 0.25, rect.y + rect.h * 0.2, rect.w * 0.44, template.accentColor, 0.18);
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(3, rect.w * 0.006);
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * 0.14, rect.y + rect.h * 0.58);
    ctx.bezierCurveTo(rect.x + rect.w * 0.34, rect.y + rect.h * 0.5, rect.x + rect.w * 0.62, rect.y + rect.h * 0.64, rect.x + rect.w * 0.88, rect.y + rect.h * 0.52);
    ctx.stroke();
    ctx.globalAlpha = 0.16;
    roundRect(ctx, rect.x + rect.w * 0.14, rect.y + rect.h * 0.18, rect.w * 0.28, rect.h * 0.22, rect.w * 0.015, false, true);
  } else if (direction.motif === "historical") {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(2, rect.w * 0.003);
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      const y = rect.y + rect.h * (0.18 + i * 0.08);
      ctx.moveTo(rect.x + rect.w * 0.1, y);
      ctx.bezierCurveTo(rect.x + rect.w * 0.32, y - rect.h * 0.04, rect.x + rect.w * 0.56, y + rect.h * 0.05, rect.x + rect.w * 0.9, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.28;
    roundRect(ctx, rect.x + rect.w * 0.11, rect.y + rect.h * 0.11, rect.w * 0.78, rect.h * 0.78, rect.w * 0.018, false, true);
  } else {
    drawSoftCircle(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.22, rect.w * 0.44, template.accentColor, 0.2);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = template.accentColor;
    ctx.lineWidth = Math.max(2, rect.w * 0.004);
    for (let i = 0; i < 7; i += 1) {
      const y = rect.y + rect.h * (0.22 + i * 0.085);
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.16, y);
      ctx.lineTo(rect.x + rect.w * 0.84, y + rect.h * (pseudo(seed + i) * 0.035));
      ctx.stroke();
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

function canvasFontFamily(font: string, generic: "serif" | "sans-serif" | "monospace") {
  const cleanFont = font.replace(/"/g, "");
  return cleanFont.includes(" ") ? `"${cleanFont}", ${generic}` : `${cleanFont}, ${generic}`;
}

function drawSoftCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, colorWithAlpha(color, alpha));
  glow.addColorStop(1, colorWithAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function colorWithAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawAuthorPhotoBackMatter(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  template: CoverTemplate,
  image: HTMLImageElement,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = rect.w * 0.16;
  ctx.shadowOffsetY = rect.w * 0.045;
  ctx.fillStyle = template.dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";
  roundRect(ctx, rect.x - rect.w * 0.045, rect.y - rect.w * 0.045, rect.w * 1.09, rect.h * 1.07, rect.w * 0.035, true, false);
  ctx.restore();

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.w * 0.025, false, false);
  ctx.clip();
  drawImageCover(ctx, image, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = Math.max(3, rect.w * 0.022);
  ctx.strokeStyle = template.accentColor;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.w * 0.025, false, true);
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
