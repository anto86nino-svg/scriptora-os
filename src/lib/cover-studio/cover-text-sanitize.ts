const TECHNICAL_KEYS = new Set([
  "purpose",
  "emotionalfunction",
  "targetaudience",
  "audience",
  "genre",
  "tone",
  "mood",
  "themes",
  "conflict",
  "hook",
  "promise",
  "stakes",
  "setting",
  "protagonist",
  "antagonist",
  "summary",
  "synopsis",
  "logline",
  "tagline",
  "keywords",
  "metadata",
  "prompt",
  "system",
  "role",
  "content",
  "description",
  "biography",
  "bio",
  "text",
  "body",
  "message",
  "value",
  "label",
  "title",
  "subtitle",
  "author",
]);

const HUMAN_PRIORITY_KEYS = [
  "description",
  "synopsis",
  "summary",
  "blurb",
  "bio",
  "biography",
  "about",
  "text",
  "body",
  "content",
  "message",
  "hook",
  "promise",
  "tagline",
  "logline",
];

function cleanWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function looksLikeJsonBlob(s: string) {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function extractFromObject(obj: Record<string, unknown>, depth = 0): string {
  if (depth > 3) return "";
  for (const key of HUMAN_PRIORITY_KEYS) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (typeof val === "string" && val.trim().length > 12) return cleanWhitespace(val);
  }
  for (const val of Object.values(obj)) {
    if (typeof val === "string" && val.trim().length > 20 && !looksLikeJsonBlob(val)) {
      if (!/^\s*[\[{]/.test(val)) return cleanWhitespace(val);
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = extractFromObject(val as Record<string, unknown>, depth + 1);
      if (nested) return nested;
    }
  }
  const stringParts = Object.entries(obj)
    .filter(([k, v]) => typeof v === "string" && v.trim().length > 8 && !TECHNICAL_KEYS.has(k.toLowerCase()))
    .map(([, v]) => cleanWhitespace(String(v)));
  if (stringParts.length) return stringParts.join(" ");
  return "";
}

/** Strip JSON/prompt metadata from user-visible cover text fields. */
export function sanitizeCoverVisibleText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "number" || typeof value === "boolean") return fallback;

  if (typeof value === "object") {
    const extracted = extractFromObject(value as Record<string, unknown>);
    return extracted || fallback;
  }

  let raw = String(value).trim();
  if (!raw) return fallback;

  if (looksLikeJsonBlob(raw)) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        const extracted = extractFromObject(parsed as Record<string, unknown>);
        if (extracted) return extracted.slice(0, 1200);
      }
    } catch {
      /* fall through */
    }
    return fallback || "Descrizione del libro in arrivo.";
  }

  raw = raw
    .replace(/^\s*[\[{]/, "")
    .replace(/[\]}]\s*$/, "")
    .replace(/"([^"]+)"\s*:\s*/g, "")
    .replace(/,\s*"/g, ". ")
    .replace(/"/g, "")
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ");

  const lines = raw.split(/\n|(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean);
  const cleanLines = lines.filter((line) => {
    const keyMatch = line.match(/^"?([a-zA-Z_]+)"?\s*[:=]/);
    if (keyMatch && TECHNICAL_KEYS.has(keyMatch[1].toLowerCase())) return false;
    if (/^[\[{]/.test(line) || /^[}\]],?$/.test(line)) return false;
    if (/^"?(purpose|emotionalFunction|targetAudience)"?/i.test(line)) return false;
    return line.length > 2;
  });

  const result = cleanWhitespace(cleanLines.join(" "));
  if (!result || result.length < 8) return fallback || result;
  if (/^[\[{]|"?:\s*[\[{]/.test(result)) return fallback || "Descrizione del libro in arrivo.";
  return result.slice(0, 1200);
}
