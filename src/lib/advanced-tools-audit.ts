import type { BookProject } from "@/types/book";
import {
  getBookStructureTruth,
  getMissingActiveSubchapterRefs,
} from "@/lib/book-structure-truth";
import { getProjectCoverDataUrl } from "@/lib/cover-session";

export type AdvancedAuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AdvancedAuditWarning = {
  id: string;
  severity: AdvancedAuditSeverity;
  title: string;
  evidence: string;
  action: string;
};

export type AdvancedAuditScore = {
  label: string;
  score: number;
  status: "premium" | "ready" | "warning" | "critical";
  evidence: string;
};

export type AdvancedRepairPlanItem = {
  id: string;
  priority: AdvancedAuditSeverity;
  intervention: string;
  impact: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  creditCost: string;
  evidence: string;
};

export type AdvancedToolsAudit = {
  projectTitle: string;
  generatedAt: number;
  scores: {
    bookHealth: AdvancedAuditScore;
    canonIntegrity: AdvancedAuditScore;
    subchapterIntegrity: AdvancedAuditScore;
    duplicateSceneRisk: AdvancedAuditScore;
    bestsellerReadiness: AdvancedAuditScore;
    exportReadiness: AdvancedAuditScore;
  };
  weakChapters: Array<{ index: number; title: string; evidence: string }>;
  strongChapters: Array<{ index: number; title: string; evidence: string }>;
  warnings: {
    bookHealth: AdvancedAuditWarning[];
    canon: AdvancedAuditWarning[];
    subchapters: AdvancedAuditWarning[];
    duplicates: AdvancedAuditWarning[];
    bestseller: AdvancedAuditWarning[];
    export: AdvancedAuditWarning[];
  };
  repairPlan: AdvancedRepairPlanItem[];
};

const WORD_RE = /[\p{L}\p{N}'’-]+/gu;

function countWords(text: string | undefined | null): number {
  return String(text || "").match(WORD_RE)?.length || 0;
}

function normalizeParagraph(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreStatus(score: number): AdvancedAuditScore["status"] {
  if (score >= 88) return "premium";
  if (score >= 74) return "ready";
  if (score >= 55) return "warning";
  return "critical";
}

function makeScore(label: string, score: number, evidence: string): AdvancedAuditScore {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    label,
    score: clamped,
    status: scoreStatus(clamped),
    evidence,
  };
}

function severityPenalty(severity: AdvancedAuditSeverity): number {
  if (severity === "CRITICAL") return 24;
  if (severity === "HIGH") return 16;
  if (severity === "MEDIUM") return 9;
  return 4;
}

function warning(
  id: string,
  severity: AdvancedAuditSeverity,
  title: string,
  evidence: string,
  action: string,
): AdvancedAuditWarning {
  return { id, severity, title, evidence, action };
}

function makeRepair(w: AdvancedAuditWarning, creditCost = "0 crediti finche' non confermi un'azione automatica"): AdvancedRepairPlanItem {
  return {
    id: `repair-${w.id}`,
    priority: w.severity,
    intervention: w.action,
    impact: w.severity === "CRITICAL" || w.severity === "HIGH" ? "Alto" : "Medio",
    risk: w.severity === "CRITICAL" ? "MEDIUM" : "LOW",
    creditCost,
    evidence: w.evidence,
  };
}

function chapterTitle(project: BookProject, index: number): string {
  return project.chapters?.[index]?.title || project.blueprint?.chapterOutlines?.[index]?.title || `Capitolo ${index + 1}`;
}

function getAllChapterText(project: BookProject): string {
  return (project.chapters || [])
    .map((chapter) => [chapter.content, ...(chapter.subchapters || []).map((sub) => sub.content)].join("\n\n"))
    .join("\n\n");
}

function detectDuplicateParagraphs(project: BookProject): AdvancedAuditWarning[] {
  const seen = new Map<string, { chapterIndex: number; paragraphIndex: number; text: string }>();
  const out: AdvancedAuditWarning[] = [];

  (project.chapters || []).forEach((chapter, chapterIndex) => {
    const paragraphs = String(chapter.content || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => countWords(p) >= 22);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const normalized = normalizeParagraph(paragraph).slice(0, 240);
      if (normalized.length < 120) return;
      const previous = seen.get(normalized);
      if (previous) {
        out.push(
          warning(
            `duplicate-${chapterIndex}-${paragraphIndex}`,
            "HIGH",
            "Paragrafo/scena ripetuta",
            `Cap. ${previous.chapterIndex + 1} ¶${previous.paragraphIndex + 1} e Cap. ${chapterIndex + 1} ¶${paragraphIndex + 1}: "${paragraph.slice(0, 140)}..."`,
            "Apri Manuscript Lab o Patch: taglia una delle occorrenze e preserva solo la scena che avanza davvero trama o tesi.",
          ),
        );
      } else {
        seen.set(normalized, { chapterIndex, paragraphIndex, text: paragraph });
      }
    });
  });

  return out.slice(0, 8);
}

