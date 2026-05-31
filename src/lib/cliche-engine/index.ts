export type {
  ClicheCategory,
  ClicheEntry,
  ClicheHit,
  ClicheScanResult,
  ClicheSeverity,
} from "./types";

export { CLICHE_LIBRARY, getClichePreventionBlock } from "./library";
export { scanCliches } from "./scanner";
export { autoRewriteCliches, rewriteCliches } from "./rewriter";
