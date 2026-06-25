import { StepWelcome, StepTitle, StepMarket, StepAuthor, StepStructure, StepCharacters, StepStyle, StepBlueprint } from "../steps";

export function renderWizardStep(step: number, props: any) {
  switch (step) {
    case 0:
      return <StepWelcome {...props} />;
    case 1:
      return <StepTitle {...props} />;
    case 2:
      return <StepMarket {...props} />;
    case 3:
      return <StepAuthor {...props} />;
    case 4:
      return <StepStructure {...props} />;
    case 5:
      return <StepCharacters {...props} />;
    case 6:
      return <StepStyle {...props} />;
    case 7:
      return <StepBlueprint {...props} />;
    default:
      return null;
  }
}
