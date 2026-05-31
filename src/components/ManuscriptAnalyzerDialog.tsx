import { useMemo, useRef, useState } from "react";
import { analyzeNovel, calculateEditorialChapterScore, detectEditorialGenre } from "@/lib/EditorialIntelligence";
import { useNavigate } from "react-router-dom";
import { MANUSCRIPT_FILE_ACCEPT, normalizeImportedProject, persistImportDraft, readManuscriptFile, titleFromFileName } from "@/lib/manuscript-import";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Upload,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createProjectId, saveProjectAsync } from "@/services/storageService";
import { BookConfig, BookProject, Chapter, Genre, Language } from "@/types/book";
import { cn } from "@/lib/utils";
import { t, tt, useUILanguage, getScriptoraLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import {
  analyzeManuscriptPublishingIntel,
  severityTone,
  tierTone,
  type ManuscriptPublishingIntel,
} from "@/lib/publishing-intelligence";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";
import { ScriptoraPremiumState } from "@/components/ScriptoraPremiumState";
import { buildRequirement, type RequirementId } from "@/lib/scriptora-requirement-gate";

interface ManuscriptAnalyzerDialogProps {
  open: boolean;
  onClose: () => void;
  canCreateProject?: boolean;
  onLimitReached?: () => void;
  embedded?: boolean;
}

interface EditorialSignal {
  key: string;
  values?: Record<string, string | number>;
  text?: string;
  priority?: boolean;
}

interface ManuscriptChapterAnalysis {
  title: string;
  content: string;
  words: number;
  paragraphs: number;
  avgSentenceWords: number;
  longSentenceRatio: number;
  repetitionDensity: number;
  score: number;
  strengths: EditorialSignal[];
  issues: EditorialSignal[];
  advice: EditorialSignal[];
}

interface ManuscriptAnalysis {
  title: string;
  sourceName: string;
  words: number;
  score: number;
  chapters: ManuscriptChapterAnalysis[];
  recommendations: EditorialSignal[];
  summaryKey: string;
}

const MIN_ANALYSIS_WORDS = 80;
const MAX_MANUSCRIPT_FILE_BYTES = 12 * 1024 * 1024;

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Italian", label: "Italiano" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
];

const GENRE_OPTIONS: { value: Genre; labelKey: string }[] = [
  { value: "self-help", labelKey: "genre_self_help" },
  { value: "business", labelKey: "genre_business" },
  { value: "productivity", labelKey: "genre_productivity" },
  { value: "psychology", labelKey: "genre_psychology" },
  { value: "health", labelKey: "genre_health" },
  { value: "spirituality", labelKey: "genre_spirituality" },
  { value: "memoir", labelKey: "genre_memoir" },
  { value: "romance", labelKey: "genre_romance" },
  { value: "dark-romance", labelKey: "genre_dark_romance" },
  { value: "thriller", labelKey: "genre_thriller" },
  { value: "mystery", labelKey: "genre_mystery" },
  { value: "crime", labelKey: "genre_crime" },
  { value: "fantasy", labelKey: "genre_fantasy" },
  { value: "sci-fi", labelKey: "genre_sci_fi" },
  { value: "literary-fiction", labelKey: "genre_literary_fiction" },
  { value: "education", labelKey: "genre_education" },
  { value: "manual", labelKey: "genre_manual" },
];

const STOP_WORDS = new Set([
  "the", "and", "that", "with", "from", "this", "have", "are", "was", "were", "you", "your",
  "per", "che", "con", "una", "uno", "del", "della", "delle", "gli", "alla", "come", "non",
  "les", "des", "que", "pour", "dans", "une", "avec", "est", "por", "para", "que", "los",
  "las", "der", "die", "das", "und", "mit", "ich", "nicht", "ein", "eine",
]);

