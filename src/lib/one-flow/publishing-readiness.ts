import { isProjectComplete } from "@/lib/project-status";
import { getProjectCoverComposition, getProjectCoverDataUrl } from "@/lib/cover-session";
import { loadActiveKdpLaunchSession } from "@/lib/kdp/kdp-launch-session";
import { loadLatestRadarSnapshot } from "@/lib/bestseller-radar/radar-storage";
import type { BookProject } from "@/types/book";

export type PublishingReadinessStatus = "CRITICAL" | "WARNING" | "READY";
export type PublishingStepId = "title" | "keyword" | "radar" | "cover" | "kdp" | "export" | "publish";
export type PublishingCheckStatus = "PASS" | "WARNING" | "FAIL";
export type PublishingPlanPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type PublishingCheck = {
  id: string;
  label: string;
  status: PublishingCheckStatus;
  evidence: string;
  action: string;
};

export type PublishingStep = {
  id: PublishingStepId;
  label: string;
  toolActionId: string;
  score: number;
  status: PublishingReadinessStatus;
  summary: string;
  checks: PublishingCheck[];
};

export type PublishingPlanItem = {
  id: string;
  problem: string;
  priority: PublishingPlanPriority;
  impact: string;
  action: string;
  targetActionId: string;
};

export type PublishingReadinessAudit = {
  projectTitle: string;
  score: number;
  status: PublishingReadinessStatus;
  completedSteps: number;
  totalSteps: number;
  steps: PublishingStep[];
  plan: PublishingPlanItem[];
  signals: {
    manuscriptWords: number;
    completedChapters: number;
    totalChapters: number;
    hasCover: boolean;
    hasCoverComposition: boolean;
    hasKdpPackaging: boolean;
    hasRadarSnapshot: boolean;
  };
};

const WORD_RE = /[\p{L}\p{N}'’-]+/gu;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countWords(text?: string | null): number {
  return String(text || "").match(WORD_RE)?.length || 0;
}

function statusFromScore(score: number, hasFail: boolean): PublishingReadinessStatus {
  if (hasFail || score < 55) return "CRITICAL";
  if (score < 82) return "WARNING";
  return "READY";
}

function checkScore(checks: PublishingCheck[]): number {
  if (!checks.length) return 0;
  const total = checks.reduce((sum, check) => {
    if (check.status === "PASS") return sum + 100;
    if (check.status === "WARNING") return sum + 58;
    return sum;
  }, 0);
  return clampScore(total / checks.length);
}

function buildStep(
  id: PublishingStepId,
  label: string,
  toolActionId: string,
  checks: PublishingCheck[],
  summary: string,
): PublishingStep {
  const score = checkScore(checks);
  return {
    id,
    label,
    toolActionId,
    score,
    status: statusFromScore(score, checks.some((check) => check.status === "FAIL")),
    summary,
    checks,
  };
}

function check(
  id: string,
  label: string,
  status: PublishingCheckStatus,
  evidence: string,
  action: string,
): PublishingCheck {
  return { id, label, status, evidence, action };
}

function getAuthorName(project: BookProject): string {
  return (
    project.config.authorIdentity?.penName ||
    project.config.author ||
    project.config.authorName ||
    project.config.writerName ||
    ""
  ).trim();
}

function getChapterWordCount(project: BookProject): number {
  return (project.chapters || []).reduce((sum, chapter) => {
    const chapterWords = countWords(chapter.content);
    const subWords = (chapter.subchapters || []).reduce((subSum, sub) => subSum + countWords(sub.content), 0);
    return sum + chapterWords + subWords;
  }, 0);
}

function getCompletedChapters(project: BookProject): number {
  return (project.chapters || []).filter((chapter) => {
    const words = countWords(chapter.content) + (chapter.subchapters || []).reduce((sum, sub) => sum + countWords(sub.content), 0);
    return words >= 80;
  }).length;
}

