import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string; stack?: string }

/**
 * Last-resort boundary so the app never renders a literal black screen.
 * If anything throws during render we surface a readable error + reload button.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: import.meta.env.DEV ? error.message : undefined,
      stack: import.meta.env.DEV ? error.stack : undefined,
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[AppErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6 pb-safe pt-safe text-foreground">
          <div className="max-w-lg w-full rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h1 className="text-base font-semibold">Qualcosa è andato storto</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              L'app ha incontrato un errore inatteso. Puoi tornare alla home o ricaricare.
            </p>
            {this.state.message && (
              <pre className="text-[11px] bg-muted/40 border border-border rounded-md p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                {this.state.message}
              </pre>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { this.reset(); window.location.href = "/"; }}
                className="flex-1 h-9 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Torna alla home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 h-9 rounded-lg text-sm font-medium border border-border hover:bg-muted/40 transition-colors"
              >
                Ricarica
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
