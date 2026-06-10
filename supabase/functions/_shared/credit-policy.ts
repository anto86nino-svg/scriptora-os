export const CREDIT_OPERATION_COSTS: Record<string, number> = {
  generate_chapter_short: 150,
  generate_chapter_medium: 300,
  generate_chapter_long: 600,
  rewrite_chapter: 100,
  chapter_diagnostic: 50,
  fix_chapter: 75,
  auto_bestseller: 400,
  market_intelligence: 200,
  kdp_launch: 150,
  cover_generation: 150,
  character_studio_ai: 100,
  book_analysis: 75,
  export_premium: 50,
  masterpiece_mode: 0,
};

export function getOperationCost(operation: string): number {
  return CREDIT_OPERATION_COSTS[operation] ?? 0;
}
