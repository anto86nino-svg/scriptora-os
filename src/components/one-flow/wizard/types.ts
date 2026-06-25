export interface WizardState {}

export interface WizardActions {}

export interface WizardUiState {}

export interface BookForgeStepProps {
  state: WizardState;
  actions: WizardActions;
  ui: WizardUiState;
}
