/**
 * Coerce unknown UI values to plain strings — prevents React #31 when
 * `{ label, value }` option objects are rendered as children.
 */
export function safeDisplayText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.label === "string") return record.label;
    if (typeof record.title === "string") return record.title;
    if (typeof record.name === "string") return record.name;
    if (typeof record.value === "string" || typeof record.value === "number") {
      return String(record.value);
    }
    return "";
  }
  return "";
}

export function safeQuickSuggestionValue(chip: unknown): string {
  if (chip == null) return "";
  if (typeof chip === "string") return chip;
  if (typeof chip === "object") {
    const record = chip as Record<string, unknown>;
    const value = safeDisplayText(record.value);
    if (value) return value;
    return safeDisplayText(record.label);
  }
  return safeDisplayText(chip);
}

export function safeQuickSuggestionLabel(chip: unknown): string {
  if (chip == null) return "";
  if (typeof chip === "string") return chip;
  if (typeof chip === "object") {
    const record = chip as Record<string, unknown>;
    const label = safeDisplayText(record.label);
    if (label) return label;
    return safeDisplayText(record.value);
  }
  return safeDisplayText(chip);
}
