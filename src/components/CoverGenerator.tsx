import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, ImagePlus, Settings2, Upload, Wand2, X, LayoutTemplate, Type, Image as ImageIcon, Layers, CheckCircle2 } from "lucide-react";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { requireCreditsAsync } from "@/lib/billing";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { buildCoverStudioPackage, recommendTemplate, COVER_TEMPLATES } from "@/lib/cover-studio";
import { getProjectCoverDataUrl, getProjectCoverComposition, saveProjectCoverFull } from "@/lib/cover-session";
import { CoverStudioPro } from "@/components/cover/CoverStudioPro";
import { CoverPreviewStage } from "@/components/cover/CoverPreviewStage";
import {
  migrateComposition,
  syncTextLayerContent,
  syncBackMatterContent,
  upsertFrontImageLayer,
  createStoredCoverImage,
  getStoredImageDataUrl,
  type CoverComposition,
} from "@/lib/cover-studio/cover-layers";
import { serializeCoverComposition, validateCoverComposition } from "@/lib/cover-studio/cover-composition-utils";
import { recommendBackgroundForGenre, drawBackgroundPreset, getBackgroundById } from "@/lib/cover-studio/cover-backgrounds";
import { drawComposedFrontCover, drawPanelImageLayers } from "@/lib/cover-studio/cover-canvas-compose";
import { drawComposedBackMatter, drawComposedSpine } from "@/lib/cover-studio/cover-back-matter-compose";
import { drawPrintSafeGuides, COVER_VIEW_MODES, type CoverViewMode } from "@/lib/cover-studio/cover-view-modes";
import { useMobileForgeBodyLock } from "@/hooks/useMobileForgeViewport";
import { drawWrapPremiumFinish, drawBackPanelBase } from "@/lib/cover-studio/cover-wrap-render";
import { sanitizeCoverVisibleText } from "@/lib/cover-studio/cover-text-sanitize";
import { runCinematicGenerateSequence } from "@/lib/cover-studio/cover-cinematic-generate";
import { CoverCinematicOverlay } from "@/components/cover/CoverCinematicOverlay";
import { toast } from "sonner";
import { creditModeDisclosure, creditModeLabel } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";
import { Badge } from "@/components/ui/badge";

