import { L, type LocalizedText } from "./landing-v3-data";
import type { UILanguage } from "@/lib/i18n";

const PIPELINE: { id: string; label: LocalizedText; x: number; y: number }[] = [
  { id: "launch", label: { en: "Launch OS", it: "Launch OS", es: "Launch OS", fr: "Launch OS", de: "Launch OS" }, x: 8, y: 18 },
  { id: "writer", label: { en: "Writer OS", it: "Writer OS", es: "Writer OS", fr: "Writer OS", de: "Writer OS" }, x: 26, y: 34 },
  { id: "editorial", label: { en: "Editorial OS", it: "Editorial OS", es: "Editorial OS", fr: "Editorial OS", de: "Editorial OS" }, x: 44, y: 22 },
  { id: "market", label: { en: "Market OS", it: "Market OS", es: "Market OS", fr: "Market OS", de: "Market OS" }, x: 62, y: 38 },
  { id: "publish", label: { en: "Publish OS", it: "Publish OS", es: "Publish OS", fr: "Publish OS", de: "Publish OS" }, x: 82, y: 24 },
];

interface Props {
  lang: UILanguage;
}

/** Abstract product backdrop — OS pipeline, not scenery. */
export function LandingProductBackdrop({ lang }: Props) {
  return (
    <div className="scriptora-product-backdrop" aria-hidden="true">
      <svg className="scriptora-product-backdrop-lines" viewBox="0 0 1000 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="scriptora-pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(103, 232, 249, 0.55)" />
            <stop offset="45%" stopColor="rgba(192, 132, 252, 0.55)" />
            <stop offset="100%" stopColor="rgba(251, 191, 36, 0.5)" />
          </linearGradient>
        </defs>
        <path
          d="M 60 90 C 180 130, 220 70, 340 110 S 520 150, 620 95 S 760 60, 920 100"
          fill="none"
          stroke="url(#scriptora-pipe-grad)"
          strokeWidth="1.5"
          strokeDasharray="8 10"
          className="scriptora-product-flow-line"
        />
        <path
          d="M 80 280 C 200 240, 280 310, 400 270 S 580 230, 700 290 S 820 320, 940 260"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          strokeDasharray="4 12"
        />
      </svg>

      <div className="scriptora-product-backdrop-nodes">
        {PIPELINE.map((node) => (
          <div
            key={node.id}
            className={`scriptora-product-node scriptora-product-node-${node.id}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="scriptora-product-node-dot" />
            <span className="scriptora-product-node-label">{L(node.label, lang)}</span>
          </div>
        ))}
      </div>

      <div className="scriptora-product-backdrop-center">
        <span className="scriptora-product-backdrop-ring scriptora-product-backdrop-ring-a" />
        <span className="scriptora-product-backdrop-ring scriptora-product-backdrop-ring-b" />
        <span className="scriptora-product-backdrop-core">Scriptora OS</span>
      </div>
    </div>
  );
}
