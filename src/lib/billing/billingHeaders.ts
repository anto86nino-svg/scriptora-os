import { getBillingExecutionMode } from "./billingMode";

/** Headers forwarded to edge functions for dev credit simulation (local_dev only). */
export function getBillingSimulationHeaders(): Record<string, string> {
  if (getBillingExecutionMode() === "local_dev") {
    return { "x-scriptora-credit-simulation": "true" };
  }
  return {};
}

export function withBillingSimulationBody<T extends Record<string, unknown>>(body: T): T {
  if (getBillingExecutionMode() === "local_dev") {
    return { ...body, creditSimulation: true };
  }
  return body;
}
