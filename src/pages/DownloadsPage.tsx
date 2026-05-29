// Scriptora Download Center — public page listing installable builds per platform.
// Driven by src/config/downloads.ts. Defaults to "coming soon" mode.

import { Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { downloadItems, changelog, appVersion, buildChannel } from "@/config/downloads";
import { DownloadCard } from "@/components/downloads/DownloadCard";
import { DownloadStatusBanner } from "@/components/downloads/DownloadStatusBanner";

export default function DownloadsPage() {
  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Scriptora · Download Center
          </span>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Release infrastructure ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Installa Scriptora sui tuoi dispositivi
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Le versioni installabili saranno presto disponibili. La struttura di rilascio è già
            predisposta.
          </p>
        </div>

        <DownloadStatusBanner />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {downloadItems.map((item) => (
            <DownloadCard key={item.id} item={item} />
          ))}
        </div>

        <section className="mt-12 max-w-3xl mx-auto rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Nota tecnica</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I file installabili (APK, AAB, DMG, ZIP, EXE) richiedono una pipeline di build
                Capacitor per Android, Electron o Tauri per desktop, oppure GitHub Actions per
                generare gli artifact in modo automatico ad ogni release. Quando i link saranno
                inseriti in <code className="px-1 py-0.5 rounded bg-muted text-foreground">.env</code>,
                i bottoni si attiveranno automaticamente senza modifiche al codice.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 max-w-3xl mx-auto">
          <h2 className="text-lg font-bold mb-4">Changelog</h2>
          <div className="space-y-3">
            {changelog.map((entry) => (
              <div key={entry.version} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">v{entry.version}</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold border border-primary/30">
                    {entry.channel}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.notes.map((n, i) => (
                    <li key={`stable-${i}`} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Scriptora v{appVersion} · canale {buildChannel}
        </p>
      </main>
    </div>
  );
}