function wordsInList(values: string[]): string[] {
  return values
    .flatMap((value) => value.toLowerCase().split(/[^\p{L}\p{N}'’-]+/u))
    .map((value) => value.trim())
    .filter((value) => value.length >= 4);
}

function unique(values: string[], max = values.length): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, max);
}

function loadCompatibleKdpSession(project: BookProject) {
  const session = loadActiveKdpLaunchSession();
  if (!session) return null;
  if (session.projectId && session.projectId !== project.id) return null;
  const sessionTitle = session.config?.chosenTitle?.trim().toLowerCase();
  const projectTitle = project.config.title?.trim().toLowerCase();
  if (sessionTitle && projectTitle && sessionTitle !== projectTitle) return null;
  return session;
}

function buildTitleStep(project: BookProject, kdpSession: ReturnType<typeof loadCompatibleKdpSession>): PublishingStep {
  const title = project.config.title?.trim() || kdpSession?.config?.chosenTitle?.trim() || "";
  const subtitle = project.config.subtitle?.trim() || kdpSession?.config?.chosenSubtitle?.trim() || "";
  const titleChars = title.length;
  const titleWords = countWords(title);
  const subtitleWords = countWords(subtitle);
  const keywordHints = wordsInList([
    project.config.genre,
    project.config.category,
    project.config.subcategory,
    project.config.subgenre || "",
    ...(project.config.publishingMetadata?.backendKeywords || []),
    ...(project.config.publishingMetadata?.keywords || []),
    ...(kdpSession?.packaging?.backendKeywords || []),
  ]);
  const titleLower = `${title} ${subtitle}`.toLowerCase();
  const keywordHits = unique(keywordHints).filter((word) => titleLower.includes(word));

  return buildStep("title", "Titolo", "pack-title", [
    check(
      "title-present",
      "Titolo presente",
      title ? "PASS" : "FAIL",
      title ? `"${title}"` : "Nessun titolo salvato nel libro attivo.",
      "Apri Title Intelligence e salva un titolo definitivo.",
    ),
    check(
      "title-length",
      "Lunghezza commerciale",
      !title ? "FAIL" : titleChars >= 8 && titleChars <= 58 && titleWords >= 2 && titleWords <= 9 ? "PASS" : "WARNING",
      title ? `${titleChars} caratteri, ${titleWords} parole.` : "Titolo assente.",
      "Mantieni il titolo leggibile su mobile e thumbnail Amazon.",
    ),
    check(
      "subtitle-promise",
      "Sottotitolo/promessa",
      subtitleWords >= 4 ? "PASS" : subtitle ? "WARNING" : "WARNING",
      subtitle ? `${subtitleWords} parole nel sottotitolo.` : "Sottotitolo non impostato.",
      "Aggiungi una promessa chiara se il genere/mercato lo richiede.",
    ),
    check(
      "keyword-fit",
      "Keyword nel titolo/sottotitolo",
      keywordHits.length > 0 ? "PASS" : keywordHints.length > 0 ? "WARNING" : "WARNING",
      keywordHits.length > 0
        ? `Keyword rilevate: ${keywordHits.slice(0, 4).join(", ")}.`
        : keywordHints.length > 0
          ? `Nessuna keyword tra ${unique(keywordHints, 4).join(", ")} compare in titolo/sottotitolo.`
          : "Keyword non ancora disponibili da KDP/Keyword Gold.",
      "Allinea titolo, sottotitolo e metadata senza keyword stuffing.",
    ),
  ], "Verifica forza commerciale, chiarezza e leggibilita' del titolo.");
}

function buildKeywordStep(project: BookProject, kdpSession: ReturnType<typeof loadCompatibleKdpSession>): PublishingStep {
  const metadata = project.config.publishingMetadata;
  const backendKeywords = unique([
    ...(metadata?.backendKeywords || []),
    ...(metadata?.keywords || []),
    ...(kdpSession?.packaging?.backendKeywords || []),
  ], 7);
  const categories = unique([
    ...(metadata?.kdpCategories || []),
    ...(metadata?.bisacCategories || []),
    ...(kdpSession?.packaging?.categories || []),
    project.config.category,
    project.config.subcategory,
    project.config.subgenre || "",
  ].filter(Boolean), 5);
  const titleLine = `${project.config.title} ${project.config.subtitle}`.toLowerCase();
  const repeatedInTitle = backendKeywords.filter((keyword) => titleLine.includes(keyword.toLowerCase()));
  const overlong = backendKeywords.filter((keyword) => keyword.length > 48);

  return buildStep("keyword", "Keyword", "pack-keyword", [
    check(
      "keyword-count",
      "Keyword principali",
      backendKeywords.length >= 5 ? "PASS" : backendKeywords.length > 0 ? "WARNING" : "FAIL",
      backendKeywords.length ? `${backendKeywords.length} keyword backend trovate.` : "Nessuna keyword salvata da KDP packaging.",
      "Apri Keyword Gold o KDP Launch e genera backend keyword aderenti al libro.",
    ),
    check(
      "keyword-title-duplication",
      "Keyword sovrautilizzate",
      repeatedInTitle.length === 0 ? "PASS" : "WARNING",
      repeatedInTitle.length ? `Ripetute in titolo/sottotitolo: ${repeatedInTitle.join(", ")}.` : "Nessuna duplicazione diretta rilevata con titolo/sottotitolo.",
      "Evita di sprecare keyword backend ripetendo termini gia' presenti nel titolo.",
    ),
    check(
      "keyword-length",
      "Keyword leggibili",
      overlong.length === 0 ? "PASS" : "WARNING",
      overlong.length ? `Keyword troppo lunghe: ${overlong.slice(0, 3).join(", ")}.` : "Keyword entro lunghezza gestibile.",
      "Usa frasi cercabili, non descrizioni intere.",
    ),
    check(
      "categories",
      "Categorie",
      categories.length >= 2 ? "PASS" : categories.length > 0 ? "WARNING" : "FAIL",
      categories.length ? `Categorie: ${categories.slice(0, 4).join(" · ")}.` : "Categorie KDP/BISAC non trovate.",
      "Completa almeno due categorie coerenti con genere e promessa.",
    ),
  ], "Collega keyword, titolo, sottotitolo e categorie KDP.");
}

function buildRadarStep(project: BookProject): PublishingStep {
  const snapshot = loadLatestRadarSnapshot(project.id);
  const score = snapshot?.score;
  return buildStep("radar", "Radar", "pack-radar", [
    check(
      "radar-present",
      "Analisi mercato",
      snapshot ? "PASS" : "WARNING",
      snapshot ? `Snapshot ${new Date(snapshot.createdAt).toLocaleDateString("it-IT")} · ${score?.overall}/100.` : "Nessuno snapshot Bestseller Radar salvato per questo libro.",
      "Apri Bestseller Radar per misurare mercato, concorrenza e opportunita'.",
    ),
    check(
      "market-strength",
      "Forza mercato",
      !score ? "WARNING" : score.marketFit >= 70 ? "PASS" : score.marketFit >= 55 ? "WARNING" : "FAIL",
      score ? `Market fit ${score.marketFit}/100.` : "Market fit non misurato.",
      "Rafforza nicchia, promessa o posizionamento prima di pubblicare.",
    ),
    check(
      "competition-risk",
      "Rischio concorrenza",
      !score ? "WARNING" : score.competitionRisk <= 72 ? "PASS" : "WARNING",
      score ? `Competition risk ${score.competitionRisk}/100.` : "Rischio concorrenza non misurato.",
      "Se il rischio e' alto, differenzia titolo, angolo e categorie.",
    ),
    check(
      "radar-actions",
      "Azioni concrete",
      snapshot?.actions?.length ? "PASS" : snapshot ? "WARNING" : "WARNING",
      snapshot?.actions?.length ? `${snapshot.actions.length} azioni radar disponibili.` : "Nessuna azione mercato collegata.",
      "Trasforma le azioni radar in interventi su titolo, keyword, cover o descrizione.",
    ),
  ], "Misura rischio mercato, concorrenza e opportunita' prima del lancio.");
}

function parseCoverComposition(project: BookProject): { layers?: Array<{ type?: string; content?: string; x?: number; y?: number; style?: { fontSize?: number } }>; backgroundPresetId?: string } | null {
  const raw = getProjectCoverComposition(project.id);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.layers) ? parsed : null;
  } catch {
    return null;
  }
}

