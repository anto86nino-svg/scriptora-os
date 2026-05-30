export const GUIDED_TOUR_REQUEST_EVENT = "scriptora-guided-tour-request";

export const GUIDED_TOUR_IDS = {
  dashboard: "dashboard",
  writer: "writer",
  newbook: "newbook",
  characterStudio: "character-studio",
} as const;

export type GuidedTourId = (typeof GUIDED_TOUR_IDS)[keyof typeof GUIDED_TOUR_IDS];

export function requestGuidedTour(tourId: GuidedTourId): void {
  window.dispatchEvent(new CustomEvent(GUIDED_TOUR_REQUEST_EVENT, { detail: { tourId } }));
}
