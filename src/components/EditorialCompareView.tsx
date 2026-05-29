import { ArrowRight, Sparkles, Shield, Crown, X } from "lucide-react";
import { t } from "@/lib/i18n";

interface Props {
  originalText: string;
  patchedText: string;
  beforeScore?: number | null;
  afterScore?: number | null;
  scoreDelta?: number | null;
  onApply: () => void;
  onClose: () => void;
}

export default function EditorialCompareView({
  originalText,
  patchedText,
  beforeScore,
  afterScore,
  scoreDelta,
  onApply,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#050816] overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_40%)]" />

      <div className="relative z-10 h-screen flex flex-col p-5 gap-4">

        {/* HEADER */}
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl px-8 py-6">

          <div className="flex items-start justify-between">

            <div>
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-white transition mb-4"
              >
                {t("chapter_doctor_back")}
              </button>

              <h1 className="text-5xl font-black tracking-tight text-white">
                Prima vs Dopo
              </h1>

              <p className="text-white/60 text-lg mt-2">
                Confronta le modifiche editoriali prima di applicarle
              </p>
            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={onApply}
                className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 transition text-white font-black text-lg shadow-[0_0_30px_rgba(37,99,235,0.35)] inline-flex items-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Conferma versione patchata
              </button>

              <button
                onClick={onClose}
                className="h-14 px-6 rounded-2xl border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] transition inline-flex items-center gap-2"
              >
                <X className="h-5 w-5" />
                Chiudi
              </button>

            </div>
          </div>

          {/* SCORE CARDS */}
          <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-5 mt-8">

            <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/[0.04] p-6">
              <p className="text-rose-400 uppercase text-sm font-black tracking-[0.2em]">
                Prima
              </p>

              <p className="text-white/60 mt-1">
                Versione originale
              </p>

              <div className="mt-5 text-6xl font-black text-rose-300">
                {beforeScore?.toFixed(1)}
                <span className="text-xl text-white/30">/10</span>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center text-center">
              <ArrowRight className="h-10 w-10 text-white/30" />

              <div className="text-emerald-400 font-black text-2xl mt-3">
                +{scoreDelta?.toFixed(1)}
              </div>

              <p className="text-xs text-white/40 uppercase tracking-widest">
                miglioramento reale
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
              <p className="text-emerald-400 uppercase text-sm font-black tracking-[0.2em]">
                Dopo
              </p>

              <p className="text-white/60 mt-1">
                Versione migliorata
              </p>

              <div className="mt-5 text-6xl font-black text-emerald-300">
                {afterScore?.toFixed(1)}
                <span className="text-xl text-white/30">/10</span>
              </div>
            </div>

            <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/[0.04] p-6">
              <div className="flex items-center gap-2 text-yellow-400 font-bold mb-3">
                <Crown className="h-5 w-5" />
                Livello commerciale
              </div>

              <p className="text-white/75 leading-7">
                Pronto per pubblicazione premium.
                Raffinazione editoriale avanzata applicata.
              </p>
            </div>

          </div>
        </div>

        {/* COMPARE */}
        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1020]/90 backdrop-blur-xl px-6 py-5">
              <div className="flex items-center gap-3">
                <Shield className="text-rose-400 h-5 w-5" />

                <div>
                  <p className="text-rose-400 uppercase text-sm font-black tracking-[0.2em]">
                    Prima
                  </p>

                  <p className="text-white/50 text-sm">
                    Versione originale
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto h-full px-8 py-8 text-[17px] leading-9 text-white/75 whitespace-pre-wrap">
              {originalText}
            </div>
          </div>

          <div className="rounded-[32px] border border-emerald-500/10 bg-emerald-500/[0.03] backdrop-blur-2xl overflow-hidden">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1020]/90 backdrop-blur-xl px-6 py-5">
              <div className="flex items-center gap-3">
                <Sparkles className="text-emerald-400 h-5 w-5" />

                <div>
                  <p className="text-emerald-400 uppercase text-sm font-black tracking-[0.2em]">
                    Dopo
                  </p>

                  <p className="text-white/50 text-sm">
                    Versione migliorata da Scriptora
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto h-full px-8 py-8 text-[17px] leading-9 text-white whitespace-pre-wrap">
              {patchedText}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