function buildCoverStep(project: BookProject): PublishingStep {
  const coverDataUrl = getProjectCoverDataUrl(project.id);
  const composition = parseCoverComposition(project);
  const titleLayer = composition?.layers?.find((layer) => layer.type === "title");
  const authorLayer = composition?.layers?.find((layer) => layer.type === "author");
  const titleSize = Number(titleLayer?.style?.fontSize ?? 0);
  const titleY = Number(titleLayer?.y ?? 50);
  const titleX = Number(titleLayer?.x ?? 50);
  const hasTitleText = Boolean(titleLayer?.content?.trim() || project.config.title?.trim());
  const hasAuthorText = Boolean(authorLayer?.content?.trim() || getAuthorName(project));

  return buildStep("cover", "Cover", "pack-cover", [
    check(
      "cover-saved",
      "Cover salvata",
      coverDataUrl?.startsWith("data:image") ? "PASS" : "FAIL",
      coverDataUrl?.startsWith("data:image") ? "Anteprima cover salvata per il progetto." : "Nessuna cover salvata nel progetto.",
      "Apri Cover Studio e salva una cover definitiva prima dell'export.",
    ),
    check(
      "cover-composition",
      "Composizione modificabile",
      composition ? "PASS" : coverDataUrl ? "WARNING" : "FAIL",
      composition ? "Composizione cover salvata." : coverDataUrl ? "Solo immagine salvata, composizione non trovata." : "Composizione cover assente.",
      "Salva anche la composizione per poter correggere titolo, dorso e retro.",
    ),
    check(
      "cover-title",
      "Titolo in cover",
      hasTitleText ? "PASS" : "FAIL",
      hasTitleText ? "Titolo presente nei dati cover/libro." : "Titolo non rilevato in cover.",
      "Sincronizza titolo, sottotitolo e autore dentro Cover Studio.",
    ),
    check(
      "cover-safe-area",
      "Safe area testo",
      !composition ? "WARNING" : titleX >= 12 && titleX <= 88 && titleY >= 10 && titleY <= 90 ? "PASS" : "WARNING",
      !composition ? "Safe area non verificabile senza composizione." : `Titolo x=${Math.round(titleX)}%, y=${Math.round(titleY)}%.`,
      "Mantieni titolo e autore dentro l'area sicura KDP.",
    ),
    check(
      "cover-thumbnail",
      "Leggibilita' thumbnail",
      !composition ? "WARNING" : titleSize >= 70 ? "PASS" : "WARNING",
      !composition ? "Thumbnail non verificabile senza composizione." : `Dimensione titolo ${Math.round(titleSize)}.`,
      "Aumenta dimensione/contrasto se il titolo non regge in miniatura.",
    ),
    check(
      "cover-author",
      "Autore in cover",
      hasAuthorText ? "PASS" : "WARNING",
      hasAuthorText ? "Autore rilevato nei dati cover/libro." : "Nome autore non rilevato.",
      "Aggiungi il nome autore pubblico per la vetrina.",
    ),
  ], "Integra cover con titolo, sottotitolo, autore e requisiti KDP.");
}

