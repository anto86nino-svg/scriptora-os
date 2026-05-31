import type { WorkspaceToolId } from "@/lib/immersive/workspace-tool-mode";

interface WorkspaceToolVisualProps {
  tool: WorkspaceToolId;
}

/** Lightweight CSS/SVG 3D accent for active lateral tool — no external assets. */
export function WorkspaceToolVisual({ tool }: WorkspaceToolVisualProps) {
  return (
    <div className="scriptora-wos-tool-visual" data-tool={tool} aria-hidden>
      {tool === "voice" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <defs>
            <linearGradient id="wos-mic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(192 90% 62%)" />
              <stop offset="100%" stopColor="hsl(220 60% 38%)" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="98" rx="28" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <rect x="48" y="28" width="24" height="44" rx="12" fill="url(#wos-mic)" />
          <path d="M36 58 Q36 78 60 78 Q84 78 84 58" stroke="hsl(192 80% 70%)" strokeWidth="3" fill="none" />
          <line x1="60" y1="78" x2="60" y2="92" stroke="hsl(192 70% 65%)" strokeWidth="3" />
          <path className="scriptora-wos-tool-visual__wave" d="M14 52 Q22 44 30 52 T46 52" stroke="hsl(168 78% 55% / 0.7)" strokeWidth="2" fill="none" />
          <path className="scriptora-wos-tool-visual__wave scriptora-wos-tool-visual__wave--delay" d="M74 52 Q82 44 90 52 T106 52" stroke="hsl(168 78% 55% / 0.7)" strokeWidth="2" fill="none" />
        </svg>
      )}

      {tool === "cover" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="32" ry="7" fill="hsl(0 0% 0% / 0.35)" />
          <rect x="22" y="30" width="76" height="58" rx="4" fill="hsl(280 45% 42%)" transform="rotate(-6 60 59)" />
          <rect x="28" y="24" width="76" height="58" rx="4" fill="hsl(330 55% 52%)" />
          <rect x="34" y="38" width="44" height="4" rx="2" fill="hsl(0 0% 100% / 0.55)" />
          <rect x="34" y="48" width="32" height="3" rx="1.5" fill="hsl(0 0% 100% / 0.35)" />
          <circle cx="88" cy="34" r="8" fill="hsl(45 96% 58%)" />
        </svg>
      )}

      {tool === "export" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="30" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <rect x="24" y="22" width="34" height="44" rx="3" fill="hsl(210 80% 55%)" transform="rotate(-8 41 44)" />
          <rect x="44" y="28" width="34" height="44" rx="3" fill="hsl(28 85% 52%)" />
          <rect x="64" y="34" width="34" height="44" rx="3" fill="hsl(160 55% 42%)" transform="rotate(8 81 56)" />
          <text x="32" y="50" fill="white" fontSize="9" fontWeight="700" opacity="0.9">EPUB</text>
          <text x="52" y="56" fill="white" fontSize="8" fontWeight="700" opacity="0.85">PDF</text>
          <text x="72" y="62" fill="white" fontSize="7" fontWeight="700" opacity="0.8">DOCX</text>
        </svg>
      )}

      {tool === "market" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="28" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <circle cx="60" cy="56" r="34" fill="none" stroke="hsl(168 70% 48% / 0.25)" strokeWidth="8" />
          <circle cx="60" cy="56" r="34" fill="none" stroke="hsl(168 78% 55% / 0.55)" strokeWidth="8" strokeDasharray="40 174" className="scriptora-wos-tool-visual__radar" />
          <line x1="60" y1="56" x2="60" y2="24" stroke="hsl(168 90% 62% / 0.8)" strokeWidth="2" className="scriptora-wos-tool-visual__radar-arm" />
          <circle cx="78" cy="44" r="4" fill="hsl(45 96% 58%)" />
          <circle cx="48" cy="68" r="3" fill="hsl(192 90% 62%)" />
        </svg>
      )}

      {tool === "diagnostics" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="28" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <rect x="26" y="28" width="68" height="58" rx="6" fill="hsl(220 30% 18%)" stroke="hsl(168 78% 48% / 0.45)" strokeWidth="2" />
          <rect x="34" y="38" width="52" height="4" rx="2" fill="hsl(168 78% 55% / 0.7)" />
          <rect x="34" y="48" width="40" height="3" rx="1.5" fill="hsl(0 0% 100% / 0.25)" />
          <rect x="34" y="56" width="46" height="3" rx="1.5" fill="hsl(0 0% 100% / 0.18)" />
          <rect x="34" y="64" width="36" height="3" rx="1.5" fill="hsl(0 0% 100% / 0.14)" />
          <line x1="26" y1="36" x2="94" y2="78" stroke="hsl(168 90% 62% / 0.65)" strokeWidth="2" className="scriptora-wos-tool-visual__scan" />
        </svg>
      )}

      {tool === "characters" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="28" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <rect x="20" y="32" width="38" height="50" rx="4" fill="hsl(330 50% 48%)" transform="rotate(-10 39 57)" />
          <rect x="42" y="26" width="38" height="50" rx="4" fill="hsl(280 45% 52%)" />
          <rect x="64" y="34" width="38" height="50" rx="4" fill="hsl(210 55% 45%)" transform="rotate(10 83 59)" />
          <circle cx="61" cy="44" r="7" fill="hsl(0 0% 100% / 0.35)" />
          <rect x="52" y="54" width="18" height="14" rx="3" fill="hsl(0 0% 100% / 0.22)" />
        </svg>
      )}

      {tool === "author" && (
        <svg viewBox="0 0 120 120" className="scriptora-wos-tool-visual__svg">
          <ellipse cx="60" cy="98" rx="28" ry="6" fill="hsl(0 0% 0% / 0.35)" />
          <circle cx="60" cy="40" r="14" fill="hsl(210 40% 55%)" />
          <path d="M38 72 Q60 58 82 72 L82 88 Q60 78 38 88 Z" fill="hsl(210 35% 42%)" />
          <path d="M72 68 L98 52" stroke="hsl(45 90% 58%)" strokeWidth="3" strokeLinecap="round" />
          <path d="M98 52 L94 58 L100 58 Z" fill="hsl(45 90% 58%)" />
          <path d="M88 78 Q92 68 98 52" stroke="hsl(0 0% 100% / 0.35)" strokeWidth="1.5" fill="none" />
        </svg>
      )}
    </div>
  );
}