function wordList(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

function countWords(text: string): number {
  return wordList(text).length;
}

function cleanTitle(value: string): string {
  return value
    .replace(/\.(txt|md|markdown|docx|epub|pdf|html|htm|odt|rtf)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHeading(value: string): string {
  return value.replace(/^#{1,4}\s*/, "").replace(/\s+/g, " ").trim();
}

function isChapterHeading(line: string): boolean {
  const trimmed = stripHeading(line);
  if (!trimmed || trimmed.length > 90) return false;
  return /^(chapter|capitolo|capitulo|capítulo|chapitre|kapitel)\s+([0-9ivxlcdm]+|[a-z]+)\b/i.test(trimmed)
    || /^(prologue|prologo|prologo|epilogue|epilogo|introduction|introduzione|conclusion|conclusione)$/i.test(trimmed)
    || /^#{1,3}\s+\S+/.test(line.trim());
}

function splitOversizedContent(title: string, content: string): { title: string; content: string }[] {
  const words = content.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2600) return [{ title, content: content.trim() }];

  const chunks: { title: string; content: string }[] = [];
  for (let start = 0; start < words.length; start += 1800) {
    const part = words.slice(start, start + 1800).join(" ");
    chunks.push({
      title: chunks.length === 0 ? title : `${title} ${chunks.length + 1}`,
      content: part,
    });
  }
  return chunks;
}

function splitIntoChapters(text: string): { title: string; content: string }[] {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  const lines = normalized.split("\n");
  const chapters: { title: string; content: string }[] = [];
  let currentTitle = t("chapter") || "Chapter";
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const content = currentLines.join("\n").trim();
    if (countWords(content) < 40) return;
    chapters.push(...splitOversizedContent(currentTitle || `${t("chapter")} ${chapters.length + 1}`, content));
  };

  for (const line of lines) {
    const heading = isChapterHeading(line);
    const hasBody = countWords(currentLines.join("\n")) >= 80;

    if (heading && hasBody) {
      pushCurrent();
      currentTitle = stripHeading(line);
      currentLines = [];
      continue;
    }

    if (heading && currentLines.length === 0) {
      currentTitle = stripHeading(line);
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();

  if (chapters.length > 1) {
    return chapters.map((chapter, index) => ({
      ...chapter,
      title: chapter.title || `${t("chapter")} ${index + 1}`,
    }));
  }

  const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) {
    return splitOversizedContent(`${t("chapter")} 1`, normalized);
  }

  const grouped: { title: string; content: string }[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;
  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);
    buffer.push(paragraph);
    bufferWords += paragraphWords;
    if (bufferWords >= 1600) {
      grouped.push({ title: `${t("chapter")} ${grouped.length + 1}`, content: buffer.join("\n\n") });
      buffer = [];
      bufferWords = 0;
    }
  }
  if (buffer.length) grouped.push({ title: `${t("chapter")} ${grouped.length + 1}`, content: buffer.join("\n\n") });
  return grouped;
}

function detectLanguage(text: string): Language {
  const lower = ` ${text.toLowerCase()} `;
  const scores: Record<Language, number> = {
    English: (lower.match(/\b(the|and|that|with|this|you|your)\b/g) || []).length,
    Italian: (lower.match(/\b(che|per|con|della|delle|questo|questa|non)\b/g) || []).length,
    Spanish: (lower.match(/\b(que|para|con|esta|este|los|las|una)\b/g) || []).length,
    French: (lower.match(/\b(que|pour|avec|dans|cette|vous|les|des)\b/g) || []).length,
    German: (lower.match(/\b(und|der|die|das|nicht|eine|einen|mit)\b/g) || []).length,
  };
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as Language) || "English";
}

function repetitionDensity(words: string[]): number {
  const counts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 5 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const repeated = Array.from(counts.values()).reduce((sum, value) => sum + Math.max(0, value - 3), 0);
  return words.length ? repeated / words.length : 0;
}

function analyzeChapter(title: string, content: string, genre: Genre): ManuscriptChapterAnalysis {
  const words = wordList(content);
  const wordCount = words.length;
  const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [];
  const sentenceWordCounts = sentences.map(countWords).filter(Boolean);
  const avgSentenceWords = sentenceWordCounts.length
    ? sentenceWordCounts.reduce((sum, value) => sum + value, 0) / sentenceWordCounts.length
    : 0;
  const longSentenceRatio = sentenceWordCounts.length
    ? sentenceWordCounts.filter(value => value > 32).length / sentenceWordCounts.length
    : 0;
  const repeatDensity = repetitionDensity(words);
  const openingWords = countWords(paragraphs[0] || "");
  const quoteMarks = (content.match(/[“”"]/g) || []).length;

  const editorial = analyzeNovel(content);

  const warningTypes =
    editorial.warnings?.map(w => w.type) || [];

  const strengths: EditorialSignal[] = [];
  const issues: EditorialSignal[] = [];
  const advice: EditorialSignal[] = [];
  let score = calculateEditorialChapterScore({
    wordCount,
    paragraphs: paragraphs.length,
    avgSentenceWords,
    longSentenceRatio,
    repeatDensity,
    openingWords,
    quoteMarks,
    warningTypes,
    genre,
  });

  if (wordCount < 400) {
    score -= 8;
    issues.push({ key: "manuscript_issue_short_chapter" });
    advice.push({ key: "manuscript_advice_expand_chapter" });
  } else if (wordCount < 700) {
    score -= 4;
    issues.push({ key: "manuscript_issue_short_chapter" });
    advice.push({ key: "manuscript_advice_expand_chapter" });
  } else if (wordCount > 5200) {
    score -= 8;
    issues.push({ key: "manuscript_issue_long_chapter" });
    advice.push({ key: "manuscript_advice_split_chapter" });
  } else {
    strengths.push({ key: "manuscript_strength_balanced_length" });
  }

  if (avgSentenceWords > 28) {
    score -= genre === "self-help" ? 5 : 8;
    issues.push({ key: "manuscript_issue_long_sentences" });
    advice.push({ key: "manuscript_advice_sentence_rhythm" });
  } else if (avgSentenceWords > 0) {
    strengths.push({ key: "manuscript_strength_clear_sentences" });
  }

  if (paragraphs.length < Math.max(3, Math.floor(wordCount / 650))) {
    score -= genre === "self-help" ? 1 : 2;
    issues.push({ key: "manuscript_issue_dense_blocks" });
    advice.push({ key: "manuscript_advice_add_air" });
  } else {
    strengths.push({ key: "manuscript_strength_paragraph_rhythm" });
  }

  if (longSentenceRatio > 0.28) {
    score -= 2;
    issues.push({ key: "manuscript_issue_many_long_sentences" });
  }

  if (repeatDensity > 0.075) {
    score -= 2;
    issues.push({ key: "manuscript_issue_repetition" });
    advice.push({ key: "manuscript_advice_reduce_repetition" });
  } else {
    strengths.push({ key: "manuscript_strength_varied_language" });
  }

  if (openingWords > 150) {
    score -= genre === "self-help" ? 1 : 2;
    issues.push({ key: "manuscript_issue_slow_opening" });
    advice.push({ key: "manuscript_advice_stronger_hook" });
  }

  if (quoteMarks > 8) strengths.push({ key: "manuscript_strength_dialogue" });

  if (warningTypes.includes("weak_subtext")) {
    score -= 1;
  }

  if (warningTypes.includes("dialogue_perfection")) {
    score -= 1;
  }

  if (warningTypes.includes("character_flattening")) {
    score -= 1;
  }

  if (warningTypes.includes("emotional_predictability")) {
    score -= 2;
  }

  if (warningTypes.includes("conflict_collapse")) {
    score -= 2;
  }

  if (warningTypes.includes("emotional_redundancy")) {
    score -= 2;
  }

  if (warningTypes.includes("emotional_monologues")) {
    score -= 1;
  }

  if (warningTypes.includes("repetitive_scene_purpose")) {
    score -= 2;
  }

  if (warningTypes.includes("weak_subtext")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "Le emozioni vengono spesso spiegate invece di emergere da tensione, comportamento o sottotesto."
    });
  }

  if (warningTypes.includes("dialogue_perfection")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "I dialoghi risultano ancora troppo puliti o emotivamente perfetti. Più attrito e imperfezione aumenterebbero il realismo."
    });
  }

  if (warningTypes.includes("character_flattening")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "Alcuni personaggi risultano ancora troppo archetipici o poco distintivi."
    });
  }

  if (warningTypes.includes("emotional_predictability")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "Alcune svolte emotive risultano prevedibili. Più contrasto e tensione aumenterebbero il coinvolgimento."
    });
  }

  if (warningTypes.includes("emotional_redundancy")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "Alcuni concetti o emozioni vengono ribaditi più volte riducendo impatto e memorabilità."
    });
  }

  if (warningTypes.includes("repetitive_scene_purpose")) {
    advice.push({
      priority: true,
      key: "premium_feedback",
      text: "Alcune sezioni sembrano svolgere funzioni narrative simili. Rafforza progressione e payoff."
    });
  }

  
  // SELF-HELP EDITORIAL INTELLIGENCE
  const lowerContent = content.toLowerCase();

  const isSelfHelp =
    /\b(cambiamento|abitudine|mindset|motivazione|autostima|paura|disciplina|consapevolezza|mentalità|bloccat|obiettivo|crescita personale|vita sbagliata|vita diversa|relazione|ansia|paura|cervello|decisione|trasformazione|migliorare|pronti davvero)\b/i.test(lowerContent)
    || (quoteMarks > 1 && wordCount > 300 && repeatDensity > 0.02);

  if (isSelfHelp) {

    if (repeatDensity > 0.04) {
      advice.unshift({
        priority: true,
        key: "premium_feedback",
        text: "Alcuni concetti vengono ripetuti con formulazioni simili riducendo impatto e memorabilità."
      });
    }

    if (wordCount > 300 && quoteMarks < 3) {
      advice.unshift({
        priority: true,
        key: "premium_feedback",
        text: "La riflessione è chiara ma ancora poco concreta. Più esempi specifici aumenterebbero credibilità e coinvolgimento."
      });
    }

    if (openingWords > 120) {
      advice.unshift({
        priority: true,
        key: "premium_feedback",
        text: "L'apertura funziona ma potrebbe creare una promessa più forte nelle prime righe."
      });
    }
  }

