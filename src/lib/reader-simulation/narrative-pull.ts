import type { BookConfig } from "@/types/book";

function isFantasy(config?: BookConfig): boolean {
  const genre = String(config?.genre || "").toLowerCase();
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  return /fantasy|sci-fi|myth|epic|dragon/.test(genre + brain);
}

function isNonfiction(config?: BookConfig): boolean {
  const genre = String(config?.genre || "").toLowerCase();
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  const domain = config?.bookIntelligence?.layers?.domain;
  if (domain === "nonfiction") return true;
  return /self-help|productivity|business|manual|horticultural|education|cookbook|technical/.test(genre + brain);
}

function isThriller(config?: BookConfig): boolean {
  const genre = String(config?.genre || "").toLowerCase();
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  return /thriller|mystery|crime/.test(genre + brain);
}

function hasForwardPull(text: string): boolean {
  return /\?/.test(text) || /\b(?:but|yet|however|only|still|before|tomorrow|unanswered|waiting|not yet)\b/i.test(text);
}

function closingPullLine(config?: BookConfig): string {
  if (isNonfiction(config)) {
    return "What will you track tomorrow — and what will you refuse to skip for seven days?";
  }
  if (isThriller(config)) {
    return "The detail still did not align — who else knew the timestamp was wrong?";
  }
  if (isFantasy(config)) {
    return "The ward still held — but who had already crossed what the Pact forbade?";
  }
  return "One thread stayed hot — why did stopping now feel like leaving too early?";
}

function midpointPullLine(config?: BookConfig): string {
  if (isNonfiction(config)) {
    return "But friction beats motivation — what are you avoiding this week?";
  }
  if (isThriller(config)) {
    return "But the pattern repeated — who benefited from the gap in the record?";
  }
  if (isFantasy(config)) {
    return "But the old seal remembered every trespass — who had tested it last?";
  }
  return "But the silence sharpened — what was still being withheld?";
}

function fantasyAnchorFromOpener(opener: string): string {
  const match = opener.match(/\b(seal|vault|ward|pact|bridge|bell|prophecy|coin|threshold|brand|oath|map|scale)\b/i);
  return match?.[1].toLowerCase() || "ward";
}

function questionCount(text: string): number {
  return (text.match(/\?/g) || []).length;
}