function buildKdpStep(project: BookProject, kdpSession: ReturnType<typeof loadCompatibleKdpSession>): PublishingStep {
  const author = getAuthorName(project);
  const packaging = kdpSession?.packaging;
  const metadata = project.config.publishingMetadata;
  const metadataKeywordCount = unique([...(metadata?.backendKeywords || []), ...(metadata?.keywords || [])], 7).length;
  const metadataCategoryCount = unique([...(metadata?.kdpCategories || []), ...(metadata?.bisacCategories || [])]).length;
  const hasMetadataPackaging = metadataKeywordCount > 0 || metadataCategoryCount > 0;
  return buildStep("kdp", "KDP", "pack-kdp", [
    check(
      "front-matter",
      "Front matter",
      project.frontMatter ? "PASS" : "FAIL",
      project.frontMatter ? "Front matter presente." : "Front matter non generato/salvato.",
      "Genera o completa front matter prima di pubblicare.",
    ),
    check(
      "back-matter",
      "Back matter",
      project.backMatter ? "PASS" : "WARNING",
      project.backMatter ? "Back matter presente." : "Back matter assente.",
      "Aggiungi note autore, call to action o chiusura se previste dal libro.",
    ),
    check(
      "copyright",
      "Copyright",
      project.frontMatter?.copyright?.trim() ? "PASS" : "FAIL",
      project.frontMatter?.copyright?.trim() ? "Copyright presente nel front matter." : "Copyright non rilevato.",
      "Completa pagina copyright e titolare diritti.",
    ),
    check(
      "author",
      "Autore",
      author ? "PASS" : "FAIL",
      author ? `Autore: ${author}.` : "Nome autore pubblico non impostato.",
      "Imposta identita' autore prima di cover, KDP ed export.",
    ),
    check(
      "kdp-packaging",
      "Packaging KDP",
      packaging || hasMetadataPackaging ? "PASS" : "WARNING",
      packaging
        ? `${packaging.backendKeywords?.length || 0} keyword, ${packaging.categories?.length || 0} categorie.`
        : hasMetadataPackaging
          ? `${metadataKeywordCount} keyword, ${metadataCategoryCount} categorie salvate nel progetto.`
          : "Packaging KDP non salvato nella sessione attiva.",
      "Completa KDP Launch per descrizione, categorie e backend keyword.",
    ),
  ], "Checklist pubblicazione KDP: metadata, autore, copyright e pacchetto Amazon.");
}

