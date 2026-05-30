import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileDown,
  Flame,
  ImagePlus,
  Rocket,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { t, tt, useUILanguage } from "@/lib/i18n";

const DEMO_COUNTS = { projects: 3, plan: "Pro" };

export function LandingDashboardPreview() {
  useUILanguage();

  const cardGroups = [
    { id: "writer", title: t("writer_os"), desc: t("writer_os_desc") },
    { id: "bestseller", title: t("bestseller_os"), desc: t("bestseller_os_desc") },
    { id: "publishing", title: t("publishing_os"), desc: t("publishing_os_desc") },
  ];

  const cards = [
    { group: "writer", icon: BookOpen, title: t("writer_studio_title"), desc: t("writer_studio_desc"), iconBg: "ios-icon-violet", tag: t("os_tag_write"), emphasis: true },
    { group: "writer", icon: Wand2, title: t("manuscript_lab_title"), desc: t("manuscript_lab_desc"), iconBg: "ios-icon-teal", tag: t("os_tag_score") },
    { group: "bestseller", icon: Flame, title: t("bestseller_engine_title"), desc: t("bestseller_engine_desc"), iconBg: "ios-icon-blue", tag: t("os_tag_launch"), emphasis: true },
    { group: "bestseller", icon: TrendingUp, title: t("bestseller_radar_title"), desc: t("radar_premium_desc"), iconBg: "ios-icon-green", tag: t("os_tag_signal") },
    { group: "publishing", icon: ImagePlus, title: t("cover_studio"), desc: t("cover_studio_desc"), iconBg: "ios-icon-blue", tag: t("os_tag_cover") },
    { group: "publishing", icon: FileDown, title: t("export_studio_title"), desc: t("export_studio_desc"), iconBg: "ios-icon-orange", tag: t("os_tag_export") },
  ];

  return (
    <div className="scriptora-landing-preview-page bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-white/10 bg-background/90 px-4 backdrop-blur-xl">
        <span className="ios-icon ios-icon-blue h-8 w-8 shrink-0 rounded-xl">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-bold">Scriptora OS</span>
        <span className="rounded-lg border border-white/10 bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          {t("launchpad")}
        </span>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="ios-panel overflow-hidden p-0">
          <div className="bg-gradient-to-r from-sky-400/10 via-white/[0.055] to-emerald-400/10 p-4">
            <p className="mb-1 text-[9px] font-semibold uppercase text-foreground/70">{t("continue_project")}</p>
            <p className="text-base font-semibold text-foreground">Ombre sul Corso</p>
            <p className="mt-1 text-[11px] text-foreground/65">3/8 {t("chapters").toLowerCase()} · {t("draft")}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-sky-300 to-emerald-300" />
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_22px_72px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("home_screen")}</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{t("launchpad")}</h2>
              <p className="mt-1 max-w-xl text-sm text-white/72">{t("launchpad_desc")}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {tt("total_suffix", { count: DEMO_COUNTS.projects, plan: DEMO_COUNTS.plan })}
            </span>
          </div>

          <div className="space-y-6">
            {cardGroups.map((group) => {
              const groupCards = cards.filter((card) => card.group === group.id);
              return (
                <div key={group.id}>
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/15 pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                      <p className="mt-0.5 text-[11px] text-foreground/62">{group.desc}</p>
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{groupCards.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.title}
                          className={`group relative flex min-h-[150px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/35 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.03] backdrop-blur-xl ${
                            card.emphasis ? "sm:col-span-2" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className={`ios-icon ${card.iconBg} flex h-11 w-11 items-center justify-center rounded-[16px]`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            {card.tag && (
                              <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                {card.tag}
                              </span>
                            )}
                          </div>
                          <div className="mt-3">
                            <h3 className="text-[15px] font-semibold leading-6 text-white">{card.title}</h3>
                            <p className="mt-1.5 text-[11px] leading-5 text-slate-300">{card.desc}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{t("open_studio")}</span>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/85">
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: t("active_book_widget"), value: "Ombre sul Corso", icon: BookOpen },
            { label: t("project_progress_widget"), value: "38%", icon: BarChart3 },
            { label: t("completed"), value: "1", icon: Sparkles },
            { label: "Market", value: "Live", icon: Rocket },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">{item.label}</p>
              <p className="mt-2 truncate text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