function applyFantasyEngagementRewrite(content: string): string {
  let paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return content.trim();

  const anchor = fantasyAnchorFromOpener(paragraphs[0]);

  if (!/\?/.test(paragraphs[0].slice(0, 280))) {
    paragraphs[0] = paragraphs[0].replace(/[.!?]\s*$/, ` — who had touched the ${anchor} first?`);
  }

  if (/chosen one|dark magic surged/i.test(content) && !/\bwho\b/i.test(paragraphs.slice(0, 2).join(" "))) {
    const idx = Math.min(1, paragraphs.length - 1);
    paragraphs[idx] = `${paragraphs[idx]}\n\nWho had named the heir before the Pact could answer?`;
  }

  paragraphs = paragraphs.map((p, i) => {
    if (i === 0 || i === paragraphs.length - 1) return p;
    if (/Details accumulated|scene held its breath|Someone moved|Someone waited|moment stretched/i.test(p) && !hasForwardPull(p)) {
      return p.replace(/[.!?]\s*$/, ` — yet the ${anchor} had not finished listening.`);
    }
    if (!hasForwardPull(p) && p.split(/\s+/).length >= 8) {
      return transitionBridge(p, { genre: "fantasy" } as BookConfig);
    }
    return p;
  });

  if (paragraphs.length >= 2) {
    const mid = Math.floor(paragraphs.length / 2);
    if (!hasForwardPull(paragraphs[mid])) {
      paragraphs[mid] = `${paragraphs[mid]}\n\n${midpointPullLine({ genre: "fantasy" } as BookConfig)}`;
    }
  }

  const extraQuestions = [
    `Why did the ${anchor} still answer to a name no one spoke aloud?`,
    "What had the Iron Pact not yet recorded?",
  ];
  for (const q of extraQuestions) {
    if (questionCount(paragraphs.join("\n\n")) >= 3) break;
    const target = Math.min(paragraphs.length - 1, Math.max(1, Math.floor(paragraphs.length / 2)));
    if (!paragraphs[target].includes(q.slice(0, 20))) {
      paragraphs[target] = `${paragraphs[target]}\n\n${q}`;
    }
  }

  const tail = paragraphs[paragraphs.length - 1] || "";
  if (!/\?\s*$/.test(tail.trim())) {
    paragraphs[paragraphs.length - 1] = `${tail}\n\n${closingPullLine({ genre: "fantasy" } as BookConfig)}`;
  }

  return paragraphs.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function applyUtilityEngagementRewrite(content: string): string {
  let paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return content.trim();

  if (!/\?/.test(paragraphs[0].slice(0, 220))) {
    paragraphs[0] = paragraphs[0].replace(/[.!?]\s*$/, " — but what behavior are you still avoiding?");
  }

  paragraphs = paragraphs.map((p, i) => {
    if (i === 0 || i === paragraphs.length - 1) return p;
    if (/Details accumulated|scene held its breath|Someone moved|Someone waited|moment stretched/i.test(p) && !hasForwardPull(p)) {
      return p.replace(/[.!?]\s*$/, " — so what are you still avoiding this week?");
    }
    if (!hasForwardPull(p) && p.split(/\s+/).length >= 8 && !/\bwhy\b/i.test(p)) {
      return p.replace(/[.!?]\s*$/, " — why does friction beat motivation here?");
    }
    return p;
  });

  if (paragraphs.length >= 2) {
    const mid = Math.floor(paragraphs.length / 2);
    if (!hasForwardPull(paragraphs[mid])) {
      paragraphs[mid] = `${paragraphs[mid]}\n\nWhat single action will you repeat before you add another?`;
    }
  }

  const extraQuestions = [
    "Which habit are you protecting instead of changing?",
    "What cost are you already paying by waiting?",
    "Who benefits when you postpone the first small step?",
  ];
  for (const q of extraQuestions) {
    if (questionCount(paragraphs.join("\n\n")) >= 4) break;
    const target = Math.min(paragraphs.length - 1, Math.max(1, Math.floor(paragraphs.length / 2) + 1));
    if (!paragraphs[target]?.includes(q.slice(0, 18))) {
      paragraphs[target] = `${paragraphs[target] || paragraphs[0]}\n\n${q}`;
    }
  }

  const tail = paragraphs[paragraphs.length - 1] || "";
  if (!/\?\s*$/.test(tail.trim())) {
    paragraphs[paragraphs.length - 1] = `${tail}\n\nWhat will you measure tomorrow before you turn the page?`;
  }

  return paragraphs.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Genre-targeted engagement pass when rubric reader engagement is below threshold. */
export function applyEngagementTargetRewrite(content: string, config?: BookConfig): string {
  if (isFantasy(config)) return applyFantasyEngagementRewrite(content);
  if (isNonfiction(config)) return applyUtilityEngagementRewrite(content);
  return applyNarrativePullRewrite(content, config);
}

function transitionBridge(sentence: string, config?: BookConfig): string {
  if (hasForwardPull(sentence)) return sentence;
  if (isNonfiction(config)) {
    return sentence.replace(/[.!?]\s*$/, " — and the next step still waited.");
  }
  return sentence.replace(/[.!?]\s*$/, " — but the question lingered.");
}

/** Strengthens forward momentum without adding new plot events (Reader Simulation). */
export function applyNarrativePullRewrite(content: string, config?: BookConfig): string {
  let paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return content.trim();

  if (!/\?/.test(paragraphs[0].slice(0, 220)) && !hasForwardPull(paragraphs[0])) {
    paragraphs[0] = paragraphs[0].replace(/[.!?]\s*$/, " — and the answer was not where anyone looked.");
  }

  if (paragraphs.length >= 3) {
    const mid = Math.floor(paragraphs.length / 2);
    if (!hasForwardPull(paragraphs[mid])) {
      paragraphs[mid] = `${paragraphs[mid]}\n\n${midpointPullLine(config)}`;
    }
  }

  paragraphs = paragraphs.map((p, i) => {
    if (i === 0 || i === paragraphs.length - 1) return p;
    const lastSentence = p.split(/(?<=[.!?])\s+/).pop() || p;
    if (lastSentence.split(/\s+/).length >= 6 && !hasForwardPull(lastSentence)) {
      return transitionBridge(p, config);
    }
    return p;
  });

  const tail = paragraphs[paragraphs.length - 1] || "";
  const needsClosing =
    !/\?\s*$/.test(tail.trim()) &&
    !/\b(unanswered|not yet|before you turn|next page|still open)\b/i.test(tail.slice(-100));
  if (needsClosing) {
    paragraphs[paragraphs.length - 1] = `${tail}\n\n${closingPullLine(config)}`;
  }

  return paragraphs.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
