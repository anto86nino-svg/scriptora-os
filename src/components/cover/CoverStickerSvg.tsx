import type { CSSProperties } from "react";
import type { StickerSymbolKey } from "@/lib/cover-studio/cover-stickers";

export function CoverStickerSvg({
  symbol,
  color = "#e6c36a",
  size = 32,
  className,
  style,
}: {
  symbol: StickerSymbolKey;
  color?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "-50 -50 100 100",
    className,
    style: { color, ...style } as CSSProperties,
  };

  switch (symbol) {
    case "moon":
      return (
        <svg {...svgProps}>
          <circle cx="5" cy="0" r="35" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="18" cy="-5" r="28" fill="var(--background, #000)" opacity="0.85" />
        </svg>
      );
    case "star":
      return (
        <svg {...svgProps}>
          <polygon points="0,-40 10,-12 40,-12 16,6 26,36 0,18 -26,36 -16,6 -40,-12 -10,-12" fill="currentColor" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case "book":
      return (
        <svg {...svgProps}>
          <rect x="-30" y="-35" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="3" />
          <line x1="0" y1="-35" x2="0" y2="35" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "crown":
      return (
        <svg {...svgProps}>
          <polyline points="-35,20 -20,-30 0,5 20,-30 35,20" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case "checkmark":
      return (
        <svg {...svgProps}>
          <polyline points="-30,0 -5,25 35,-25" fill="none" stroke="currentColor" strokeWidth="5" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
  }
}
