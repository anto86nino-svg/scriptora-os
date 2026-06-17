import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  toolLabel: string;
  onClose: () => void;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/** Catches runtime errors inside dashboard tools — never whitescreens the app. */
export class SafeDashboardToolBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[DASHBOARD_TOOL_CRASH]", this.props.toolLabel, error, info);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.toolLabel !== this.props.toolLabel) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm font-semibold text-white">Impossibile aprire {this.props.toolLabel}</p>
          <p className="mt-2 max-w-sm text-xs text-white/55">
            Si è verificato un errore. Torna alla Dashboard e riprova.
          </p>
          <button
            type="button"
            onClick={this.props.onClose}
            className="mt-5 rounded-xl border border-white/12 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
          >
            Torna alla Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
