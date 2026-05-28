const manuscriptTitleMemory: string[] = [];

export function registerGeneratedTitle(title: string) {
  manuscriptTitleMemory.push(title);
}

export function getPreviousGeneratedTitles() {
  return manuscriptTitleMemory;
}

export function generateMaskedChapterTitle({
  internalTitle,
  content,
  genre,
  previousTitles = [],
  chapterNumber,
}: {
  internalTitle: string;
  content: string;
  genre?: string;
  previousTitles?: string[];
  chapterNumber?: number;
}) {
  const blacklist = [
    "awakening",
    "threshold",
    "fracture",
    "desire",
    "revelation",
    "collapse",
    "the beginning",
    "the truth",
    "the crack",
  ];

  const lower = internalTitle.toLowerCase();

  const shouldMask = blacklist.some((b) => lower.includes(b));

  if (!shouldMask) {
    return internalTitle;
  }

  const lines = content
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);

  const atmospheric = lines.find(
    (l) =>
      l.length > 12 &&
      l.length < 60 &&
      !previousTitles.includes(l)
  );

  if (atmospheric) {
    return atmospheric.replace(/["']/g, "").trim();
  }

  if (genre?.includes("travel")) {
    return `Beyond ${chapterNumber ?? ""}`.trim();
  }

  if (genre?.includes("fantasy")) {
    return `Under the Ancient Sky`;
  }

  if (genre?.includes("romance")) {
    return `What She Never Said`;
  }

  return internalTitle;
}
