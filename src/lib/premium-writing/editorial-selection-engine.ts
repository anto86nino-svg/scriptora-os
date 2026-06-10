export function buildEditorialSelectionBlock(): string {
  return `
EDITORIAL SELECTION ENGINE (MANDATORY — internal, do not output this process):
Before finalizing each scene, mentally generate 3 distinct directions, then select the strongest.

Evaluate each option on:
1. TENSION — does it raise stakes or delay payoff productively?
2. ORIGINALITY — is it predictable romance/thriller filler?
3. EMOTIONAL IMPACT — does it cost the character something visible?
4. COHERENCE — does it honor prior chapters and character wounds?

SELECT the option that scores highest on tension + originality.
Never ship the first acceptable beat. Ship the best available beat.
Do not describe this selection process in the output — prose only.
`.trim();
}
