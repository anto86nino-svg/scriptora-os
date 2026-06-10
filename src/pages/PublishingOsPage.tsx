import { useNavigate } from "react-router-dom";
import { OsShell } from "@/components/os/OsShell";

export default function PublishingOsPage() {
  const navigate = useNavigate();

  return (
    <OsShell title="Publishing OS" subtitle="Cover, export e lancio KDP" badge="📦 Pubblica">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          emoji="🎨"
          title="Cover Studio"
          desc="Copertine professionali in un click."
          onClick={() => navigate("/dashboard", { state: { openCover: true } })}
        />
        <Card
          emoji="📦"
          title="Export Studio"
          desc="EPUB, PDF, DOCX e packaging."
          onClick={() => navigate("/dashboard", { state: { openExport: true } })}
        />
        <Card
          emoji="🚀"
          title="KDP Launch"
          desc="Analisi mercato, titoli e packaging Amazon."
          onClick={() => navigate("/kdp-launch")}
        />
      </div>
    </OsShell>
  );
}

function Card({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 text-left hover:border-amber-400/25 hover:bg-amber-400/8"
    >
      <span className="text-2xl">{emoji}</span>
      <p className="mt-2 text-base font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/60">{desc}</p>
    </button>
  );
}
