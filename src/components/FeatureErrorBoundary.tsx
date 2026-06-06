import { Component, ReactNode } from "react";

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
    return { hasError: true, message: error.message };
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
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center rounded-xl border border-border/40 bg-muted/10">
          <div className="text-2xl mb-3">⚠️</div>
          <p className="text-sm font-medium text-foreground mb-1">
            {name} ha riscontrato un problema
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            Nessun dato è andato perso. Puoi riprovare o tornare alla dashboard.
          </p>
          {this.state.message && (
            <pre className="text-[10px] text-muted-foreground/60 bg-muted/20 rounded px-3 py-2 max-w-xs overflow-auto mb-4 max-h-24 whitespace-pre-wrap">
              {this.state.message}
            </pre>
          )}
          <button
            onClick={this.reset}
            className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
