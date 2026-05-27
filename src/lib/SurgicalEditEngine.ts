export interface SurgicalEditOptions {
  preserveVoice?: boolean;
  preserveCanon?: boolean;
  intensity?: "low" | "medium" | "high";
}

export interface SurgicalResult {
  text: string;
  editsApplied: string[];
}

const AI_DIALOGUE_PATTERNS = [
  /i understand how you feel/gi,
  /i will always be here for you/gi,
  /you deserve better/gi,
  /i care about you deeply/gi,
  /i love you more than anything/gi,
  /everything will be okay/gi,
];

const PERFECT_DIALOGUE_PATTERNS = [
  /\bI understand\b/gi,
  /\bI know exactly how you feel\b/gi,
  /\bYou are not alone\b/gi,
  /\bI am here for you\b/gi,
];

function roughenDialogue(text: string): string {
  let result = text;

  result = result.replace(
    /I understand how you feel/gi,
    "I don't know... maybe I get it."
  );

  result = result.replace(
    /I will always be here for you/gi,
    "I'm still here, okay?"
  );

  result = result.replace(
    /You deserve better/gi,
    "Maybe... maybe this wasn't fair to you."
  );

  result = result.replace(
    /Everything will be okay/gi,
    "I don't know if it'll be okay."
  );

  result = result.replace(
    /\.\s+"/g,
    '.\n\n"'
  );

  return result;
}

function addSilenceInjection(text: string): string {
  const sentences = text.split(". ");

  if (sentences.length < 6) return text;

  const midpoint = Math.floor(sentences.length / 2);

  sentences.splice(
    midpoint,
    0,
    "Nobody said anything for a moment"
  );

  return sentences.join(". ");
}

function trimOverExplanation(text: string): string {
  return text
    .replace(/she felt devastated/gi, "her throat tightened")
    .replace(/he felt broken/gi, "he looked away")
    .replace(/she was heartbroken/gi, "she stopped speaking");
}

