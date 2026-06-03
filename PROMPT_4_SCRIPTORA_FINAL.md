SCRIPTORA — PROMPT 4 FINALE / STABILIZZAZIONE POST-CRASH

Baseline obbligatoria:
Stiamo partendo dalla versione-cassaforte post-crash.

Branch base:
agents/mobile-overlay-preventive-integration

Commit base:
52f8a92 fix: reveal authenticated dashboard past boot splash

Tag base:
scriptora-dashboard-boot-splash-fix-mobile-20260603

Branch attuale di lavoro:
prompt-4-scriptora-final-stabilization

Produzione:
https://scriptora-os.vercel.app

REGOLE ASSOLUTE:
- Non rompere boot, auth, dashboard, Supabase, pricing, credit wallet, export, KDP o generation engine.
- Non fare refactor distruttivi.
- Non cambiare schema database.
- Non toccare env/keys.
- Non rimuovere il fix dashboardFailOpen/effectiveRevealed in ScriptoraBootGate.tsx.
- Se un intervento è rischioso, NON farlo e scriverlo nel report.

PRIORITÀ 1 — Preservare Boot/Auth/Dashboard Mobile
Verificare che il fix in src/components/ScriptoraBootGate.tsx resti intatto:
- isDashboardRoute
- dashboardFailOpen
- effectiveBootComplete
- effectiveRevealed
- log [SCRIPTORA_BOOT]

Regola:
Su /dashboard, se authReady + storageReady + planReady sono true, la dashboard deve essere visibile. Mai più splash infinito “Preparazione del tuo universo creativo”.

PRIORITÀ 2 — Dashboard Shell Fail-Safe
Dashboard deve aprirsi anche se:
- projectsFetch fallisce
- walletFetch fallisce
- planFetch fallisce
- activeProject non esiste
- localStorage/sessionStorage ha dati vecchi

In questi casi:
- mostra dashboard shell
- messaggio chiaro
- nessun blocco full-screen
- log [SCRIPTORA_BOOT]

PRIORITÀ 3 — Chapter Generation UX Mobile
Correggere problemi evidenti:
- anteprima capitolo breve/editoriale, non duplicare il capitolo intero
- capitolo reale in area manoscritto live
- eliminare card duplicate/wrapper vuoti
- ridurre spazi morti enormi
- CTA/note crediti non coperte da AUTH DEBUG/DEV
- nessuna modifica invasiva al generation engine

PRIORITÀ 4 — Output Sanitization Guard
Rafforzare un guard leggero prima di mostrare/salvare output finale:
- rimuovere inglese casuale se lingua selezionata è italiano
- rimuovere label UI tipo Genre Coach
- rimuovere prompt leakage/testi tecnici
- rimuovere frammenti rotti tipo “, .”
- rimuovere placeholder
- ridurre duplicazioni evidenti nello stesso blocco

Non riscrivere il motore intero.

PRIORITÀ 5 — Narrative Anti-Repetition Layer
Patch additiva:
- evitare stesso beat emotivo ripetuto
- evitare stessa confessione/paura ripetuta
- meno dialoghi terapeutici perfetti
- più sottotesto, gesto, attrito, conseguenza narrativa
- non rompere stile romance/emozione

PRIORITÀ 6 — Credit Wallet Audit leggero
Verificare che le funzioni AI/premium principali passino da credit policy o logghino consumo:
- generazione capitolo
- rewrite
- analisi/diagnostica
- fix capitolo
- KDP/title/packaging/prediction
- export avanzato

Se DEV mode simula crediti, renderlo chiaro. Wallet fallito non deve bloccare tutta l’app.

PRIORITÀ 7 — Export/Cover Studio UX
Se manca copertina in export:
- CTA chiara “Crea copertina”
- collegamento a Cover Studio/progetto corrente se già esiste
- sistemare layout mobile solo se footer/CTA sono coperti
- niente feature enorme nuova

PRIORITÀ 8 — KDP Launch Mobile/Italiano
Correggere solo problemi evidenti:
- lingua italiana se Italian/Amazon.it
- Bestseller Prediction mobile in card verticali
- evitare duplicazione wizard/Title Domination Studio
- metriche commerciali coerenti se già presenti

VERIFICHE FINALI OBBLIGATORIE:
npm run build
npm run typecheck
git diff --check
git status
git diff --stat

REPORT FINALE:
1. File modificati.
2. Cosa è stato corretto.
3. Cosa NON è stato toccato.
4. Conferma fix boot dashboard preservato.
5. Build/typecheck/diff-check verdi.
6. Cosa testare su smartphone.
7. Cosa testare su desktop.
8. Rischi rimasti.

NON dichiarare “finito” senza test:
- /dashboard?bootdebug=1 mobile
- login Google
- dashboard visibile
- /app
- generazione capitolo breve
- export modal
- KDP Launch