function extractCanonNames(project: BookProject): string[] {
  const fromConfig = (project.config.characters || []).map((c) => [c.name, c.surname].filter(Boolean).join(" ").trim());
  const fromIntegrity = project.blueprint?.integrity?.characterMemoryEngine?.map((c) => c.canonicalName) || [];
  return Array.from(new Set([...fromConfig, ...fromIntegrity].map((name) => name.trim()).filter((name) => name.length >= 2)));
}

function detectCanonWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const manuscript = getAllChapterText(project);
  const canonNames = extractCanonNames(project);

  if (!canonNames.length) {
    out.push(
      warning(
        "canon-no-character-memory",
        "MEDIUM",
        "Canon personaggi non strutturato",
        "Nessun personaggio canonico trovato in config.characters o blueprint.integrity.characterMemoryEngine.",
        "Apri Character Studio e salva nomi, ruoli e regole di continuita' prima di rigenerare o patchare capitoli.",
      ),
    );
  } else {
    const missingNames = canonNames.filter((name) => !new RegExp(`\\b${escapeRegExp(name.split(/\s+/)[0])}\\b`, "i").test(manuscript));
    if (missingNames.length && (project.chapters || []).some((chapter) => countWords(chapter.content) > 80)) {
      out.push(
        warning(
          "canon-missing-names",
          "HIGH",
          "Personaggi canonici non compaiono nel manoscritto",
          `Assenti nel testo generato: ${missingNames.slice(0, 5).join(", ")}.`,
          "Verifica se il blueprint li prevede nei capitoli generati; se si', rigenera/patcha solo i passaggi mancanti, senza introdurre nuovi archi.",
        ),
      );
    }
  }

  const contaminationPatterns = [
    /__RESULT__|__DELTA__|CHUNK_START|CHUNK_END/i,
    /blueprint\s*memory|canon\s*fix|guardCreditOperation/i,
    /lorem ipsum|as an ai|come modello linguistico/i,
  ];
  const contamination = contaminationPatterns.find((pattern) => pattern.test(manuscript));
  if (contamination) {
    out.push(
      warning(
        "canon-technical-contamination",
        "CRITICAL",
        "Contaminazione tecnica nel manoscritto",
        `Pattern rilevato: ${String(contamination).replace(/^\/|\/[a-z]*$/g, "")}.`,
        "Blocca export, pulisci il capitolo contaminato e rilancia diagnostic/patch prima di pubblicare.",
      ),
    );
  }

  return out;
}

function detectSubchapterWarnings(project: BookProject): AdvancedAuditWarning[] {
  const truth = getBookStructureTruth(project);
  const missingRefs = getMissingActiveSubchapterRefs(project);
  const out: AdvancedAuditWarning[] = [];

  if (truth.diagnostics.length) {
    out.push(
      warning(
        "subchapter-truth-diagnostic",
        "LOW",
        "Diagnostica struttura sottocapitoli",
        truth.diagnostics.join(" "),
        "Mantieni export lineare se il libro e' narrativa; usa sottocapitoli strutturali solo quando blueprint e genere lo richiedono.",
      ),
    );
  }

  if (missingRefs.length) {
    out.push(
      warning(
        "subchapter-missing",
        "HIGH",
        "Sottocapitoli previsti ma vuoti",
        missingRefs.slice(0, 8).map((ref) => `${chapterTitle(project, ref.chapterIndex)} / sotto ${ref.subIndex + 1}`).join("; "),
        "Usa Subchapter Auditor: sposta testo gia' presente nel capitolo se pertinente, oppure lascia chapter-only se il blueprint non richiede contenuto separato. Non inventare scene.",
      ),
    );
  }

  (project.chapters || []).forEach((chapter, chapterIndex) => {
    const chapterWords = countWords(chapter.content);
    const subWords = (chapter.subchapters || []).reduce((sum, sub) => sum + countWords(sub.content), 0);
    if (truth.requiresSubchapters && chapterWords > 220 && subWords < 40 && (chapter.subchapters || []).length > 0) {
      out.push(
        warning(
          `subchapter-text-main-${chapterIndex}`,
          "MEDIUM",
          "Testo concentrato nel capitolo principale",
          `${chapterTitle(project, chapterIndex)}: ${chapterWords} parole nel corpo, ${subWords} nei sottocapitoli.`,
          "Proponi split automatico sicuro usando solo paragrafi esistenti: nessun contenuto nuovo.",
        ),
      );
    }
  });

  return out.slice(0, 8);
}

function detectExportWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const chapters = project.chapters || [];
  const expectedChapters = project.config.numberOfChapters || project.blueprint?.chapterOutlines?.length || chapters.length;
  const completed = chapters.filter((chapter) => countWords(chapter.content) >= 80).length;
  const hasCover = Boolean(project.id && getProjectCoverDataUrl(project.id));

  if (!project.config.title?.trim()) {
    out.push(warning("export-title", "CRITICAL", "Titolo mancante", "project.config.title e' vuoto.", "Imposta il titolo prima di export/KDP."));
  }
  if (!project.config.authorName?.trim() && !project.config.author?.trim() && !project.config.writerName?.trim()) {
    out.push(warning("export-author", "HIGH", "Autore mancante", "Nessun authorName/author/writerName disponibile.", "Imposta il nome autore pubblico prima di export/KDP."));
  }
  if (completed < expectedChapters) {
    out.push(
      warning(
        "export-missing-chapters",
        "CRITICAL",
        "Capitoli mancanti o troppo corti",
        `${completed}/${expectedChapters} capitoli hanno almeno 80 parole.`,
        "Completa i capitoli mancanti prima di aprire Export Studio.",
      ),
    );
  }
  if (!project.frontMatter || !Object.values(project.frontMatter).some((v) => String(v || "").trim())) {
    out.push(warning("export-front-matter", "MEDIUM", "Front matter assente", "Nessuna sezione front matter compilata.", "Genera o compila title page/copyright/dedica prima di PDF/EPUB finale."));
  }
  if (!project.backMatter || !Object.values(project.backMatter).some((v) => String(v || "").trim())) {
    out.push(warning("export-back-matter", "LOW", "Back matter assente", "Nessuna sezione back matter compilata.", "Aggiungi note autore, CTA o conclusione se coerenti col genere."));
  }
  if (!hasCover) {
    out.push(warning("export-cover", "HIGH", "Copertina non salvata", "Cover Studio non ha una cover salvata per questo projectId.", "Apri Cover Studio e salva almeno il front cover prima dell'export commerciale."));
  }

  return out;
}

function chapterStrength(project: BookProject) {
  const rows = (project.chapters || []).map((chapter, index) => {
    const words = countWords(chapter.content);
    const editorialRating = chapter.editorialAnalysis?.scoreOutOf10;
    const aiRating = typeof chapter.aiRating?.score === "number" ? chapter.aiRating.score * 2 : null;
    const rating = typeof editorialRating === "number" ? editorialRating : aiRating;
    const outline = project.blueprint?.chapterOutlines?.[index];
    const outlineFit = outline?.summary && chapter.content?.toLowerCase().includes(outline.summary.split(/\s+/)[0]?.toLowerCase() || "") ? 1 : 0;
    const score = Math.min(100, words / 12 + (rating ? rating * 8 : 0) + outlineFit * 8);
    return { index, title: chapterTitle(project, index), words, score };
  });
  const strong = rows
    .filter((row) => row.words >= 350)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => ({ index: row.index, title: row.title, evidence: `${row.words} parole, densita' sopra la media del manoscritto.` }));
  const weak = rows
    .filter((row) => row.words < 220)
    .sort((a, b) => a.words - b.words)
    .slice(0, 5)
    .map((row) => ({ index: row.index, title: row.title, evidence: `${row.words} parole: capitolo debole o incompleto.` }));
  return { strong, weak };
}

function buildBestsellerWarnings(project: BookProject): AdvancedAuditWarning[] {
  const out: AdvancedAuditWarning[] = [];
  const chapters = project.chapters || [];
  const first = chapters[0]?.content || "";
  const lastCompleted = [...chapters].reverse().find((chapter) => countWords(chapter.content) >= 80)?.content || "";
  const manuscript = getAllChapterText(project);
  const avgWords = chapters.length ? chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0) / chapters.length : 0;

  if (countWords(first) >= 80 && !/[?!]|scopr|segreto|porta|sangue|bacio|paura|morte|verita|verità|choice|secret|blood|kiss|fear|truth/i.test(first.slice(0, 900))) {
    out.push(warning("bestseller-hook", "MEDIUM", "Hook iniziale poco evidente", `Prime 900 battute di "${chapterTitle(project, 0)}" senza segnale forte di tensione/promessa.`, "Rafforza il primo conflitto o la promessa narrativa senza cambiare trama."));
  }
  if (avgWords > 0 && avgWords < 650) {
    out.push(warning("bestseller-depth", "HIGH", "Sviluppo capitoli sottile", `Media capitoli: ${Math.round(avgWords)} parole.`, "Espandi solo i capitoli davvero incompleti seguendo blueprint e canon."));
  }
  if (countWords(lastCompleted) >= 80 && !/[?!…]$|non era finita|non sapeva|prima che|poi vide|the end|next/i.test(lastCompleted.trim().slice(-160))) {
    out.push(warning("bestseller-payoff", "LOW", "Chiusura poco propulsiva", `Ultime battute: "${lastCompleted.trim().slice(-140)}"`, "Aggiungi una conseguenza, domanda o immagine finale che spinga la pagina successiva."));
  }
  if (/\b(molto importante|in conclusione|questo capitolo|il lettore scoprirà|this chapter)\b/i.test(manuscript)) {
    out.push(warning("bestseller-generic", "MEDIUM", "Frasi meta/generiche nel testo", "Rilevate formule come 'questo capitolo' o 'in conclusione'.", "Converti spiegazione meta in scena, argomento concreto o voce narrante naturale."));
  }

  return out;
}

