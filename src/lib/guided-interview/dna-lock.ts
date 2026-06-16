export type BookDnaLock = {
  coreTopic?: string;
  primaryIntent?: string;
  targetReader?: string;
  tone?: string;
  educationalLevel?: string;

  whatBookIs?: string[];
  whatBookIsNot?: string[];

  antiDriftRules?: string[];

  confidenceScore: number;
  missingCriticalAnswers: string[];
};

export function buildInitialDnaLock(): BookDnaLock {
  return {
    confidenceScore: 0.1,
    whatBookIs: [],
    whatBookIsNot: [],
    antiDriftRules: [],
    missingCriticalAnswers: [],
  };
}
