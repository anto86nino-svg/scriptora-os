import { useEffect, useState, type ReactNode } from "react";
import { BookConfig, Language, Genre, ChapterLength, CATEGORIES, DEFAULT_SUBCHAPTERS_PER_CHAPTER, type StructureMode } from "@/types/book";
import { structureModeFromSubchapterToggle } from "@/lib/master-structure-engine";
import { Fingerprint } from "lucide-react";
import { t } from "@/lib/i18n";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { tt } from "@/lib/i18n";
import {
  AUTHOR_IDENTITY_CHANGED_EVENT,
  findAuthorIdentity,
  getSelectedAuthorIdentity,
  loadAuthorIdentities,
  normalizeAuthorIdentity,
  setSelectedAuthorIdentityId,
} from "@/lib/author-identity";
import { FocusMusicControl } from "@/components/FocusMusicControl";

const LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];
const GENRES: { value: Genre; label: string }[] = [
  { value: "self-help", label: "Self-Help" },
  { value: "romance", label: "Romance" },
  { value: "dark-romance", label: "Dark Romance" },
  { value: "thriller", label: "Thriller" },
  { value: "fantasy", label: "Fantasy" },
  { value: "philosophy", label: "Philosophy" },
  { value: "business", label: "Business" },
  { value: "memoir", label: "Memoir" },
];
const LENGTHS: { value: ChapterLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

interface ProjectConfigFieldsProps {
  config: BookConfig;
  onUpdateConfig: (key: keyof BookConfig, value: unknown) => void;
  layout?: "toolbar" | "stacked";
}

export function ProjectConfigFields({ config, onUpdateConfig, layout = "toolbar" }: ProjectConfigFieldsProps) {
  const { plan } = usePlan();
  const isFreePlan = plan === "free";
  const [authorIdentities, setAuthorIdentities] = useState(() => loadAuthorIdentities());
  const stacked = layout === "stacked";

  useEffect(() => {
    const refreshAuthors = () => setAuthorIdentities(loadAuthorIdentities());
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
    window.addEventListener("storage", refreshAuthors);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
      window.removeEventListener("storage", refreshAuthors);
    };
  }, []);

  const categories = Object.keys(CATEGORIES);
  const subcategories = CATEGORIES[config.category] || [];
  const selectedAuthor =
    normalizeAuthorIdentity(config.authorIdentity) ||
    findAuthorIdentity(config.authorIdentityId) ||
    getSelectedAuthorIdentity();

  const changeProjectAuthor = (id: string) => {
    const identity = authorIdentities.find((item) => item.id === id);
    if (!identity) return;
    const normalized = normalizeAuthorIdentity(identity);
    if (!normalized) return;
    setSelectedAuthorIdentityId(normalized.id);
    onUpdateConfig("authorIdentityId", normalized.id);
    onUpdateConfig("authorIdentity", normalized);
    onUpdateConfig("authorName", normalized.penName);
    onUpdateConfig("author", normalized.penName);
    onUpdateConfig("writerName", normalized.penName);
    toast.success(tt("author_identity_selected", { name: normalized.penName }));
  };

  const wrap = (children: ReactNode) =>
    stacked ? <div className="space-y-3">{children}</div> : <>{children}</>;

  return wrap(
    <>
      <FieldRow stacked={stacked} label={t("lang")}>
        <MiniSelect value={config.language} options={LANGUAGES.map((l) => ({ value: l, label: l }))} onChange={(v) => onUpdateConfig("language", v)} fullWidth={stacked} />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("author_identity")}>
        <MiniSelect
          value={selectedAuthor.id}
          icon={<Fingerprint className="h-3 w-3 text-sky-300" />}
          options={authorIdentities.map((identity) => ({ value: identity.id, label: identity.penName }))}
          onChange={changeProjectAuthor}
          fullWidth={stacked}
        />
      </FieldRow>
      <FocusMusicControl />
      <FieldRow stacked={stacked} label={t("genre")}>
        <MiniSelect value={config.genre} options={GENRES} onChange={(v) => onUpdateConfig("genre", v)} fullWidth={stacked} />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("book")}>
        <MiniSelect
          value={isFreePlan ? "short" : (config.bookLength || "medium")}
          options={
            isFreePlan
              ? [{ value: "short", label: `${t("short")} (~10k) · ${t("free")}` }]
              : [
                  { value: "short", label: `${t("short")} (~10k)` },
                  { value: "medium", label: `${t("medium")} (~50k)` },
                  { value: "long", label: `${t("long")} (~100k+)` },
                  { value: "custom", label: `Custom (${(config.customTotalWords || 30000).toLocaleString()})` },
                ]
          }
          onChange={(v) => {
            if (isFreePlan && v !== "short") return;
            onUpdateConfig("bookLength", isFreePlan ? "short" : v);
            if (v === "custom" && !config.customTotalWords) onUpdateConfig("customTotalWords", 30000);
          }}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("cat")}>
        <MiniSelect
          value={config.category || "Self Help"}
          options={categories.map((c) => ({ value: c, label: c }))}
          onChange={(v) => {
            onUpdateConfig("category", v);
            onUpdateConfig("subcategory", CATEGORIES[v]?.[0] || "");
          }}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("category")}>
        <MiniSelect
          value={config.subcategory || ""}
          options={subcategories.map((s) => ({ value: s, label: s }))}
          onChange={(v) => onUpdateConfig("subcategory", v)}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("ch_len")}>
        <MiniSelect value={config.chapterLength} options={LENGTHS.map((l) => ({ ...l, label: t(l.value) }))} onChange={(v) => onUpdateConfig("chapterLength", v)} fullWidth={stacked} />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("num_chapters")}>
        <MiniSelect
          value={String(config.numberOfChapters || 10)}
          options={Array.from({ length: 48 }, (_, i) => ({ value: String(i + 3), label: String(i + 3) }))}
          onChange={(v) => onUpdateConfig("numberOfChapters", Math.max(3, Math.min(50, Number(v) || 10)))}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label="Structure">
        <MiniSelect
          value={config.structureMode || (config.subchaptersEnabled ? "chapter_subchapter" : "chapter_only")}
          options={[
            { value: "chapter_only", label: "Chapter only" },
            { value: "chapter_subchapter", label: "Chapters + subchapters" },
            { value: "scene_based", label: "Scene-based" },
            { value: "auto_intelligent", label: "Auto intelligent" },
          ]}
          onChange={(v) => {
            const mode = v as StructureMode;
            onUpdateConfig("structureMode", mode);
            onUpdateConfig("subchaptersEnabled", mode !== "chapter_only");
          }}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("subchapters")}>
        <MiniSelect
          value={
            !config.subchaptersEnabled && (config.structureMode || "chapter_only") === "chapter_only"
              ? "off"
              : config.subchaptersPerChapter === "auto"
                ? "auto"
                : String(config.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER)
          }
          options={[
            { value: "off", label: "Off" },
            { value: "auto", label: "Auto (genre)" },
            ...Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
          ]}
          onChange={(v) => {
            if (v === "off") {
              onUpdateConfig("subchaptersEnabled", false);
              onUpdateConfig("structureMode", "chapter_only");
              return;
            }
            onUpdateConfig("subchaptersEnabled", true);
            onUpdateConfig("structureMode", structureModeFromSubchapterToggle(true, config.structureMode));
            if (v === "auto") {
              onUpdateConfig("subchaptersPerChapter", "auto");
              return;
            }
            onUpdateConfig("subchaptersPerChapter", Math.max(1, Math.min(8, Number(v) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)));
          }}
          fullWidth={stacked}
        />
      </FieldRow>
      <FieldRow stacked={stacked} label={t("tone")}>
        <input
          value={config.tone}
          onChange={(e) => onUpdateConfig("tone", e.target.value)}
          className={`h-9 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${stacked ? "w-full" : "w-28"}`}
          placeholder={t("tone_placeholder")}
        />
      </FieldRow>
    </>,
  );
}

function FieldRow({ label, children, stacked }: { label: string; children: ReactNode; stacked: boolean }) {
  if (!stacked) return <>{children}</>;
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MiniSelect({
  value,
  options,
  onChange,
  icon,
  fullWidth,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 ${fullWidth ? "w-full" : "shrink-0"}`}>
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.07] px-2 pr-5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${fullWidth ? "w-full" : ""}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
