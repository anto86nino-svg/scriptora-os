export type {
  AppliedIntervention,
  DeltaPresentationMode,
  DevelopmentalEditInput,
  DevelopmentalEditReport,
  EditorialMetricRow,
  PatchRecord,
  SurgicalInterventionId,
  SurgicalInterventionPlan,
} from "./types";

export { INTERVENTION_CATALOG, buildAppliedInterventions, classifyPatchIntervention } from "./interventions";
export { buildSurgicalEditDirectiveBlock, planSurgicalInterventions } from "./surgical-plan";
export { computeDevelopmentalEditReport } from "./delta-engine";

export const CHAPTER_DOCTOR_PRO_V1_KEY = "scriptora-chapter-doctor-pro-v1";

export function isChapterDoctorProEnabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_CHAPTER_DOCTOR_PRO === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(CHAPTER_DOCTOR_PRO_V1_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}