function buildExportStep(project: BookProject): PublishingStep {
  const complete = isProjectComplete(project);
  const hasCover = Boolean(getProjectCoverDataUrl(project.id)?.startsWith("data:image"));
  const manuscriptWords = getChapterWordCount(project);
  const title = project.config.title?.trim();
  const author = getAuthorName(project);
  return buildStep("export", "Export", "pack-export", [
    check(
      "export-epub",
      "EPUB",
      complete && title && author ? "PASS" : complete ? "WARNING" : "FAIL",
      complete ? "Manoscritto completo per export digitale." : "Manoscritto non ancora completo.",
      "Completa capitoli, titolo e autore prima dell'EPUB finale.",
    ),
    check(
      "export-docx",
      "DOCX",
      manuscriptWords > 0 ? "PASS" : "FAIL",
      `${manuscriptWords} parole nel manoscritto.`,
      "Genera almeno un manoscritto revisionabile prima del DOCX.",
    ),
    check(
      "export-pdf",
      "PDF",
      complete && hasCover ? "PASS" : complete ? "WARNING" : "FAIL",
      hasCover ? "Cover disponibile per PDF." : "Cover mancante per PDF finale.",
      "Salva cover e verifica front/back matter prima del PDF.",
    ),
  ], "Stato export EPUB, DOCX e PDF con blocchi reali.");
}

