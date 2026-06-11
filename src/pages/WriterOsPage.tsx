import { useNavigate } from "react-router-dom";
import { PenLine, BookOpen, Sparkles } from "lucide-react";
import { OsShell } from "@/components/os/OsShell";
import { getLastProjectId } from "@/services/storageService";
import { FeatureStatusBadge } from "@/components/payments/FeatureStatusBadge";

export default function WriterOsPage() {
  const navigate = useNavigate();
  const lastId = getLastProjectId();

  return (
    <OsShell title="Writer OS" subtitle="Percorso principale: Idea → Blueprint → Capitoli → Export" badge="✍️ Scrivi">
      <div className="grid gap-3 sm:grid-cols-3">
        <LaunchCard
          icon={Sparkles}
          title="Inizia il tuo libro"
          desc="Wizard Book Architect — percorso principale unificato."
          primary
          onClick={() => navigate("/dashboard", { state: { openWizard: true } })}
        />
        <LaunchCard
          icon={PenLine}
          title="Continua a scrivere"
          desc="Writer Studio con editor, diagnostica e revisioni."
          onClick={() => {
            if (lastId) sessionStorage.setItem("scriptora-open-project", lastId);
            navigate("/app");
          }}
        />
        <LaunchCard
          icon={BookOpen}
          title="I miei libri"
          desc="Progetti salvati e ripresa immediata."
          onClick={() => navigate("/dashboard", { state: { openProjects: true } })}
        />
      </div>
    </OsShell>
  );
}

function LaunchCard({
  icon: Icon,
  title,
  desc,
  onClick,
  primary,
}: {
  icon: typeof PenLine;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        primary
          ? "border-sky-400/35 bg-sky-400/10 hover:border-sky-400/50"
          : "border-white/12 bg-white/[0.04] hover:border-sky-400/30 hover:bg-sky-400/8"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-5 w-5 text-sky-300" />
        {primary && <FeatureStatusBadge featureId="book_architect" />}
      </div>
      <p className="mt-3 text-base font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/60">{desc}</p>
    </button>
  );
}