interface CoverGeneratorProps {
  title: string;
  subtitle: string;
  authorName?: string;
  description?: string;
  authorBio?: string;
  genre?: string;
  language?: string;
  marketplace?: string;
  projectId?: string;
  primaryActionLabel?: string;
  showPrimaryAction?: boolean;
  onGenerate: (dataUrl: string) => void;
  onClose: () => void;
  onOpenExport?: () => void;
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
  { id: "a4", label: "A4 (8.27 x 11.69 in)", width: 8.27, height: 11.69 },
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
  genre = "",
  language = "Italian",
  marketplace,
  projectId,
  primaryActionLabel = "Usa per EPUB",
  showPrimaryAction = true,
  onGenerate,
  onClose,
  onOpenExport,
}: CoverGeneratorProps) {
  const devCreditMode = isDevMode();
  const italianUi = language.toLowerCase().includes("ital");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderFrameRef = useRef<number | null>(null);
  const renderSeqRef = useRef(0);
  const pendingRegenRef = useRef(
    Boolean(
      projectId &&
        getProjectCoverComposition(projectId) &&
        !getProjectCoverDataUrl(projectId)?.startsWith("data:image"),
    ),
  );
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
    sanitizeCoverVisibleText(
      description,
      "Scrivi qui una descrizione editoriale del libro: promessa, conflitto, tono e motivo per cui il lettore dovrebbe aprirlo.",
    ),
  );
  const [coverAuthorBio, setCoverAuthorBio] = useState(
    sanitizeCoverVisibleText(authorBio || selectedIdentity?.biography, "Breve bio autore, credibilità e nota editoriale."),
  );
  const [backTagline, setBackTagline] = useState("Una storia creata con Scriptora OS");
  const [backReviewQuote, setBackReviewQuote] = useState("");
  const [cinematicStep, setCinematicStep] = useState<string | null>(null);
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [trimId, setTrimId] = useState("6x9");
  const [pageCount, setPageCount] = useState(260);
  const [paperType, setPaperType] = useState<PaperType>("cream");
  const [customWidth, setCustomWidth] = useState(6);
  const [customHeight, setCustomHeight] = useState(9);
  const [customSpine, setCustomSpine] = useState(0.65);
  const [dpi, setDpi] = useState(300);
  const [imageFit, setImageFit] = useState<ImageFit>("cover");
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
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [coverSaved, setCoverSaved] = useState(() => Boolean(projectId && getProjectCoverDataUrl(projectId)));
  const [dataMode, setDataMode] = useState<"template" | "ai-assisted" | "upload">("template");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isMobileStudio, setIsMobileStudio] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  const [mobileToolTab, setMobileToolTab] = useState<
    "template" | "text" | "image" | "layout" | "readiness" | "export"
  >("template");

  useMobileForgeBodyLock(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileStudio(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const mobileStudioTabFilter =
    mobileToolTab === "template"
      ? "style"
      : mobileToolTab === "text"
        ? "text"
        : mobileToolTab === "image"
          ? "images"
          : mobileToolTab === "layout"
            ? "layers"
            : mobileToolTab === "readiness"
              ? "readiness"
              : null;

  const [composition, setComposition] = useState<CoverComposition>(() => {
    const bg = recommendBackgroundForGenre(genre || "");
    const fallback = {
      title: title || "Untitled Book",
      subtitle: subtitle || "",
      author: authorName || "",
      templateId: "",
      templateIndex: 0,
      backgroundPresetId: bg.id,
      tagline: "Una storia creata con Scriptora OS",
      blurb: description || "",
      bio: authorBio || "",
      quote: "",
    };
    if (projectId) {
      const raw = getProjectCoverComposition(projectId);
      if (raw) {
        try {
          return migrateComposition(JSON.parse(raw), fallback);
        } catch {
          /* use defaults */
        }
      }
    }
    return migrateComposition(null, fallback);
  });

  useEffect(() => {
    if (composition.imageFit) setImageFit(composition.imageFit);
  }, [composition.imageFit]);

  const frontCoverImage = composition.images?.front ?? null;
  const frontCoverImageUrl = getStoredImageDataUrl(frontCoverImage);
  const backCoverImageUrl = getStoredImageDataUrl(composition.images?.back);

  const studioPackage = useMemo(
    () =>
      buildCoverStudioPackage(
        {
          title: coverTitle,
          author: coverAuthor,
          subtitle: coverSubtitle,
          genre: coverGenreBrief || genre,
          language,
          marketplace,
        },
        {
          templateId: selectedTemplateId || undefined,
          dataMode,
          hasSavedCover: coverSaved,
          darkTemplate: TEMPLATES[selectedTemplate]?.dark,
          hasUpload: Boolean(frontCoverImageUrl),
        },
      ),
    [
      coverTitle,
      coverAuthor,
      coverSubtitle,
      coverGenreBrief,
      genre,
      language,
      marketplace,
      selectedTemplateId,
      dataMode,
      coverSaved,
      selectedTemplate,
      frontCoverImage,
    ],
  );

  useEffect(() => {
    if (!genre && !coverGenreBrief) return;
    const rec = recommendTemplate(studioPackage.brief.genreFamily);
    if (!selectedTemplateId) {
      setSelectedTemplateId(rec.id);
      setSelectedTemplate(rec.templateIndex);
    }
  }, [genre, coverGenreBrief, studioPackage.brief.genreFamily, selectedTemplateId]);

  const template = TEMPLATES[selectedTemplate];
  const resolveFont = (font: string) => (font === "Template" ? template.font : font);
  const spec = useMemo(
    () => getCoverSpec(mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi),
    [mode, trimId, pageCount, paperType, customWidth, customHeight, customSpine, dpi],
  );

  useEffect(() => {
    setComposition((c) => ({
      ...c,
      layers: syncTextLayerContent(c.layers, coverTitle, coverSubtitle, coverAuthor),
    }));
  }, [coverTitle, coverSubtitle, coverAuthor]);

  useEffect(() => {
    setComposition((c) => ({
      ...c,
      layers: syncBackMatterContent(
        c.layers,
        backTagline,
        bookDescription,
        coverAuthorBio,
        backReviewQuote,
        coverTitle,
        coverAuthor,
      ),
    }));
  }, [backTagline, bookDescription, coverAuthorBio, backReviewQuote, coverTitle, coverAuthor]);

  useEffect(() => {
    let cancelled = false;
    const seq = renderSeqRef.current + 1;
    renderSeqRef.current = seq;
    if (renderFrameRef.current != null) {
      cancelAnimationFrame(renderFrameRef.current);
    }
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null;
      void (async () => {
      try {
        await drawCover();
      } catch (err) {
        console.warn("[cover-studio] preview render failed", err);
        return;
      }
      if (seq !== renderSeqRef.current) return;
      if (cancelled || !projectId || !pendingRegenRef.current) return;
      const dataUrl = exportCoverDataUrl();
      if (!dataUrl) return;
      pendingRegenRef.current = false;
      persistCover(dataUrl);
      onGenerate(dataUrl);
      toast.message(
        italianUi ? "Anteprima cover rigenerata dalla composizione salvata" : "Cover preview regenerated from saved composition",
      );
      })();
    });
    return () => {
      cancelled = true;
      if (renderFrameRef.current != null) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
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
    frontCoverImageUrl,
    backCoverImageUrl,
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
    composition,
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
      const photoSrc = showAuthorPhoto
        ? (authorPhoto ?? getStoredImageDataUrl(composition.images?.authorPhoto) ?? null)
        : null;
      if (photoSrc) {
        try {
          authorImage = await loadImage(photoSrc);
        } catch {
          authorImage = null;
        }
      }
      drawPanelTint(ctx, spec.backRect, template, 0.06);
      drawPanelTint(ctx, spec.spineRect, template, 0.12);
      drawPanelTint(ctx, spec.frontRect, template, 0.04);
      if (!frontCoverImageUrl) {
        await drawComposedFrontCover(ctx, spec.frontRect, {
          composition,
          template,
          seed: scriptoraSeed,
          imageFit,
          loadImage,
          legacyDraw: () => {
            drawTemplateBackground(ctx, spec.frontRect, template, scriptoraSeed + 11);
            drawScriptoraAiScene(ctx, spec.frontRect, template, scriptoraSeed, scriptoraArtDirection);
            drawCoverOrnaments(ctx, spec.frontRect, template, scriptoraSeed);
          },
        });
      } else {
        await drawComposedFrontCover(ctx, spec.frontRect, {
          composition,
          template,
          uploadedImage: frontCoverImageUrl,
          imageFit,
          loadImage,
          seed: scriptoraSeed,
        });
      }
      const drawBackProcedural = () => {
        const bg = getBackgroundById(composition.backgroundPresetId);
        if (bg) {
          drawBackgroundPreset(ctx, spec.backRect, bg, scriptoraSeed + 3);
        } else {
          const grad = ctx.createLinearGradient(spec.backRect.x, spec.backRect.y, spec.backRect.x + spec.backRect.w, spec.backRect.y + spec.backRect.h);
          grad.addColorStop(0, template.dark ? "#0a0a0c" : "#f8f4ec");
          grad.addColorStop(1, template.dark ? "#1a1420" : "#e8e0d0");
          ctx.fillStyle = grad;
          ctx.fillRect(spec.backRect.x, spec.backRect.y, spec.backRect.w, spec.backRect.h);
        }
      };
      await drawBackPanelBase(ctx, spec.backRect, {
        backImageDataUrl: backCoverImageUrl,
        backgroundDraw: drawBackProcedural,
        loadImage,
        fit: composition.imageFit ?? imageFit,
      });
      drawComposedBackMatter(ctx, spec.backRect, composition, template, {
        authorImage: showAuthorPhoto ? authorImage : null,
        seed: scriptoraSeed,
        skipBackground: Boolean(backCoverImageUrl),
      });
      await drawPanelImageLayers(ctx, spec.backRect, composition, "back", loadImage);
      drawComposedSpine(ctx, spec.spineRect, composition, template);
      if (composition.showPrintGuides) drawPrintSafeGuides(ctx, spec, italianUi);
      if (showGuides) drawPrintGuides(ctx, spec, template);
      drawWrapPremiumFinish(ctx, spec, {
        showLabels: composition.wrapLabels !== false && Boolean(composition.showPrintGuides),
        italian: italianUi,
      });
    } else {
      if (!frontCoverImageUrl) {
        await drawComposedFrontCover(ctx, spec.frontRect, {
          composition,
          template,
          seed: scriptoraSeed,
          imageFit,
          loadImage,
          legacyDraw: () => {
            drawTemplateBackground(ctx, spec.frontRect, template, scriptoraSeed + 11);
            drawScriptoraAiScene(ctx, spec.frontRect, template, scriptoraSeed, scriptoraArtDirection);
            drawCoverOrnaments(ctx, spec.frontRect, template, scriptoraSeed);
          },
        });
      } else {
        await drawComposedFrontCover(ctx, spec.frontRect, {
          composition,
          template,
          uploadedImage: frontCoverImageUrl,
          imageFit,
          loadImage,
          seed: scriptoraSeed,
        });
      }
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

    ctx.fillStyle = coverTemplate.accentColor;
    ctx.font = `600 ${clamp(Math.round(rect.w * 0.018), 14, 28)}px Arial, sans-serif`;
    ctx.letterSpacing = "0px";
    ctx.fillText(backTagline.toUpperCase().slice(0, 58), x, rect.y + rect.h * 0.16);

    drawAccentRule(ctx, rect.x + marginX, rect.y + rect.h * 0.24, rect.w - marginX * 2, coverTemplate);

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

  function persistCover(dataUrl: string) {
    if (!projectId) return;
    const compositionJson = serializeCoverComposition(composition);
    const result = saveProjectCoverFull(projectId, dataUrl, compositionJson);
    setCoverSaved(result.ok && result.dataUrlSaved);
    if (result.error) toast.error(result.error);
    if (result.warning) toast.message(result.warning);
  }

  function handleSaveToProject() {
    const validation = validateCoverComposition(composition);
    if (!validation.valid) {
      toast.error(validation.errors[0] ?? "Composizione cover non valida");
      return;
    }
    const dataUrl = exportCoverDataUrl();
    if (!projectId) return;
    const compositionJson = serializeCoverComposition(composition);
    const result = saveProjectCoverFull(projectId, dataUrl, compositionJson);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warning) toast.message(result.warning);
    if (result.ok && dataUrl) {
      setCoverSaved(true);
      onGenerate(dataUrl);
      toast.success(italianUi ? "Cover salvata nel progetto" : "Cover saved to project");
    } else if (result.compositionSaved) {
      toast.success(italianUi ? "Composizione salvata — rigenera anteprima con Salva" : "Composition saved — regenerate preview on save");
    }
  }

  function exportCoverDataUrl(): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!spec.isPrint) return canvas.toDataURL("image/jpeg", 0.95);
    const front = document.createElement("canvas");
    front.width = EPUB_WIDTH;
    front.height = EPUB_HEIGHT;
    const ctx = front.getContext("2d");
    if (!ctx) return null;
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
    return front.toDataURL("image/jpeg", 0.95);
  }

  function handleUseForEpub() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!spec.isPrint) {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      persistCover(dataUrl);
      onGenerate(dataUrl);
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
    const dataUrl = front.toDataURL("image/jpeg", 0.95);
    persistCover(dataUrl);
    onGenerate(dataUrl);
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
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image")) {
        toast.error(italianUi ? "Formato immagine non valido" : "Invalid image format");
        return;
      }
      setComposition((c) => ({
        ...c,
        updatedAt: new Date().toISOString(),
        images: { ...c.images, front: createStoredCoverImage(dataUrl, "front", file.name, imageFit) },
        imageFit,
        layers: upsertFrontImageLayer(c.layers, dataUrl),
      }));
      setDataMode("upload");
      toast.success(italianUi ? "Immagine caricata" : "Image uploaded");
    };
    reader.onerror = () => {
      toast.error(italianUi ? "Errore lettura file" : "File read error");
    };
    reader.readAsDataURL(file);
  }

  function handleBackImageUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image")) return;
      setComposition((c) => ({
        ...c,
        updatedAt: new Date().toISOString(),
        images: { ...c.images, back: createStoredCoverImage(dataUrl, "back", file.name, imageFit) },
      }));
      toast.success(italianUi ? "Immagine retro caricata" : "Back image uploaded");
    };
    reader.readAsDataURL(file);
  }

  function clearBackImage() {
    setComposition((c) => ({
      ...c,
      images: { ...c.images, back: null },
      updatedAt: new Date().toISOString(),
    }));
  }

  function clearFrontImage() {
    setComposition((c) => ({
      ...c,
      images: { ...c.images, front: null },
      layers: upsertFrontImageLayer(c.layers, null),
      updatedAt: new Date().toISOString(),
    }));
    setDataMode("template");
  }

  function handleAuthorPhotoUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAuthorPhoto(dataUrl);
      setShowAuthorPhoto(true);
      setComposition((c) => ({
        ...c,
        images: { ...c.images, authorPhoto: dataUrl },
        updatedAt: new Date().toISOString(),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function generateScriptoraBackground() {
    try {
      await requireCreditsAsync("cover_generation", { source: "cover_studio_background" });
    } catch {
      return;
    }
    setCinematicStep("analyze");
    setCinematicProgress(0);
    await runCinematicGenerateSequence(
      (stepId, progress) => {
        setCinematicStep(stepId);
        setCinematicProgress(progress);
      },
      async () => {
        const direction = inferScriptoraArtDirection([
          coverGenreBrief,
          coverTitle,
          coverSubtitle,
          bookDescription,
          backTagline,
        ].join(" "));
        setComposition((c) => ({
          ...c,
          images: { ...c.images, front: null },
          layers: upsertFrontImageLayer(c.layers, null),
        }));
        setSelectedTemplate(direction.templateIndex);
        setScriptoraArtDirection(direction);
        setScriptoraSeed(direction.seed + Date.now() % 997);
        setDataMode("ai-assisted");
        const rec = recommendTemplate(studioPackage.brief.genreFamily);
        setSelectedTemplateId(rec.id);
        const recBg = recommendBackgroundForGenre(coverGenreBrief || genre || direction.label);
        setComposition((c) => ({ ...c, backgroundPresetId: recBg.id }));
      },
    );
    setTimeout(() => setCinematicStep(null), 600);
  }

  return (
    <div className="scriptora-cover-studio-root scriptora-mobile-enter scriptora-cover-studio-overlay fixed inset-0 z-[120] flex h-[100dvh] w-[100dvw] items-stretch justify-center overflow-hidden bg-[#07070b] p-0">
      <div className="scriptora-modal-panel scriptora-cover-studio-panel fixed inset-0 flex h-[100dvh] max-h-none w-[100dvw] max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-card shadow-2xl">
        <div className="scriptora-cover-studio-header flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-background/96 px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:gap-3 sm:px-5 sm:py-3.5 lg:px-6 lg:py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-primary sm:gap-2 sm:text-xs sm:tracking-[0.2em]">
              <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Cover Studio Pro</span>
            </div>
            <h2 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-snug text-foreground sm:text-base lg:text-lg">
              Builder copertina digitale — concept cover avanzato
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1 max-sm:hidden">
              <Badge variant="outline" className="px-1.5 py-0 text-[9px] sm:text-[10px]">{studioPackage.honestyLabel}</Badge>
              <Badge variant="secondary" className="px-1.5 py-0 text-[9px] sm:text-[10px]">Score {studioPackage.score.finalScore}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {projectId && (
              <button
                type="button"
                onClick={handleSaveToProject}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/18"
              >
                <ImagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">{italianUi ? "Salva" : "Save"}</span>
              </button>
            )}
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-background"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
          </div>
        </div>

        <div className="scriptora-cover-studio-workspace flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[330px_minmax(0,1fr)_380px] lg:overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)_430px]">
          <div className="scriptora-cover-studio-preview order-1 flex min-h-0 flex-1 flex-col border-b border-border/50 bg-black/25 px-3 py-3 sm:px-4 sm:py-4 lg:order-2 lg:min-h-0 lg:items-center lg:justify-center lg:overflow-hidden lg:border-x lg:border-b-0 lg:border-border/50 lg:bg-gradient-to-br lg:from-black/45 lg:via-background/80 lg:to-primary/10 lg:p-6 xl:p-8">
            <div className="hidden w-full flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground lg:absolute lg:left-8 lg:right-8 lg:top-6 lg:flex lg:w-auto lg:rounded-2xl lg:border lg:border-white/10 lg:bg-background/35 lg:px-4 lg:py-3 lg:backdrop-blur-xl">
              <span>{spec.label}</span>
              <span>{spec.width} x {spec.height}px - {spec.exportNote}</span>
            </div>
            <div className="mb-2 flex w-full shrink-0 flex-wrap items-center justify-center gap-1 lg:hidden">
              {COVER_VIEW_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setComposition((c) => ({ ...c, viewMode: m.id as CoverViewMode, updatedAt: new Date().toISOString() }))
                  }
                  className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                    (composition.viewMode ?? "front") === m.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {italianUi ? m.labelIt : m.labelEn}
                </button>
              ))}
            </div>
            <div className="mb-2 flex w-full shrink-0 flex-wrap items-center justify-center gap-1 lg:hidden">
              {(
                [
                  ["epub", "Ebook"],
                  ["kdp", "KDP"],
                  ["lulu", "Lulu"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                    mode === value ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 lg:h-full lg:w-full lg:gap-3 lg:pt-8">
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-white/[0.035] lg:p-4 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_80px_rgba(0,0,0,0.45)] xl:p-6">
                {cinematicStep && cinematicStep !== "done" && (
                  <CoverCinematicOverlay stepId={cinematicStep} progress={cinematicProgress} italianUi={italianUi} />
                )}
                <CoverPreviewStage
                  composition={composition}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onCompositionChange={setComposition}
                  canvasRef={canvasRef}
                  italianUi={italianUi}
                  spec={spec}
                  viewMode={composition.viewMode ?? "front"}
                  activePanel={composition.activePanel ?? "front"}
                  onActivePanelChange={(panel) => setComposition((c) => ({ ...c, activePanel: panel }))}
                  canvasClassName="rounded-lg shadow-xl ring-1 ring-white/10 lg:rounded-2xl"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{italianUi ? "Potenza miniatura" : "Thumbnail power"}</span>
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  {studioPackage.score.thumbnailReadability}/100
                </Badge>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground lg:hidden">
              {spec.label} · {spec.width}×{spec.height}px
            </p>
          </div>

          {isMobileStudio && (
            <div className="scriptora-cover-studio-mobile-tools order-2 flex min-h-0 shrink-0 flex-col border-t border-border/60 bg-background/95 lg:hidden">
              <nav className="grid grid-cols-6 gap-0.5 border-b border-border/50 p-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]">
                <MobileCoverTabButton
                  active={mobileToolTab === "template"}
                  label={italianUi ? "Template" : "Template"}
                  icon={LayoutTemplate}
                  onClick={() => setMobileToolTab("template")}
                />
                <MobileCoverTabButton
                  active={mobileToolTab === "text"}
                  label="Testo"
                  icon={Type}
                  onClick={() => setMobileToolTab("text")}
                />
                <MobileCoverTabButton
                  active={mobileToolTab === "image"}
                  label="Image"
                  icon={ImageIcon}
                  onClick={() => setMobileToolTab("image")}
                />
                <MobileCoverTabButton
                  active={mobileToolTab === "layout"}
                  label="Layout"
                  icon={Layers}
                  onClick={() => setMobileToolTab("layout")}
                />
                <MobileCoverTabButton
                  active={mobileToolTab === "readiness"}
                  label="Ready"
                  icon={CheckCircle2}
                  onClick={() => setMobileToolTab("readiness")}
                />
                <MobileCoverTabButton
                  active={mobileToolTab === "export"}
                  label="Export"
                  icon={Download}
                  onClick={() => setMobileToolTab("export")}
                />
              </nav>
              <div className="scriptora-cover-studio-scroll max-h-[min(36dvh,320px)] min-h-0 overflow-y-auto overscroll-contain p-3">
                {mobileToolTab === "export" ? (
                  <div className="space-y-2">
                    {showPrimaryAction && (
                      <button
                        type="button"
                        onClick={handleUseForEpub}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {primaryActionLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      Scarica PNG
                    </button>
                    {projectId && (
                      <button
                        type="button"
                        onClick={handleSaveToProject}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 text-sm font-semibold text-primary"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {italianUi ? "Salva progetto" : "Save project"}
                      </button>
                    )}
                  </div>
                ) : mobileStudioTabFilter ? (
                  <CoverStudioPro
                    hideHeader
                    mobileTabFilter={mobileStudioTabFilter}
                    pkg={studioPackage}
                    italianUi={italianUi}
                    composition={composition}
                    onCompositionChange={setComposition}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={setSelectedLayerId}
                    genre={coverGenreBrief || genre}
                    selectedTemplateId={selectedTemplateId || studioPackage.recommendedTemplateId}
                    onSelectVariant={(idx, id) => {
                      setSelectedTemplate(idx);
                      setSelectedTemplateId(id);
                      setDataMode("template");
                      setComposition((c) => ({ ...c, templateId: id, templateIndex: idx }));
                    }}
                    onSaveProject={projectId ? handleSaveToProject : undefined}
                    onOpenExport={onOpenExport}
                    saved={coverSaved}
                    coverTitle={coverTitle}
                    coverSubtitle={coverSubtitle}
                    coverAuthor={coverAuthor}
                    onTitleChange={setCoverTitle}
                    onSubtitleChange={setCoverSubtitle}
                    onAuthorChange={setCoverAuthor}
                    backTagline={backTagline}
                    backBlurb={bookDescription}
                    backBio={coverAuthorBio}
                    backQuote={backReviewQuote}
                    onBackTaglineChange={setBackTagline}
                    onBackBlurbChange={setBookDescription}
                    onBackBioChange={setCoverAuthorBio}
                    onBackQuoteChange={setBackReviewQuote}
                    onUploadBackImage={handleBackImageUpload}
                    onUploadFrontImage={handleUpload}
                    onRemoveFrontImage={clearFrontImage}
                    onRemoveBackImage={clearBackImage}
                    hasFrontImage={Boolean(frontCoverImageUrl)}
                    hasBackImage={Boolean(backCoverImageUrl)}
                    imageFit={imageFit}
                    onImageFitChange={(fit) => {
                      setImageFit(fit);
                      setComposition((c) => ({ ...c, imageFit: fit, updatedAt: new Date().toISOString() }));
                    }}
                    isPrintMode={spec.isPrint}
                    spineWidthIn={spec.spineIn}
                    pageCount={pageCount}
                    hasAuthorPhoto={showAuthorPhoto && Boolean(authorPhoto)}
                  />
                ) : null}
              </div>
            </div>
          )}

          <aside className="scriptora-cover-studio-tools order-2 hidden min-h-0 border-b border-border/60 bg-background/80 lg:order-1 lg:flex lg:flex-col lg:overflow-hidden lg:border-b-0">
            <div className="scriptora-cover-studio-scroll scriptora-modal-body min-h-0 flex-1 space-y-5 overflow-visible bg-background/55 p-3 pb-4 sm:space-y-6 sm:p-5 lg:overflow-y-auto lg:overscroll-contain lg:bg-background/75 lg:p-5">
            <section className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{creditModeLabel(devCreditMode)}</span>
              {" · "}
              {italianUi ? "Genera sfondo AI consuma crediti. Salvataggio cover gratuito." : "AI background uses credits. Saving cover is free."}
              <p className="mt-1">{creditModeDisclosure(devCreditMode)}</p>
            </section>

            <CoverStudioPro
              pkg={studioPackage}
              italianUi={italianUi}
              composition={composition}
              onCompositionChange={setComposition}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              genre={coverGenreBrief || genre}
              selectedTemplateId={selectedTemplateId || studioPackage.recommendedTemplateId}
              onSelectVariant={(idx, id) => {
                setSelectedTemplate(idx);
                setSelectedTemplateId(id);
                setDataMode("template");
                setComposition((c) => ({ ...c, templateId: id, templateIndex: idx }));
              }}
              onSaveProject={projectId ? handleSaveToProject : undefined}
              onOpenExport={onOpenExport}
              saved={coverSaved}
              coverTitle={coverTitle}
              coverSubtitle={coverSubtitle}
              coverAuthor={coverAuthor}
              onTitleChange={setCoverTitle}
              onSubtitleChange={setCoverSubtitle}
              onAuthorChange={setCoverAuthor}
              backTagline={backTagline}
              backBlurb={bookDescription}
              backBio={coverAuthorBio}
              backQuote={backReviewQuote}
              onBackTaglineChange={setBackTagline}
              onBackBlurbChange={setBookDescription}
              onBackBioChange={setCoverAuthorBio}
              onBackQuoteChange={setBackReviewQuote}
              onUploadBackImage={handleBackImageUpload}
              onUploadFrontImage={handleUpload}
              onRemoveFrontImage={clearFrontImage}
              onRemoveBackImage={clearBackImage}
              hasFrontImage={Boolean(frontCoverImageUrl)}
              hasBackImage={Boolean(backCoverImageUrl)}
              imageFit={imageFit}
              onImageFitChange={(fit) => {
                setImageFit(fit);
                setComposition((c) => ({ ...c, imageFit: fit, updatedAt: new Date().toISOString() }));
              }}
              isPrintMode={spec.isPrint}
              spineWidthIn={spec.spineIn}
              pageCount={pageCount}
              hasAuthorPhoto={showAuthorPhoto && Boolean(authorPhoto)}
            />
            </div>
          </aside>

          <aside className="scriptora-cover-studio-properties order-3 hidden min-h-0 bg-background/85 lg:flex lg:flex-col lg:overflow-hidden">
            <div className="scriptora-cover-studio-scroll scriptora-modal-body min-h-0 flex-1 space-y-5 overflow-visible bg-background/55 p-3 pb-4 sm:space-y-6 sm:p-5 lg:overflow-y-auto lg:overscroll-contain lg:bg-background/75 lg:p-5">
            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span>{italianUi ? "Formato" : "Format"}</span>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {italianUi
                    ? "EPUB, KDP, Lulu o custom — dimensioni stampa, pagine e bleed."
                    : "EPUB, KDP, Lulu or custom — trim size, pages and bleed."}
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

            </section>

            <details className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <summary className="cursor-pointer text-sm font-semibold text-foreground list-none">
                {italianUi ? "Impostazioni testo avanzate (compatibilità)" : "Advanced text settings (compatibility)"}
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                {italianUi
                  ? "Usa il tab Testo in Cover Studio Pro per titolo, sottotitolo e autore. Qui restano solo opzioni legacy font/scale."
                  : "Use Cover Studio Pro Text tab for title, subtitle and author. Legacy font/scale only here."}
              </p>
              <div className="grid gap-3 pt-2 max-lg:grid-cols-1 lg:grid-cols-3">
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
            </details>

            <details className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <summary className="cursor-pointer text-sm font-semibold text-foreground list-none">
                {italianUi ? "Retro copertina (avanzato)" : "Back matter (advanced)"}
              </summary>
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
                  onBlur={(e) =>
                    setBookDescription(sanitizeCoverVisibleText(e.target.value, bookDescription))
                  }
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Bio autore</span>
                <textarea
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={coverAuthorBio}
                  onChange={(e) => setCoverAuthorBio(e.target.value)}
                  onBlur={(e) =>
                    setCoverAuthorBio(sanitizeCoverVisibleText(e.target.value, coverAuthorBio))
                  }
                />
              </label>
            </details>

            <section className="space-y-3 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/55 lg:p-5 lg:shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {italianUi ? "Sfondo AI" : "AI background"}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {italianUi
                    ? "Scriptora genera solo lo sfondo procedurale. Carica fronte/retro dal tab Immagini in Cover Studio Pro."
                    : "Scriptora generates procedural background only. Upload front/back from Images tab in Cover Studio Pro."}
                </p>
              </div>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Genere / atmosfera AI</span>
                <input
                  value={coverGenreBrief}
                  onChange={(e) => setCoverGenreBrief(e.target.value)}
                  placeholder="es. thriller psicologico, romance dark, business self-help..."
                  className="w-full bg-surface border border-border rounded-lg lg:rounded-xl px-3 py-2 lg:py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <div className="grid grid-cols-1 gap-2 lg:gap-3">
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={generateScriptoraBackground}
                    className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/12 px-3 py-2 lg:py-3 text-xs lg:text-sm font-semibold text-primary hover:bg-primary/18 transition-colors"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span>{italianUi ? "Genera sfondo Scriptora" : "Generate Scriptora background"}</span>
                  </button>
                  <CreditCostBadge operation="cover_generation" prominent className="self-center" />
                </div>
              </div>
              {scriptoraArtDirection && (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] leading-4 text-primary">
                  Direzione AI: {scriptoraArtDirection.label}. Sfondo generato senza testo incorporato.
                </div>
              )}

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
                        className="rounded-lg lg:rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 lg:py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors"
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
            </section>
            </div>

            <footer className="scriptora-cover-studio-footer sticky bottom-0 z-20 shrink-0 border-t border-border/70 bg-background/98 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-5 lg:border lg:bg-card/90 lg:p-5">
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-foreground">EXPORT</p>
                <p className="mt-1 text-xs text-muted-foreground">Scarica, salva o applica la cover al progetto corrente.</p>
              </div>
              <div className="mt-0 flex flex-col gap-2 lg:mt-3 lg:grid lg:grid-cols-3 lg:gap-3">
                {showPrimaryAction && (
                  <button
                    onClick={handleUseForEpub}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:py-3.5"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {primaryActionLabel}
                  </button>
                )}
                <div className={`grid gap-2 ${showPrimaryAction || projectId ? "grid-cols-2" : "grid-cols-1"} lg:contents`}>
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface/80 lg:py-3.5"
                  >
                    <Download className="h-4 w-4" />
                    Scarica PNG
                  </button>
                  {projectId && (
                    <button
                      onClick={handleSaveToProject}
                      className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 lg:py-3.5"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {italianUi ? "Salva progetto" : "Save project"}
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MobileCoverTabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof LayoutTemplate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[9px] font-semibold transition ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5">
            <input
              type="color"
              value={colorValue}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-8 w-10 shrink-0 rounded-lg border border-border bg-background p-1"
              aria-label={`Colore ${label}`}
            />
            <div className="flex flex-nowrap gap-1.5">
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

function inferScriptoraArtDirection(source: string): ScriptoraArtDirection {
  const text = source.toLowerCase();
  const profiles: Array<{
    motif: ScriptoraMotif;
    label: string;
    templateIndex: number;
    keywords: string[];
  }> = [
    {
      motif: "thriller",
      label: "thriller cinematico",
      templateIndex: 2,
      keywords: ["thriller", "noir", "crime", "giallo", "mistero", "detective", "killer", "dark", "suspense", "horror", "paura", "segreto"],
    },
    {
      motif: "romance",
      label: "romance emozionale",
      templateIndex: 4,
      keywords: ["romance", "amore", "love", "cuore", "passione", "sentimenti", "relazione", "dark romance", "bacio", "desiderio"],
    },
    {
      motif: "business",
      label: "business / self-help premium",
      templateIndex: 3,
      keywords: ["business", "self-help", "self help", "crescita", "produttivita", "successo", "mindset", "marketing", "finanza", "manuale", "guida"],
    },
    {
      motif: "fantasy",
      label: "fantasy epico",
      templateIndex: 9,
      keywords: ["fantasy", "magia", "mago", "regno", "drago", "spada", "epico", "mito", "destino", "strega", "incantesimo"],
    },
    {
      motif: "scifi",
      label: "sci-fi futuristico",
      templateIndex: 7,
      keywords: ["sci-fi", "scifi", "fantascienza", "futuro", "cyber", "robot", "ai", "spazio", "astronave", "tecnologia", "distopia"],
    },
    {
      motif: "memoir",
      label: "memoir editoriale",
      templateIndex: 5,
      keywords: ["memoir", "biografia", "autobiografia", "memorie", "vita", "ricordo", "famiglia", "viaggio", "testimonianza"],
    },
    {
      motif: "historical",
      label: "storico classico",
      templateIndex: 8,
      keywords: ["storico", "storia", "guerra", "antico", "medioevo", "rinascimento", "vintage", "epoca", "classico"],
    },
    {
      motif: "literary",
      label: "narrativa letteraria",
      templateIndex: 0,
      keywords: ["romanzo", "narrativa", "literary", "letterario", "dramma", "famiglia", "segreti", "citta", "psicologico"],
    },
  ];

  const best = profiles
    .map((profile) => ({
      ...profile,
      score: profile.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
  const fallback = profiles[profiles.length - 1];
  const selected = best && best.score > 0 ? best : fallback;

  return {
    motif: selected.motif,
    label: selected.label,
    templateIndex: selected.templateIndex,
    seed: stableSeed(`${selected.motif}-${source}`),
  };
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

function stableSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
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
