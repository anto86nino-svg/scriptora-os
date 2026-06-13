import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type DiagnosticIssue = {
  severity: "ok" | "warning" | "error";
  title: string;
  detail: string;
};

export default function DiagnosticsPage() {
  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);

  useEffect(() => {
    const found: DiagnosticIssue[] = [];

    // Viewport overflow detector
    const offenders = [...document.querySelectorAll("*")]
      .filter((el) => el.scrollWidth > window.innerWidth + 2)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: (el as HTMLElement).className || "(no class)",
        width: el.scrollWidth,
      }));

    if (offenders.length > 0) {
      offenders.slice(0, 10).forEach((o) => {
        found.push({
          severity: "error",
          title: "Viewport overflow",
          detail: `${o.tag}.${o.cls} exceeds viewport (${o.width}px)`,
        });
      });
    } else {
      found.push({
        severity: "ok",
        title: "Viewport health",
        detail: "No overflow detected",
      });
    }

    // Scroll contract
    const htmlStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);

    if (htmlStyle.overflowY === "hidden") {
      found.push({
        severity: "error",
        title: "HTML scroll blocked",
        detail: "html overflow-y is hidden",
      });
    }

    if (bodyStyle.overflowY === "hidden") {
      found.push({
        severity: "error",
        title: "Body scroll blocked",
        detail: "body overflow-y is hidden",
      });
    }

    // Root check
    const root = document.getElementById("root");
    if (root) {
      const rootStyle = getComputedStyle(root);
      if (rootStyle.maxHeight !== "none") {
        found.push({
          severity: "warning",
          title: "Root max-height",
          detail: `#root max-height = ${rootStyle.maxHeight}`,
        });
      }
    }

    // Console/runtime hints
    found.push({
      severity: "ok",
      title: "Diagnostics running",
      detail: "Scriptora founder diagnostics active",
    });

    setIssues(found);
  }, []);

  const score = useMemo(() => {
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    return Math.max(0, 100 - (errors * 18 + warnings * 8));
  }, [issues]);

  return (
    <main className="min-h-[100dvh] bg-black text-white p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black">
            Scriptora Diagnostics OS
          </h1>
          <p className="text-white/60 mt-2">
            Founder pre-login diagnostics
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/50">
            System Health
          </div>
          <div className="text-6xl font-black mt-2">
            {score}/100
          </div>
        </div>

        <div className="space-y-4">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                {issue.severity === "ok" && <CheckCircle2 className="text-green-400" />}
                {issue.severity === "warning" && <AlertTriangle className="text-yellow-400" />}
                {issue.severity === "error" && <ShieldAlert className="text-red-400" />}

                <strong>{issue.title}</strong>
              </div>

              <p className="text-white/70">
                {issue.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
