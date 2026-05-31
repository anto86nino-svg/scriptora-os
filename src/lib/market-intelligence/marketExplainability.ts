/** Expandable "Why this score?" sections — bullet keys resolved via i18n. */

export interface ExplainabilitySection {
  titleKey: string;
  bulletKeys: string[];
}

export function buildTitleIntelligenceExplanations(input: {
  hasFallback: boolean;
  avgOpportunity?: number;
  avgConversion?: number;
  keywordCount?: number;
  nicheCount?: number;
}): ExplainabilitySection[] {
  const sections: ExplainabilitySection[] = [];

  const hookBullets: string[] = [];
  if (input.avgConversion != null && input.avgConversion >= 80) {
    hookBullets.push("market_explain_hook_emotional_contrast");
  } else {
    hookBullets.push("market_explain_hook_curiosity");
  }
  hookBullets.push("market_explain_hook_genre_alignment");

  sections.push({
    titleKey: "market_explain_hook_strength",
    bulletKeys: hookBullets,
  });

  const scoreBullets: string[] = ["market_explain_score_niche_consistency"];
  if (input.nicheCount && input.nicheCount >= 2) {
    scoreBullets.push("market_explain_score_emotional_positioning");
  }
  scoreBullets.push("market_explain_score_reader_intent");

  sections.push({
    titleKey: "market_explain_market_score",
    bulletKeys: scoreBullets,
  });

  if (input.keywordCount && input.keywordCount > 0) {
    sections.push({
      titleKey: "market_explain_keyword_gold",
      bulletKeys: [
        "market_explain_kw_thematic_clusters",
        "market_explain_kw_semantic_alignment",
        "market_explain_kw_discoverability",
      ],
    });
  }

  if (input.hasFallback) {
    sections.push({
      titleKey: "market_explain_estimated_note",
      bulletKeys: ["market_explain_estimated_editorial", "market_explain_estimated_verify"],
    });
  }

  return sections;
}

export function buildRadarExplanations(input: {
  resultCount: number;
  marketScore?: number | null;
  isLocalIntel?: boolean;
}): ExplainabilitySection[] {
  const sections: ExplainabilitySection[] = [
    {
      titleKey: "market_explain_market_score",
      bulletKeys: [
        input.resultCount >= 3
          ? "market_explain_radar_multiple_signals"
          : "market_explain_radar_directional_signals",
        "market_explain_score_niche_consistency",
        "market_explain_score_reader_intent",
      ],
    },
  ];

  if (input.isLocalIntel) {
    sections.push({
      titleKey: "market_explain_estimated_note",
      bulletKeys: ["market_explain_premium_heuristic", "market_explain_estimated_verify"],
    });
  }

  return sections;
}

export function buildKeywordGoldExplanations(input: {
  goldKeywordCount: number;
  groundingUsed?: boolean;
}): ExplainabilitySection[] {
  return [
    {
      titleKey: "market_explain_keyword_gold",
      bulletKeys: [
        input.goldKeywordCount >= 3
          ? "market_explain_kw_thematic_clusters"
          : "market_explain_kw_semantic_alignment",
        "market_explain_kw_discoverability",
        input.groundingUsed
          ? "market_explain_kw_live_grounding"
          : "market_explain_estimated_editorial",
      ],
    },
  ];
}

export function buildNicheTrendingExplanations(input: {
  nicheCount: number;
  groundingUsed?: boolean;
}): ExplainabilitySection[] {
  return [
    {
      titleKey: "market_explain_niche_radar",
      bulletKeys: [
        input.nicheCount >= 4
          ? "market_explain_niche_cluster_depth"
          : "market_explain_niche_directional",
        input.groundingUsed
          ? "market_explain_niche_live_signals"
          : "market_explain_estimated_editorial",
        "market_explain_score_reader_intent",
      ],
    },
  ];
}

export function buildKdpMarketExplanations(input: {
  groundingUsed?: boolean;
  hasPremium?: boolean;
}): ExplainabilitySection[] {
  const sections: ExplainabilitySection[] = [
    {
      titleKey: "market_explain_market_score",
      bulletKeys: [
        input.groundingUsed
          ? "market_explain_kdp_grounded_demand"
          : "market_explain_estimated_editorial",
        "market_explain_score_niche_consistency",
        "market_explain_score_emotional_positioning",
      ],
    },
  ];

  if (input.hasPremium) {
    sections.push({
      titleKey: "market_explain_premium_intel",
      bulletKeys: [
        "market_explain_premium_heuristic",
        "market_explain_hook_genre_alignment",
        "market_explain_estimated_verify",
      ],
    });
  }

  return sections;
}

export function buildTitleDominationExplanations(input: {
  candidateCount: number;
  groundingUsed?: boolean;
  topScore?: number;
}): ExplainabilitySection[] {
  return [
    {
      titleKey: "market_explain_title_domination",
      bulletKeys: [
        input.groundingUsed
          ? "market_explain_dom_live_scan"
          : "market_explain_estimated_editorial",
        input.topScore != null && input.topScore >= 75
          ? "market_explain_dom_strong_commercial"
          : "market_explain_dom_directional",
        "market_explain_hook_curiosity",
      ],
    },
  ];
}
