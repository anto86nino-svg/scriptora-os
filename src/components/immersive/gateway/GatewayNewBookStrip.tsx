import { Plus } from "lucide-react";
import { t } from "@/lib/i18n";

export type GatewayGenreId =
  | "Romance"
  | "Fantasy"
  | "Thriller"
  | "Self Help"
  | "Business"
  | "Horror"
  | "Memoir";

const GENRES: { id: GatewayGenreId; labelKey: string }[] = [
  { id: "Romance", labelKey: "gw_genre_romance" },
  { id: "Fantasy", labelKey: "gw_genre_fantasy" },
  { id: "Thriller", labelKey: "gw_genre_thriller" },
  { id: "Self Help", labelKey: "gw_genre_selfhelp" },
  { id: "Business", labelKey: "gw_genre_business" },
  { id: "Horror", labelKey: "gw_genre_horror" },
  { id: "Memoir", labelKey: "gw_genre_memoir" },
];

interface GatewayNewBookStripProps {
  onCreateBook: () => void;
  onGenreSelect: (genre: GatewayGenreId) => void;
}

export function GatewayNewBookStrip({ onCreateBook, onGenreSelect }: GatewayNewBookStripProps) {
  return (
    <section className="scriptora-gateway-new-book" aria-label={t("gw_new_book_title")}>
      <div className="scriptora-gateway-new-book__head">
        <Plus className="h-4 w-4 text-sky-300" aria-hidden />
        <h2>{t("gw_new_book_title")}</h2>
      </div>
      <div className="scriptora-gateway-genres">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            type="button"
            className="scriptora-gateway-genre-pill"
            onClick={() => onGenreSelect(genre.id)}
          >
            {t(genre.labelKey)}
          </button>
        ))}
      </div>
      <button type="button" className="scriptora-gateway-new-book__link" onClick={onCreateBook}>
        {t("gw_new_book_custom")}
      </button>
    </section>
  );
}
