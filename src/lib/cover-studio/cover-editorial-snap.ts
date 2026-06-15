import type { CoverLayer } from "./cover-layers";
import { SAFE_TEXT_INSET_PCT } from "./cover-view-modes";

export type SnapGuide = { axis: "x" | "y"; value: number; label?: string };

const SNAP_THRESHOLD = 2.8;

const FRONT_SNAP_X = [50, 25, 75, SAFE_TEXT_INSET_PCT, 100 - SAFE_TEXT_INSET_PCT];
const FRONT_SNAP_Y = [18, 32, 50, 68, 82, 88, SAFE_TEXT_INSET_PCT, 100 - SAFE_TEXT_INSET_PCT];
const THUMB_TITLE_SAFE_Y = [28, 36, 44];

export function applyEditorialSnap(
  x: number,
  y: number,
  layer: CoverLayer,
  opts?: { thumbnailMode?: boolean },
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  let sx = x;
  let sy = y;

  const snapX = [...FRONT_SNAP_X];
  const snapY = layer.type === "title" && opts?.thumbnailMode
    ? [...FRONT_SNAP_Y, ...THUMB_TITLE_SAFE_Y]
    : [...FRONT_SNAP_Y];

  for (const target of snapX) {
    if (Math.abs(sx - target) <= SNAP_THRESHOLD) {
      sx = target;
      guides.push({ axis: "x", value: target, label: target === 50 ? "center" : undefined });
      break;
    }
  }
  for (const target of snapY) {
    if (Math.abs(sy - target) <= SNAP_THRESHOLD) {
      sy = target;
      guides.push({ axis: "y", value: target });
      break;
    }
  }

  return { x: sx, y: sy, guides };
}
