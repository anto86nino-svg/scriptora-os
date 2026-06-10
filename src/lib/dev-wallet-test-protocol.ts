/**
 * Manual QA protocol — Google relogin + dev wallet + simulated credit purchase.
 * Run with `npm run dev` and owner Google account (VITE_SCRIPTORA_OWNER_EMAILS).
 */
export const DEV_WALLET_MANUAL_TEST_PROTOCOL = [
  "1. Login Google con account owner/dev (Natasha Romanoff).",
  "2. Verifica badge DEV · WALLET LOCALE in dashboard.",
  "3. Vai su /usage — pannello ricarica simulata visibile.",
  "4. Compra 5.000 crediti simulati — saldo aggiornato subito.",
  "5. Esegui export o operazione premium — saldo diminuisce.",
  "6. Consuma fino a saldo 0 — paywall Crediti insufficienti.",
  "7. Ricarica 1.000 crediti dal paywall o barra crediti.",
  "8. Ripeti operazione — deve funzionare.",
  "9. Attiva checkbox crediti illimitati — saldo non scende.",
  "10. Disattiva crediti illimitati — saldo scende di nuovo.",
  "11. Logout — toast uscita, redirect /auth, sessione chiusa.",
  "12. Login Google di nuovo — nessun loader infinito.",
  "13. Wallet dev e saldo precedente ancora coerenti (per-user localStorage).",
  "14. Ripeti acquisto + consumo da mobile (pill crediti + Dev +5k).",
] as const;