if (issues.length === 0 && advice.length === 0) {
    advice.push({ key: "manuscript_advice_polish_micro" });
  }

  advice.sort((a, b) =>
    (b.priority ? 1 : 0) - (a.priority ? 1 : 0)
  );

  return {
    title,
    content,
    words: wordCount,
    paragraphs: paragraphs.length,
    avgSentenceWords,
    longSentenceRatio,
    repetitionDensity: repeatDensity,
    score: Math.max(35, Math.min(98, Math.round(score))),
    strengths,
    issues,
    advice,
  };
}

function summaryKeyForScore(score: number): string {
  if (score >= 91) return "manuscript_summary_exceptional";
  if (score >= 80) return "manuscript_summary_strong";
  if (score >= 65) return "manuscript_summary_good";
  if (score >= 50) return "manuscript_summary_needs_work";
  return "manuscript_summary_fragile";
}

function analyzeManuscript(text: string, title: string, sourceName: string, genre: Genre): ManuscriptAnalysis {
  let chapterChunks = splitIntoChapters(text);
  if (!chapterChunks.length && countWords(text) > 0) {
    chapterChunks = [{ title: `${t("chapter")} 1`, content: text.trim() }];
  }

  const chapters = chapterChunks.map(chapter => {
    try {
      return analyzeChapter(chapter.title, chapter.content, genre);
    } catch {
      return analyzeChapter(chapter.title || `${t("chapter")} 1`, chapter.content || text.trim(), genre);
    }
  });
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const score = chapters.length
    ? Math.round(chapters.reduce((sum, chapter) => sum + chapter.score, 0) / chapters.length)
    : 0;
  const recommendations: EditorialSignal[] = [];
  const weakChapters = chapters.filter(chapter => chapter.score < 70);
  const avgSentenceWords = chapters.length
    ? chapters.reduce((sum, chapter) => sum + chapter.avgSentenceWords, 0) / chapters.length
    : 0;
  const wordCounts = chapters.map(chapter => chapter.words);
  const avgWords = wordCounts.length ? wordCounts.reduce((sum, value) => sum + value, 0) / wordCounts.length : 0;
  const maxWords = Math.max(...wordCounts, 0);
  const minWords = Math.min(...wordCounts, avgWords || 0);

  if (weakChapters.length) {
    recommendations.push({ key: "manuscript_rec_start_weak", values: { count: weakChapters.length } });
  }
  if (avgWords > 0 && (maxWords - minWords) / avgWords > 0.85) {
    recommendations.push({ key: "manuscript_rec_balance_chapters" });
  }
  if (avgSentenceWords > 26) {
    recommendations.push({ key: "manuscript_rec_sentence_rhythm" });
  }
  if (chapters.some(chapter => chapter.repetitionDensity > 0.075)) {
    recommendations.push({ key: "manuscript_rec_repetition" });
  }
  if (recommendations.length === 0) {
    recommendations.push({ key: "manuscript_rec_ready_polish" });
  }

  return {
    title: title.trim() || t("untitled"),
    sourceName,
    words: totalWords,
    score,
    chapters,
    recommendations,
    summaryKey: summaryKeyForScore(score),
  };
}

