import { Component, ReactNode } from "react";
import { t } from "@/lib/i18n";
import { buildRequirement } from "@/lib/scriptora-requirement-gate";
import { ScriptoraPremiumState } from "@/components/ScriptoraPremiumState";
import { captureException } from "@/lib/monitoring";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string; stack?: string; showDevDetails: boolean }

/**
 * Last-resort boundary — human guidance instead of a black screen or raw stack traces.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, showDevDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message, stack: error.stack };
  }

  componentDidCatch(error: Error, info: unknown) {
    captureException(error, { area: "react", extra: { boundary: "AppErrorBoundary", info } });
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined, showDevDetails: false });
  };

  render() {
    if (this.state.hasError) {
      const payload = buildRequirement("unexpected_error");
      const isDev = import.meta.env.DEV;

      return (
        <>
          <ScriptoraPremiumState
            variant="generic-error"
            fullPage
            payload={{
              ...payload,
              detail: isDev && this.state.message ? this.state.message : undefined,
            }}
            onPrimary={() => {
              this.reset();
              window.location.href = "/dashboard";
            }}
            onSecondary={() => window.location.reload()}
          />

          {isDev && (this.state.message || this.state.stack) && (
            <div className="fixed bottom-4 left-4 right-4 z-[200] mx-auto max-w-lg rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => this.setState(s => ({ showDevDetails: !s.showDevDetails }))}
                className="text-xs font-medium text-white/60 hover:text-white"
              >
                {t("error_boundary_dev_details")}
              </button>
              {this.state.showDevDetails && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-white/55">
                  {[this.state.message, this.state.stack].filter(Boolean).join("\n\n")}
                </pre>
              )}
            </div>
          )}
        </>
      );
    }
    return this.props.children;
  }
}
