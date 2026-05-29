import { BookOpen, Globe2, Link2, PlusCircle, Trash2 } from "lucide-react";
import type { AuthorIdentity, AuthorPlatform, AuthorPublishedBook, AuthorPublishedBookLinks } from "@/types/book";
import { createBlankPublishedBook } from "@/lib/author-brain";
import { t } from "@/lib/i18n";

interface AuthorEcosystemPanelProps {
  draft: AuthorIdentity;
  onChange: (patch: Partial<AuthorIdentity>) => void;
}

const BOOK_LINK_FIELDS: Array<{ key: keyof AuthorPublishedBookLinks; labelKey: string }> = [
  { key: "amazon", labelKey: "author_ecosystem_link_amazon" },
  { key: "kobo", labelKey: "author_ecosystem_link_kobo" },
  { key: "goodreads", labelKey: "author_ecosystem_link_goodreads" },
  { key: "appleBooks", labelKey: "author_ecosystem_link_apple" },
  { key: "website", labelKey: "author_ecosystem_link_website" },
];

const PLATFORM_FIELDS: Array<{ key: keyof AuthorPlatform; labelKey: string }> = [
  { key: "instagram", labelKey: "author_ecosystem_platform_instagram" },
  { key: "tiktok", labelKey: "author_ecosystem_platform_tiktok" },
  { key: "facebook", labelKey: "author_ecosystem_platform_facebook" },
  { key: "website", labelKey: "author_ecosystem_platform_website" },
  { key: "newsletter", labelKey: "author_ecosystem_platform_newsletter" },
  { key: "amazonAuthorPage", labelKey: "author_ecosystem_platform_amazon" },
  { key: "goodreadsProfile", labelKey: "author_ecosystem_platform_goodreads" },
];

export function AuthorEcosystemPanel({ draft, onChange }: AuthorEcosystemPanelProps) {
  const books = draft.publishedBooks || [];
  const platform = draft.authorPlatform || {};

  const updateBooks = (next: AuthorPublishedBook[]) => {
    onChange({ publishedBooks: next });
  };

  const updateBook = (id: string, patch: Partial<AuthorPublishedBook>) => {
    updateBooks(books.map((book) => (book.id === id ? { ...book, ...patch } : book)));
  };

  const updateBookLinks = (id: string, patch: Partial<AuthorPublishedBookLinks>) => {
    updateBooks(
      books.map((book) =>
        book.id === id ? { ...book, links: { ...(book.links || {}), ...patch } } : book,
      ),
    );
  };

  const addBook = () => {
    updateBooks([...books, createBlankPublishedBook()]);
  };

  const removeBook = (id: string) => {
    updateBooks(books.filter((book) => book.id !== id));
  };

  const updatePlatform = (patch: Partial<AuthorPlatform>) => {
    onChange({ authorPlatform: { ...platform, ...patch } });
  };

  return (
    <>
      <section className="rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-orange-500/[0.05] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90">Author Ecosystem</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{t("author_ecosystem_books_title")}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("author_ecosystem_books_desc")}</p>
          </div>
          <button
            type="button"
            onClick={addBook}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-4 text-xs font-bold text-foreground transition-colors hover:bg-white/[0.14]"
          >
            <PlusCircle className="h-4 w-4" />
            {t("author_ecosystem_add_book")}
          </button>
        </div>

        {books.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-muted-foreground/70" />
            <p className="mt-2 text-sm text-muted-foreground">{t("author_ecosystem_books_empty")}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {books.map((book, index) => (
              <article
                key={book.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-sm shadow-black/10"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("author_ecosystem_book_label")} {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeBook(book.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("author_ecosystem_remove_book")}
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <EcosystemField label={t("author_ecosystem_book_title")}>
                    <input
                      value={book.title}
                      onChange={(e) => updateBook(book.id, { title: e.target.value })}
                      className="author-input"
                      placeholder={t("author_ecosystem_book_title_ph")}
                    />
                  </EcosystemField>
                  <EcosystemField label={t("author_ecosystem_book_genre")}>
                    <input
                      value={book.genre}
                      onChange={(e) => updateBook(book.id, { genre: e.target.value })}
                      className="author-input"
                      placeholder={t("author_ecosystem_book_genre_ph")}
                    />
                  </EcosystemField>
                </div>

                <div className="mt-2">
                  <EcosystemField label={t("author_ecosystem_book_description")}>
                    <textarea
                      value={book.description || ""}
                      onChange={(e) => updateBook(book.id, { description: e.target.value })}
                      rows={2}
                      className="author-textarea"
                      placeholder={t("author_ecosystem_book_description_ph")}
                    />
                  </EcosystemField>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {BOOK_LINK_FIELDS.map(({ key, labelKey }) => (
                    <EcosystemField key={key} label={t(labelKey)} compact>
                      <input
                        value={book.links?.[key] || ""}
                        onChange={(e) => updateBookLinks(book.id, { [key]: e.target.value })}
                        className="author-input"
                        placeholder="https://"
                      />
                    </EcosystemField>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.07] via-transparent to-indigo-500/[0.05] p-4">
        <div className="flex items-start gap-3">
          <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/90">Author Ecosystem</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{t("author_ecosystem_platform_title")}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("author_ecosystem_platform_desc")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PLATFORM_FIELDS.map(({ key, labelKey }) => (
            <EcosystemField key={key} label={t(labelKey)} icon>
              <input
                value={platform[key] || ""}
                onChange={(e) => updatePlatform({ [key]: e.target.value })}
                className="author-input"
                placeholder="https://"
              />
            </EcosystemField>
          ))}
        </div>
      </section>
    </>
  );
}

function EcosystemField({
  label,
  children,
  compact,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
  icon?: boolean;
}) {
  return (
    <label className={`block rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-2" : "p-2.5"}`}>
      <span className={`mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-muted-foreground ${compact ? "text-[9px]" : "text-[10px]"}`}>
        {icon ? <Link2 className="h-3 w-3" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}