function categoryForGenre(genre: Genre): { category: string; subcategory: string } {
  if (["romance", "dark-romance", "thriller", "fantasy", "horror", "sci-fi", "historical"].includes(genre)) {
    const subcategory = genre === "sci-fi" ? "Sci-Fi" : genre.replace(/(^|-)(\w)/g, (_, sep, char) => `${sep ? " " : ""}${char.toUpperCase()}`);
    return { category: "Fiction", subcategory };
  }
  if (genre === "business") return { category: "Non-Fiction", subcategory: "Business" };
  if (genre === "memoir") return { category: "Non-Fiction", subcategory: "Memoir" };
  if (genre === "manual") return { category: "Manuali", subcategory: "Professionale" };
  return { category: "Self Help", subcategory: "Mindset" };
}

function chapterLengthFromAverage(words: number): "short" | "medium" | "long" {
  if (words < 1300) return "short";
  if (words > 3400) return "long";
  return "medium";
}

function bookLengthFromWords(words: number): "short" | "medium" | "long" | "custom" {
  if (words < 18000) return "short";
  if (words > 70000) return "long";
  return "medium";
}

function signalText(signal: EditorialSignal): string {
  if (signal.text) return signal.text;
  return signal.values ? tt(signal.key, signal.values) : t(signal.key);
}

