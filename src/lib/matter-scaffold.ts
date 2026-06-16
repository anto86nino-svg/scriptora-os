/**
 * Auto-scaffold front/back matter when blueprint is approved —
 * ensures export is never blocked for missing scaffold Scriptora should create.
 */
import type { BackMatter, BookProject, FrontMatter } from "@/types/book";
import { resolveExportAuthorName } from "@/lib/export-author";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";

export function scaffoldFrontMatter(project: BookProject): FrontMatter | null {
  if (!isFrontMatterEnabled(project.config)) return project.frontMatter;
  if (project.frontMatter) return project.frontMatter;

  const config = project.config;
  const title = String(config.title || "Senza titolo").trim();
  const subtitle = String(config.subtitle || "").trim();
  const author = resolveExportAuthorName(config) || config.authorName || config.author || "Autore";
  const year = new Date().getFullYear();
  const isNonfiction = /non.?fiction|saggio|manual|self.?help|business/i.test(
    [config.genre, config.category, config.bookTypeId].join(" "),
  );

  return {
    titlePage: [title, subtitle, "", author].filter(Boolean).join("\n"),
    copyright: `Copyright © ${year} ${author}\n\nTutti i diritti riservati. Nessuna parte di questo libro può essere riprodotta senza permesso scritto dell'autore.`,
    dedication: "",
    aboutAuthor: config.authorIdentity?.biography || "",
    howToUse: isNonfiction
      ? "Questo libro è pensato per essere letto in ordine. Ogni capitolo costruisce sul precedente."
      : "",
    letterToReader: isNonfiction
      ? ""
      : "Grazie per aver scelto questa storia. Spero ti accompagni fino all'ultima pagina.",
  };
}

export function scaffoldBackMatter(project: BookProject): BackMatter | null {
  if (!isBackMatterEnabled(project.config)) return project.backMatter;
  if (project.backMatter) return project.backMatter;

  const config = project.config;
  const author = resolveExportAuthorName(config) || config.authorName || config.author || "Autore";

  return {
    conclusion: "",
    authorNote: config.authorIdentity?.biography || `${author} — autore di ${config.title || "questo libro"}.`,
    callToAction: "",
    reviewRequest:
      "Se questo libro ti ha lasciato qualcosa, una recensione onesta aiuta altri lettori a trovarlo.",
    otherBooks: "",
  };
}

export function scaffoldMatterForApprovedBlueprint(project: BookProject): Partial<BookProject> {
  const frontMatter = scaffoldFrontMatter(project);
  const backMatter = scaffoldBackMatter(project);
  const patch: Partial<BookProject> = {};

  if (frontMatter && !project.frontMatter) {
    patch.frontMatter = frontMatter;
    patch.frontMatterStatus = "completed";
  }
  if (backMatter && !project.backMatter) {
    patch.backMatter = backMatter;
    patch.backMatterStatus = "completed";
  }

  return patch;
}
