import { Component, ReactNode } from "react";
import { t } from "@/lib/i18n";
import { buildRequirement } from "@/lib/scriptora-requirement-gate";
import { ScriptoraPremiumState } from "@/components/ScriptoraPremiumState";

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
    console.error("[AppErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined, showDevDetails: false });
  };

  render() {
    if (this.state.hasError) {
      const payload = buildRequirement("unexpected_error");
      const isDev = import.meta.env.DEV;

      return (
        <div className="scriptora-workspace-shell w-full bg-background text-foreground">
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
            <div className="relative z-10 mx-auto mb-6 max-w-lg rounded-xl border border-border bg-card/80 p-3 px-4">
              <button
                type="button"
                onClick={() => this.setState(s => ({ showDevDetails: !s.showDevDetails }))}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {t("error_boundary_dev_details")}
              </button>
              {this.state.showDevDetails && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                  {[this.state.message, this.state.stack].filter(Boolean).join("\n\n")}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