function buildProjectFromAnalysis(analysis: ManuscriptAnalysis, genre: Genre, language: Language, subtitle = ""): BookProject {
  const safeAnalysis = analysis.chapters.length
    ? analysis
    : {
        ...analysis,
        chapters: [{
          title: `${t("chapter")} 1`,
          content: "",
          words: 0,
          paragraphs: 0,
          avgSentenceWords: 0,
          longSentenceRatio: 0,
          repetitionDensity: 0,
          score: 50,
          strengths: [],
          issues: [],
          advice: [{ key: "manuscript_advice_polish_micro" }],
        }],
      };

  const project = buildProjectFromAnalysisRaw(safeAnalysis, genre, language, subtitle);
  return normalizeImportedProject(project, {
    title: safeAnalysis.title || titleFromFileName(safeAnalysis.sourceName),
    language,
  });
}

function buildProjectFromAnalysisRaw(analysis: ManuscriptAnalysis, genre: Genre, language: Language, subtitle = ""): BookProject {
  const now = new Date().toISOString();
  const category = categoryForGenre(genre);
  const avgChapterWords = analysis.chapters.length ? Math.round(analysis.words / analysis.chapters.length) : 0;
  const config: BookConfig = {
    title: analysis.title,
    subtitle: subtitle.trim(),
    tone: "clear, polished, emotionally precise, editorial",
    authorStyle: "editorial rewrite guided by manuscript diagnosis",
    language,
    genre,
    category: category.category,
    subcategory: category.subcategory,
    chapterLength: chapterLengthFromAverage(avgChapterWords),
    bookLength: bookLengthFromWords(analysis.words),
    customTotalWords: analysis.words,
    numberOfChapters: Math.max(1, analysis.chapters.length),
    subchaptersEnabled: false,
  };

  const chapters: Chapter[] = analysis.chapters.map((chapter, index) => {
    const improvements = chapter.advice.map(signalText).join(" ");
    const missing = chapter.issues.length
      ? chapter.issues.map(signalText).join(" ")
      : t("manuscript_missing_none");
    const explanation = tt("manuscript_ai_rating_explanation", {
      score: chapter.score,
      title: chapter.title,
    });

    return {
      title: chapter.title || `${t("chapter")} ${index + 1}`,
      content: chapter.content || "",
      subchapters: [],
      status: "completed",
      qualityRating: Math.max(1, Math.min(5, Number((chapter.score / 20).toFixed(1)))),
      aiRating: {
        score: Math.max(1, Math.min(5, Number((chapter.score / 20).toFixed(1)))),
        explanation,
        missing,
        improvements: improvements || t("manuscript_advice_polish_micro"),
      },
    };
  });

  return {
    id: createProjectId(),
    config,
    blueprint: {
      overview: [
        tt("manuscript_blueprint_overview", { score: analysis.score, words: analysis.words }),
        analysis.recommendations.map(signalText).join("\n"),
      ].filter(Boolean).join("\n\n"),
      chapterOutlines: analysis.chapters.map((chapter) => ({
        title: chapter.title,
        summary: [
          tt("manuscript_blueprint_chapter_summary", { score: chapter.score, words: chapter.words }),
          chapter.advice.map(signalText).join(" "),
        ].filter(Boolean).join("\n"),
      })),
      themes: analysis.recommendations.map(signalText),
      emotionalArc: t("manuscript_blueprint_arc"),
    },
    frontMatter: null,
    chapters,
    backMatter: null,
    phase: "complete",
    createdAt: now,
    updatedAt: now,
  };
}

function scoreTone(score: number): string {
  if (score >= 82) return "text-emerald-300";
  if (score >= 70) return "text-sky-300";
  if (score >= 58) return "text-amber-300";
  return "text-rose-300";
}

function clampScore(value: number): number {
  return Math.max(35, Math.min(98, Math.round(value)));
}