function buildPublishStep(steps: PublishingStep[]): PublishingStep {
  const blocking = steps.flatMap((step) => step.checks.filter((checkItem) => checkItem.status === "FAIL"));
  const warnings = steps.flatMap((step) => step.checks.filter((checkItem) => checkItem.status === "WARNING"));
  return buildStep("publish", "Pubblica", "pack-export", [
    check(
      "publish-blockers",
      "Blocchi pubblicazione",
      blocking.length === 0 ? "PASS" : "FAIL",
      blocking.length === 0 ? "Nessun blocco critico rilevato." : `${blocking.length} blocchi critici ancora aperti.`,
      "Risolvi prima i FAIL nel piano pubblicazione.",
    ),
    check(
      "publish-warnings",
      "Warning residui",
      warnings.length <= 3 ? "PASS" : "WARNING",
      `${warnings.length} warning residui.`,
      "Risolvi i warning ad alto impatto prima dell'upload finale.",
    ),
  ], "Risponde alla domanda: cosa manca per pubblicare?");
}

function priorityForStep(step: PublishingStep, checkItem: PublishingCheck): PublishingPlanPriority {
  if (checkItem.status === "FAIL") {
    if (step.id === "title" || step.id === "cover" || step.id === "kdp" || step.id === "export") return "CRITICAL";
    return "HIGH";
  }
  if (step.id === "keyword" || step.id === "radar" || step.id === "cover") return "HIGH";
  return "MEDIUM";
}

function buildPlan(steps: PublishingStep[]): PublishingPlanItem[] {
  const priorityRank: Record<PublishingPlanPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return steps
    .flatMap((step) => step.checks
      .filter((checkItem) => checkItem.status !== "PASS")
      .map((checkItem) => ({
        id: `${step.id}-${checkItem.id}`,
        problem: `${step.label}: ${checkItem.label}`,
        priority: priorityForStep(step, checkItem),
        impact: checkItem.status === "FAIL" ? "Blocca o indebolisce la pubblicazione." : "Riduce conversione o sicurezza editoriale.",
        action: checkItem.action,
        targetActionId: step.toolActionId,
      })))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 8);
}

export function buildPublishingReadinessAudit(project: BookProject | null | undefined): PublishingReadinessAudit | null {
  if (!project) return null;

  const kdpSession = loadCompatibleKdpSession(project);
  const title = buildTitleStep(project, kdpSession);
  const keyword = buildKeywordStep(project, kdpSession);
  const radar = buildRadarStep(project);
  const cover = buildCoverStep(project);
  const kdp = buildKdpStep(project, kdpSession);
  const exportStep = buildExportStep(project);
  const baseSteps = [title, keyword, radar, cover, kdp, exportStep];
  const publish = buildPublishStep(baseSteps);
  const steps = [...baseSteps, publish];
  const score = clampScore(
    title.score * 0.14 +
    keyword.score * 0.13 +
    radar.score * 0.12 +
    cover.score * 0.18 +
    kdp.score * 0.2 +
    exportStep.score * 0.15 +
    publish.score * 0.08,
  );
  const plan = buildPlan(baseSteps);
  const hasFail = baseSteps.some((step) => step.checks.some((checkItem) => checkItem.status === "FAIL"));
  const status = hasFail ? "CRITICAL" : score >= 82 ? "READY" : "WARNING";

  return {
    projectTitle: project.config.title || "Senza titolo",
    score,
    status,
    completedSteps: baseSteps.filter((step) => step.status === "READY").length,
    totalSteps: baseSteps.length,
    steps,
    plan,
    signals: {
      manuscriptWords: getChapterWordCount(project),
      completedChapters: getCompletedChapters(project),
      totalChapters: project.config.numberOfChapters || project.chapters?.length || 0,
      hasCover: Boolean(getProjectCoverDataUrl(project.id)?.startsWith("data:image")),
      hasCoverComposition: Boolean(getProjectCoverComposition(project.id)),
      hasKdpPackaging: Boolean(
        kdpSession?.packaging ||
        project.config.publishingMetadata?.backendKeywords?.length ||
        project.config.publishingMetadata?.keywords?.length ||
        project.config.publishingMetadata?.kdpCategories?.length
      ),
      hasRadarSnapshot: Boolean(loadLatestRadarSnapshot(project.id)),
    },
  };
}
