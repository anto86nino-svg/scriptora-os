import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  featureName?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Lightweight feature-level error boundary.
 * Wraps individual features so a crash in generation/KDP/diagnostics
 * never propagates to blank the entire application.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: import.meta.env.DEV ? error.message : undefined };
  }

  componentDidCatch(error: Error, info: unknown) {
    const name = this.props.featureName ?? "Feature";
    console.error(`[FeatureErrorBoundary:${name}]`, error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      const name = this.props.featureName ?? "Questa funzione";
      return (
        <div className="scriptora-route-transition bg-[#02030a] text-white">
          <div className="scriptora-alive-card-shell w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-md">
            <div className="text-2xl mb-3">⚠️</div>
            <p className="text-sm font-semibold text-white/92 mb-1">
              Non sono riuscito ad aprire questo spazio.
            </p>
            <p className="text-xs text-white/60 mb-4 max-w-xs mx-auto">
              {name} ha riscontrato un problema. Nessun dato è andato perso.
            </p>
            {this.state.message && (
              <pre className="text-[10px] text-white/45 bg-black/25 rounded px-3 py-2 max-w-xs overflow-auto mb-4 max-h-24 whitespace-pre-wrap mx-auto">
                {this.state.message}
              </pre>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={this.reset}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-white text-slate-950 hover:bg-white/90 transition-colors"
              >
                Riprova
              </button>
              <Link
                to="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-4 text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                Torna alla dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