export function applyDialogueRoughening(
  text: string,
  options: SurgicalEditOptions = {}
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const foundAiDialogue = AI_DIALOGUE_PATTERNS.some((p) =>
    p.test(text)
  );

  const foundPerfectDialogue = PERFECT_DIALOGUE_PATTERNS.some((p) =>
    p.test(text)
  );

  if (foundAiDialogue || foundPerfectDialogue) {
    edited = roughenDialogue(edited);
    editsApplied.push("dialogue_roughening");
  }

  edited = addSilenceInjection(edited);

  if (edited !== text) {
    editsApplied.push("silence_injection");
  }

  const trimmed = trimOverExplanation(edited);

  if (trimmed !== edited) {
    edited = trimmed;
    editsApplied.push("emotional_trimming");
  }

  
  if (
    hasWarning(
      analysis.warnings,
      "weak_subtext"
    )
  ) {
    const result =
      applySubtextEnhancement(
        edited
      );

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  
  if (
    hasWarning(
      analysis.warnings,
      "overwritten_scene"
    )
  ) {
    const result =
      applyEndingCompression(
        edited
      );

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  
  if (
    hasWarning(
      analysis.warnings,
      "overwritten_scene"
    )
  ) {
    const result =
      applyEndingCompression(
        edited
      );

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  
  if (
    hasWarning(
      analysis.warnings,
      "character_flattening"
    ) ||
    hasWarning(
      analysis.warnings,
      "emotional_redundancy"
    )
  ) {
    const result =
      applyTensionPreservation(
        edited
      );

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  
  if (
    hasWarning(
      analysis.warnings,
      "character_flattening"
    ) ||
    hasWarning(
      analysis.warnings,
      "emotional_redundancy"
    )
  ) {
    const result =
      applyTensionPreservation(
        edited
      );

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

import {
  analyzeNovel,
  type EditorialWarning,
} from "./EditorialIntelligence";

function hasWarning(
  warnings: EditorialWarning[],
  type: string
): boolean {
  return warnings.some(
    (w) =>
      w.type === type &&
      (w.severity === "medium" ||
        w.severity === "high")
  );
}

export function applySurgicalEditingFromWarnings(
  text: string
): SurgicalResult {
  const analysis = analyzeNovel(text);

  let edited = text;
  const editsApplied: string[] = [];

  if (
    hasWarning(
      analysis.warnings,
      "dialogue_perfection"
    )
  ) {
    const result =
      applyDialogueRoughening(edited);

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

function applySubtextEnhancement(
  text: string
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const replacements: Array<[RegExp, string]> = [
    [
      /\b(she|he) felt devastated\b/gi,
      "$1 went quiet"
    ],
    [
      /\b(she|he) felt broken\b/gi,
      "$1 looked away"
    ],
    [
      /\b(she|he) felt abandoned\b/gi,
      "$1 checked the phone again"
    ],
    [
      /\b(she|he) was heartbroken\b/gi,
      "$1 stopped speaking"
    ],
    [
      /\b(she|he) felt scared\b/gi,
      "$1 hesitated"
    ],
    [
      /\b(she|he) felt angry\b/gi,
      "$1 clenched their jaw"
    ]
  ];

  for (const [pattern, replacement] of replacements) {
    const next = edited.replace(
      pattern,
      replacement
    );

    if (next !== edited) {
      edited = next;
    }
  }

  if (edited !== text) {
    editsApplied.push(
      "subtext_enhancement"
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

function applyEndingCompression(
  text: string
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const patterns: Array<[RegExp, string]> = [
    [
      /\b(she|he) thought about everything that had happened\./gi,
      ""
    ],
    [
      /\bmaybe nothing would ever be the same\./gi,
      ""
    ],
    [
      /\bit felt like the end of something\./gi,
      ""
    ],
    [
      /\b(she|he) felt sad and overwhelmed\./gi,
      "$1 stayed quiet."
    ],
    [
      /\b(she|he) didn't know what to say\./gi,
      "$1 said nothing."
    ]
  ];

  for (const [pattern, replacement] of patterns) {
    const next = edited.replace(
      pattern,
      replacement
    );

    if (next !== edited) {
      edited = next;
    }
  }

  edited = edited.replace(
    /(\.|\!|\?)\s+([A-Z])/g,
    "$1\n\n$2"
  );

  if (edited !== text) {
    editsApplied.push(
      "ending_compression"
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

function applyEndingCompression(
  text: string
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const patterns: Array<[RegExp, string]> = [
    [
      /\b(she|he) thought about everything that had happened\./gi,
      ""
    ],
    [
      /\bmaybe nothing would ever be the same\./gi,
      ""
    ],
    [
      /\bit felt like the end of something\./gi,
      ""
    ],
    [
      /\b(she|he) felt sad and overwhelmed\./gi,
      "$1 stayed quiet."
    ],
    [
      /\b(she|he) didn't know what to say\./gi,
      "$1 said nothing."
    ]
  ];

  for (const [pattern, replacement] of patterns) {
    const next = edited.replace(
      pattern,
      replacement
    );

    if (next !== edited) {
      edited = next;
    }
  }

  edited = edited.replace(
    /(\.|\!|\?)\s+([A-Z])/g,
    "$1\n\n$2"
  );

  if (edited !== text) {
    editsApplied.push(
      "ending_compression"
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

function applyTensionPreservation(
  text: string
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const replacements: Array<[RegExp, string]> = [
    [
      /\bI missed you too\b/gi,
      "She looked away."
    ],
    [
      /\bI love you too\b/gi,
      "Nobody answered immediately."
    ],
    [
      /\bI forgive you\b/gi,
      "It wasn't that simple."
    ],
    [
      /\bEverything is okay now\b/gi,
      "Not everything felt fixed."
    ],
    [
      /\bWe can finally be happy\b/gi,
      "It still felt fragile."
    ]
  ];

  for (const [pattern, replacement] of replacements) {
    const next = edited.replace(
      pattern,
      replacement
    );

    if (next !== edited) {
      edited = next;
    }
  }

  if (edited !== text) {
    editsApplied.push(
      "tension_preservation"
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}

function applyTensionPreservation(
  text: string
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const replacements: Array<[RegExp, string]> = [
    [
      /\bI missed you too\b/gi,
      "She looked away."
    ],
    [
      /\bI love you too\b/gi,
      "Nobody answered immediately."
    ],
    [
      /\bI forgive you\b/gi,
      "It wasn't that simple."
    ],
    [
      /\bEverything is okay now\b/gi,
      "Not everything felt fixed."
    ],
    [
      /\bWe can finally be happy\b/gi,
      "It still felt fragile."
    ]
  ];

  for (const [pattern, replacement] of replacements) {
    const next = edited.replace(
      pattern,
      replacement
    );

    if (next !== edited) {
      edited = next;
    }
  }

  if (edited !== text) {
    editsApplied.push(
      "tension_preservation"
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}