export function buildAdvancedToolsAudit(project: BookProject | null | undefined): AdvancedToolsAudit | null {
  if (!project) return null;
  const duplicateWarnings = detectDuplicateParagraphs(project);
  const canonWarnings = detectCanonWarnings(project);
  const subchapterWarnings = detectSubchapterWarnings(project);
  const exportWarnings = detectExportWarnings(project);
  const bestsellerWarnings = buildBestsellerWarnings(project);
  const { strong, weak } = chapterStrength(project);

  const chapters = project.chapters || [];
  const totalWords = chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0);
  const completedChapters = chapters.filter((chapter) => countWords(chapter.content) >= 80).length;
  const expectedChapters = project.config.numberOfChapters || project.blueprint?.chapterOutlines?.length || chapters.length || 1;

  const bookHealthWarnings = [
    ...weak.map((chapter) =>
      warning(
        `weak-chapter-${chapter.index}`,
        "HIGH" as const,
        "Capitolo debole/incompleto",
        `Cap. ${chapter.index + 1} "${chapter.title}": ${chapter.evidence}`,
        "Completa o rigenera il capitolo usando blueprint/canon; non esportare finche' resta vuoto o sottile.",
      ),
    ),
  ];

  const scoreFromWarnings = (base: number, warnings: AdvancedAuditWarning[]) =>
    Math.max(0, base - warnings.reduce((sum, item) => sum + severityPenalty(item.severity), 0));

  const bookHealthScore = Math.min(100, Math.round((completedChapters / Math.max(expectedChapters, 1)) * 72 + Math.min(28, totalWords / 900)));
  const canonScore = scoreFromWarnings(extractCanonNames(project).length ? 88 : 68, canonWarnings);
  const subchapterScore = scoreFromWarnings(92, subchapterWarnings);
  const duplicateScore = scoreFromWarnings(96, duplicateWarnings);
  const bestsellerScore = scoreFromWarnings(Math.min(88, 52 + Math.min(28, totalWords / 1000) + strong.length * 5), bestsellerWarnings);
  const exportScore = scoreFromWarnings(96, exportWarnings);

  const allWarnings = [
    ...bookHealthWarnings,
    ...canonWarnings,
    ...subchapterWarnings,
    ...duplicateWarnings,
    ...bestsellerWarnings,
    ...exportWarnings,
  ];

  return {
    projectTitle: project.config.title || "Libro senza titolo",
    generatedAt: Date.now(),
    scores: {
      bookHealth: makeScore("Book Health", bookHealthScore, `${completedChapters}/${expectedChapters} capitoli completati, ${totalWords} parole totali.`),
      canonIntegrity: makeScore("Canon Integrity", canonScore, `${extractCanonNames(project).length} personaggi canonici trovati; ${canonWarnings.length} warning.`),
      subchapterIntegrity: makeScore("Subchapter Auditor", subchapterScore, `${subchapterWarnings.length} warning su struttura sottocapitoli.`),
      duplicateSceneRisk: makeScore("Duplicate Scene Detector", duplicateScore, `${duplicateWarnings.length} duplicazioni rilevate.`),
      bestsellerReadiness: makeScore("Bestseller Readiness", bestsellerScore, `${strong.length} capitoli forti, ${bestsellerWarnings.length} warning commerciali.`),
      exportReadiness: makeScore("Export Readiness Pro", exportScore, `${exportWarnings.length} warning export/KDP.`),
    },
    weakChapters: weak,
    strongChapters: strong,
    warnings: {
      bookHealth: bookHealthWarnings,
      canon: canonWarnings,
      subchapters: subchapterWarnings,
      duplicates: duplicateWarnings,
      bestseller: bestsellerWarnings,
      export: exportWarnings,
    },
    repairPlan: allWarnings
      .sort((a, b) => severityPenalty(b.severity) - severityPenalty(a.severity))
      .slice(0, 8)
      .map((item) => makeRepair(item)),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
