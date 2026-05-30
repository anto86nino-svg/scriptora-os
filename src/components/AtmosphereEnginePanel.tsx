import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAtmosphereProfile } from "@/hooks/useAtmosphereProfile";
import { useBackgroundSource } from "@/hooks/useBackgroundSource";
import {
  ATMOSPHERE_PROFILES,
  getAtmosphereTilePreview,
  restoreRealmBackground,
} from "@/lib/atmosphere-engine";
import { t } from "@/lib/i18n";

type AtmosphereEnginePanelProps = {
  variant?: "dashboard" | "settings";
};

export function AtmosphereEnginePanel({ variant = "settings" }: AtmosphereEnginePanelProps) {
  const { profileId, selectProfile } = useAtmosphereProfile();
  const { source: backgroundSource } = useBackgroundSource();
  const activeAtmosphere =
    ATMOSPHERE_PROFILES.find((profile) => profile.id === profileId) ?? ATMOSPHERE_PROFILES[0];

  const isSettings = variant === "settings";

  return (
    <div
      className={
        isSettings
          ? "space-y-4"
          : "atmo-engine-card relative overflow-hidden rounded-3xl border p-6 shadow-2xl"
      }
    >
      {!isSettings && (
        <div className="absolute inset-x-6 top-6 h-14 rounded-b-[32px] bg-white/[0.03] blur-2xl opacity-50" />
      )}

      <div className={isSettings ? "space-y-4" : "relative z-10 flex flex-col gap-5"}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-white/60" />
              {t("atmo_engine_title")}
            </div>

            <h2
              className={
                isSettings
                  ? "mt-3 text-lg font-semibold tracking-tight text-foreground"
                  : "mt-4 text-2xl font-semibold tracking-tight text-white"
              }
            >
              {t("atmo_engine_headline")}
            </h2>

            <p
              className={
                isSettings
                  ? "mt-1.5 text-sm leading-6 text-muted-foreground"
                  : "mt-2 max-w-xl text-sm leading-6 text-slate-400"
              }
            >
              {t("atmo_engine_body")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1 self-start rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 sm:self-auto">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("atmo_engine_active")}
            </span>
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span className="max-w-[14rem] truncate">{t(activeAtmosphere.moodKey)}</span>
            </span>
          </div>
        </div>

        <div className="atmo-profile-grid">
          {ATMOSPHERE_PROFILES.map((profile) => {
            const isActive = profileId === profile.id && profile.available;
            return (
              <button
                key={profile.id}
                type="button"
                disabled={!profile.available}
                onClick={() => profile.available && selectProfile(profile.id)}
                aria-pressed={isActive}
                aria-label={`${t(profile.nameKey)} — ${t(profile.moodKey)}`}
                style={
                  { "--atmo-tile-bg": getAtmosphereTilePreview(profile.id) } as React.CSSProperties
                }
                className={`atmo-profile-tile group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-3 text-left transition sm:rounded-3xl sm:p-4 ${
                  isActive
                    ? "is-active border-primary/40 text-white shadow-lg"
                    : profile.available
                      ? "border-border/70 text-foreground hover:border-primary/30"
                      : "cursor-not-allowed border-border/50 text-muted-foreground opacity-80"
                }`}
              >
                <span className="line-clamp-1 text-sm font-semibold leading-5 tracking-tight text-inherit">
                  {t(profile.nameKey)}
                </span>
                <span className="mt-1.5 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground group-[.is-active]:text-foreground/80">
                  {t(profile.moodKey)}
                </span>
                <span className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground group-[.is-active]:text-foreground/90">
                  {t(profile.descriptionKey)}
                </span>
                {isActive && (
                  <span className="mt-3 inline-flex w-fit shrink-0 items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("atmo_engine_active")}
                  </span>
                )}
                {!profile.available && (
                  <span className="mt-3 inline-flex w-fit shrink-0 items-center rounded-full bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("atmo_engine_coming_soon")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs leading-5 text-muted-foreground">{t("atmo_engine_persist")}</p>

        {!isSettings && (
          <div className="flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {backgroundSource === "realm" ? t("bg_source_realm_active") : t("bg_source_custom_active")}
              {backgroundSource === "realm" && (
                <span className="mt-1 block text-[11px] text-slate-600">{t("atmo_bg_realm_hint")}</span>
              )}
            </p>
            {backgroundSource === "custom" && (
              <button
                type="button"
                onClick={() => {
                  restoreRealmBackground();
                  toast.success(t("toast_realm_background_restored"));
                }}
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                {t("atmo_restore_realm_bg")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
