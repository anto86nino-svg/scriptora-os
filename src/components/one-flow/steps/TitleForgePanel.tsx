import type { FC } from "react";

type Props = {
  generatingTitles: boolean;
  runMagicalTitleGeneration: () => void | Promise<void>;
  titleProposals: any[];
  applyTitleProposal: (proposal: any) => void;
  freeTitleRegensLeft: number;
  WIZARD_TITLE_FREE_REGENS: number;
  TITLE_FORGE_PHASES: string[];
  titleForgePhase: number;
  titleForgeLabel: string;
  Loader2: any;
  Sparkles: any;
};

const TitleForgePanel: FC<Props> = () => {
  return null;
};

export default TitleForgePanel;
