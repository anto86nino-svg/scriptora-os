// InstallPage — guida l'utente a installare SCRIPTORA come app dal browser.
// Su Android/desktop Chrome usa l'evento beforeinstallprompt nativo.
// Su iOS mostra istruzioni manuali (Safari → Condividi → Aggiungi a Home).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Share2, Plus, ArrowLeft, Download, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <div className="scriptora-feature-page bg-background flex flex-col">
      <header className="shrink-0 border-b border-border/50 px-4 h-14 flex items-center">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Link>
      </header>

      <main className="scriptora-feature-scroll flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <Smartphone className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Installa SCRIPTORA
            </h1>
            <p className="text-sm text-muted-foreground">
              Aggiungi SCRIPTORA alla schermata Home del tuo dispositivo. Si apre come una vera app, senza barra del browser.
            </p>
          </div>

          {isStandalone || installed ? (
            <div className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-semibold text-foreground">Già installata</p>
              <p className="text-xs text-muted-foreground">
                Stai usando SCRIPTORA in modalità app. Puoi chiudere questa pagina.
              </p>
            </div>
          ) : isIOS ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Su iPhone / iPad (Safari)
              </p>
              <ol className="space-y-3 text-sm text-foreground">
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <span className="flex items-center gap-1.5">
                    Tocca il pulsante <Share2 className="h-4 w-4 inline" /> Condividi in basso
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <span className="flex items-center gap-1.5">
                    Scorri e scegli <Plus className="h-4 w-4 inline" /> "Aggiungi a Home"
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <span>Conferma "Aggiungi" — l'icona SCRIPTORA apparirà sulla Home.</span>
                </li>
              </ol>
            </div>
          ) : deferred ? (
            <button
              onClick={handleInstall}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" /> Installa ora
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Su Android / Chrome / Edge
              </p>
              <p className="text-sm text-foreground">
                Apri il menu del browser (⋮) e seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong>.
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Nota: l'opzione di installazione automatica funziona solo sull'app pubblicata, non in anteprima editor.
              </p>
            </div>
          )}

          <Link
            to="/dashboard"
            className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continua senza installare →
          </Link>
        </div>
      </main>
    </div>
  );
}