export function ManuscriptAnalyzerDialog({
  open,
  onClose,
  canCreateProject = true,
  onLimitReached,
  embedded = false,
}: ManuscriptAnalyzerDialogProps) {
  useUILanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawText, setRawText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [bookLanguage, setBookLanguage] = useState<Language>("Italian");
  const [genre, setGenre] = useState<Genre>("self-help");
  const [analysis, setAnalysis] = useState<ManuscriptAnalysis | null>(null);
  const [reading, setReading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPhase, setAnalyzingPhase] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importFailed, setImportFailed] = useState(false);
  const [requirementBlock, setRequirementBlock] = useState<RequirementId | null>(null);

  const wordCount = useMemo(() => countWords(rawText), [rawText]);
  const canAnalyze = wordCount >= MIN_ANALYSIS_WORDS && !reading && !analyzing && !saving;

  const publishingIntel = useMemo((): ManuscriptPublishingIntel | null => {
    if (!analysis) return null;
    return analyzeManuscriptPublishingIntel({
      fullText: analysis.chapters.map((c) => c.content).join("\n\n"),
      chapters: analysis.chapters.map((c) => ({ title: c.title, content: c.content })),
      genre,
      language: getScriptoraLanguage(),
    });
  }, [analysis, genre]);

  const premiumMetrics = publishingIntel
    ? publishingIntel.marketReadiness.factors.slice(0, 5).map((f) => ({
        label: f.label,
        value: f.score,
        detail: `${f.label} — weighted signal for market readiness.`,
      }))
    : [];

  const runAnalysis = (textOverride?: string, titleOverride?: string, sourceOverride?: string, genreOverride?: Genre) => {
    const nextText = (textOverride ?? rawText).trim();
    const nextTitle = (titleOverride ?? title).trim() || t("untitled");
    const nextSource = sourceOverride || sourceName || t("manuscript_manual_source");
    const nextGenre = genreOverride ?? genre;
    const words = countWords(nextText);

    if (!nextText.trim()) {
      setRequirementBlock("missing_manuscript");
      setAnalysis(null);
      return;
    }
    if (words < MIN_ANALYSIS_WORDS) {
      setRequirementBlock("manuscript_too_short");
      setAnalysis(null);
      return;
    }

    setRequirementBlock(null);
    setError("");
    setImportFailed(false);
    setAnalyzing(true);
    setAnalyzingPhase("Evaluating emotional momentum…");
    try {
      setAnalyzingPhase("Comparing genre expectations…");
      const result = analyzeManuscript(nextText, nextTitle, nextSource, nextGenre);
      if (!result.chapters.length) {
        throw new Error("MANUSCRIPT_NO_CHAPTERS");
      }
      setAnalyzingPhase("Estimating reader retention…");
      setAnalysis(result);
    } catch {
      setAnalysis(null);
      setImportFailed(true);
      setError("");
    } finally {
      setAnalyzing(false);
      setAnalyzingPhase("");
    }
  };

  const handleFile = async (file: File) => {
    setReading(true);
    setError("");
    setImportFailed(false);
    setRequirementBlock(null);
    try {
      if (file.size > MAX_MANUSCRIPT_FILE_BYTES) {
        throw new Error(tt("manuscript_file_too_large", { mb: 12 }));
      }
      const text = await readManuscriptFile(file, t("manuscript_unsupported_file"));
      persistImportDraft({ fileName: file.name, text: text.slice(0, 120_000) });
      const detectedTitle = cleanTitle(file.name) || titleFromFileName(file.name) || t("untitled");
      const detectedLanguage = detectLanguage(text);
      const detectedGenre = detectEditorialGenre(text);
      setRawText(text);
      setSourceName(file.name);
      setTitle(detectedTitle);
      setBookLanguage(detectedLanguage);
      setGenre(detectedGenre);
      runAnalysis(text, detectedTitle, file.name, detectedGenre);
    } catch (err) {
      setAnalysis(null);
      const message = err instanceof Error ? err.message : "";
      persistImportDraft({ fileName: file.name, error: message });
      const isEpub =
        /\.epub$/i.test(file.name) ||
        file.type === "application/epub+zip" ||
        message === "EPUB_EMPTY" ||
        message === "EPUB_PARSE_FAILED";
      if (isEpub || message === "MANUSCRIPT_NO_CHAPTERS") {
        setImportFailed(true);
        setError("");
      } else {
        setImportFailed(false);
        setError(message === t("manuscript_unsupported_file") ? message : t("manuscript_file_error"));
      }
    } finally {
      setReading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!analysis) return;
    if (!canCreateProject) {
      toast.error(t("toast_free_book_used"));
      onLimitReached?.();
      return;
    }

    setSaving(true);
    setImportFailed(false);
    try {
      const project = buildProjectFromAnalysis(analysis, genre, bookLanguage, subtitle);
      await saveProjectAsync(project);
      try {
        sessionStorage.setItem("nexora-open-project", project.id);
        sessionStorage.setItem("nexora-open-section", "chapter-0");
      } catch { /* noop */ }
      window.dispatchEvent(new Event("nexora-projects-change"));
      toast.success(t("manuscript_project_created"));
      onClose();
      navigate("/app");
    } catch (err) {
      console.error("[ManuscriptAnalyzer] project create failed", err);
      setImportFailed(true);
      toast.error(t("manuscript_project_create_error"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setRawText("");
    setSourceName("");
    setTitle("");
    setSubtitle("");
    setAnalysis(null);
    setError("");
    setImportFailed(false);
    setRequirementBlock(null);
  };

  if (embedded && !open) return null;

  const headerBlock = embedded ? (
    <div className="shrink-0 border-b border-white/10 px-5 py-4 text-left sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="ios-icon ios-icon-teal h-11 w-11 shrink-0 rounded-[16px]">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {t("manuscript_analyzer_title")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {t("manuscript_analyzer_desc")}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <DialogHeader className="shrink-0 border-b border-white/10 px-5 py-4 text-left sm:px-6">
      <div className="flex min-w-0 items-start gap-3 pr-8">
        <div className="ios-icon ios-icon-teal h-11 w-11 shrink-0 rounded-[16px]">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-base font-semibold text-foreground">
            {t("manuscript_analyzer_title")}
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-2xl text-xs leading-5">
            {t("manuscript_analyzer_desc")}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );

  const panelBody = (
    <div className="scriptora-modal-body grid min-h-0 gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <input
              ref={fileInputRef}
              type="file"
              accept={MANUSCRIPT_FILE_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.currentTarget.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
                disabled={reading || analyzing || saving}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/20 bg-white/[0.055] px-4 py-7 text-center transition-colors hover:border-sky-300/50 hover:bg-sky-400/10 disabled:opacity-60"
            >
              <span className="ios-icon ios-icon-blue h-14 w-14 rounded-[20px]">
                {reading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{t("manuscript_upload_label")}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{t("manuscript_upload_hint")}</span>
              </span>
            </button>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  {t("manuscript_title_label")}
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("untitled")}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  Sottotitolo reale
                </span>
                <input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="Tagline o sottotitolo del libro"
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  {t("book_language_label")}
                </span>
                <select
                  value={bookLanguage}
                  onChange={(event) => setBookLanguage(event.target.value as Language)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                >
                  {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                {t("manuscript_genre_label")}
              </span>
              <select
                value={genre}
                onChange={(event) => {
                  const nextGenre = event.target.value as Genre;
                  setGenre(nextGenre);
                  if (rawText.trim()) runAnalysis(undefined, undefined, undefined, nextGenre);
                }}
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              >
                {GENRE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase text-muted-foreground">
                <span>{t("manuscript_paste_label")}</span>
                <span className="font-medium normal-case tracking-normal">{wordCount.toLocaleString()} {t("words_unit")}</span>
              </span>
              <textarea
                data-manuscript-textarea
                value={rawText}
                onChange={(event) => {
                  setRawText(event.target.value);
                  setAnalysis(null);
                  setError("");
                  setRequirementBlock(null);
                  if (!title.trim()) setTitle(t("untitled"));
                }}
                placeholder={t("manuscript_paste_placeholder")}
                rows={10}
                className="min-h-[220px] w-full resize-y rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
            </label>

            {requirementBlock && (
              <div className="mt-3">
                <MissingRequirementCard
                  payload={buildRequirement(requirementBlock, { vars: { count: MIN_ANALYSIS_WORDS } })}
                  onPrimary={() => {
                    setRequirementBlock(null);
                    document.querySelector<HTMLTextAreaElement>("[data-manuscript-textarea]")?.focus();
                  }}
                  onSecondary={() => fileInputRef.current?.click()}
                  compact
                />
              </div>
            )}

            {importFailed && !requirementBlock && (
              <div className="mt-3">
                <ScriptoraPremiumState
                  variant="import-error"
                  compact
                  onPrimary={() => {
                    setImportFailed(false);
                    onClose();
                    navigate("/dashboard");
                  }}
                  onSecondary={() => {
                    setImportFailed(false);
                    window.location.reload();
                  }}
                />
              </div>
            )}

            {error && !requirementBlock && !importFailed && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => runAnalysis()}
                disabled={!canAnalyze}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reading || analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {reading || analyzing ? (analyzingPhase || "Evaluating manuscript…") : t("manuscript_analyze_action")}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={reading || saving || (!rawText && !analysis)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/[0.1] hover:text-foreground disabled:opacity-40"
              >
                {t("reset")}
              </button>
            </div>
          </section>

          <section className="p-4 sm:p-5">
            {!analysis ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] p-8 text-center">
                <span className="ios-icon ios-icon-teal h-16 w-16 rounded-[22px]">
                  {analyzing ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileText className="h-7 w-7" />}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {analyzing ? (analyzingPhase || "Evaluating manuscript…") : t("manuscript_empty_title")}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {analyzing ? "Publishing intelligence analysis in progress." : t("manuscript_empty_desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {publishingIntel && (
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Market Readiness</p>
                        <p className={cn("mt-1 text-4xl font-black tabular-nums", tierTone(publishingIntel.marketReadiness.tier))}>
                          {publishingIntel.marketReadiness.score}
                          <span className="ml-2 text-base font-semibold text-muted-foreground">/ 100</span>
                        </p>
                        <p className={cn("mt-1 text-sm font-semibold", tierTone(publishingIntel.marketReadiness.tier))}>
                          {publishingIntel.marketReadiness.tierLabel}
                        </p>
                      </div>
                      <div className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                        {publishingIntel.trustNote}
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{publishingIntel.continuityNote}</p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("manuscript_book_score")}</p>
                    <p className={cn("mt-2 text-4xl font-semibold tabular-nums", scoreTone(analysis.score))}>
                      {analysis.score}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("manuscript_rating_scale")}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("chapters")}</p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums text-foreground">{analysis.chapters.length}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("manuscript_chapters_detected")}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("words_unit")}</p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums text-foreground">{analysis.words.toLocaleString()}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{analysis.sourceName}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                  <div className="flex items-start gap-3">
                    <span className="ios-icon ios-icon-green h-10 w-10 rounded-[15px]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{analysis.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(analysis.summaryKey)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {premiumMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-3 shadow-[0_12px_34px_rgba(0,0,0,0.16)]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
                        <p className={cn("text-lg font-semibold tabular-nums", scoreTone(metric.value))}>{metric.value}</p>
                      </div>
                      <Progress value={metric.value} className="mt-2 h-1.5" />
                      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                {publishingIntel && (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hook intelligence</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-background/50 p-2.5">
                          <p className="text-muted-foreground">Opening</p>
                          <p className="font-semibold text-foreground">{publishingIntel.hook.openingScore}/100</p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-2.5">
                          <p className="text-muted-foreground">Chapter 1</p>
                          <p className="font-semibold text-foreground">{publishingIntel.hook.chapterOneScore}/100</p>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/90">{publishingIntel.hook.explanation}</p>
                      {publishingIntel.hook.flags.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">Flags: {publishingIntel.hook.flags.join(" · ")}</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Genre expectations</p>
                      <p className={cn("text-xs font-semibold", severityTone(publishingIntel.genreExpectation.severity))}>
                        {publishingIntel.genreExpectation.message}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{publishingIntel.genreExpectation.nicheNote}</p>
                    </div>
                  </div>
                )}

                {publishingIntel && publishingIntel.dropRiskMap.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reader drop risk map</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {publishingIntel.dropRiskMap.map((risk) => (
                        <div key={`${risk.chapter}-${risk.message}`} className="flex gap-3 rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 text-xs">
                          <span className={cn("shrink-0 font-bold uppercase", severityTone(risk.severity))}>Ch.{risk.chapter}</span>
                          <span className="text-muted-foreground">{risk.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-sky-300" />
                    <h3 className="text-sm font-semibold text-foreground">{t("manuscript_editorial_recommendations")}</h3>
                  </div>
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={`${rec.key}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span>{signalText(rec)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{t("manuscript_chapter_scores")}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{t("manuscript_chapter_scores_desc")}</p>
                    </div>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-3">
                    <div className="space-y-3">
                      {analysis.chapters.map((chapter, index) => (
                        <div key={`${chapter.title}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.055] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{chapter.title}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {chapter.words.toLocaleString()} {t("words_unit")} · {chapter.paragraphs} {t("manuscript_paragraphs")}
                              </p>
                            </div>
                            <div className={cn("text-right text-xl font-semibold tabular-nums", scoreTone(chapter.score))}>
                              {chapter.score}
                            </div>
                          </div>
                          <Progress value={chapter.score} className="mt-3 h-1.5" />
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="rounded-md bg-emerald-400/10 p-2">
                              <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-200">{t("manuscript_strengths")}</p>
                              <p className="text-[11px] leading-4 text-muted-foreground">
                                {(chapter.strengths.length ? chapter.strengths : [{ key: "manuscript_strength_foundation" }]).slice(0, 2).map(signalText).join(" ")}
                              </p>
                            </div>
                            <div className="rounded-md bg-amber-400/10 p-2">
                              <p className="mb-1 text-[10px] font-semibold uppercase text-amber-200">{t("manuscript_advice")}</p>
                              <p className="text-[11px] leading-4 text-muted-foreground">
                                {chapter.advice.slice(0, 2).map(signalText).join(" ")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-white/10 bg-background/90 p-4 backdrop-blur-2xl sm:-mx-5 sm:-mb-5 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      {t("manuscript_rewrite_hint")}
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={saving}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {t("manuscript_create_project_action")}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
  );

  if (embedded) {
    return (
      <div className="scriptora-landing-embedded-workspace flex max-h-[min(720px,78vh)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl backdrop-blur-2xl">
        {headerBlock}
        <div className="min-h-0 flex-1 overflow-auto">{panelBody}</div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="scriptora-mobile-work-panel flex max-h-[min(92dvh,92vh)] w-[calc(100vw-1.5rem)] max-w-6xl flex-col overflow-hidden border-border bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {headerBlock}
        {panelBody}
      </DialogContent>
    </Dialog>
  );
}
