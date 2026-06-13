/** Study OS regression fixtures — school/university materials */

export const FIXTURE_REVOLUTION_FR = `La Rivoluzione francese (1789-1799) nasce da una crisi profonda del regime assoluto di Luigi XVI.
Le cause includono il debito dello Stato dopo le guerre, le disuguaglianze fiscali tra nobiltà, clero e Terzo Stato, e la diffusione delle idee illuministe sui diritti naturali.
Il 17 giugno 1789 il Terzo Stato si proclama Assemblea nazionale. Il 14 luglio la presa della Bastiglia simboleggia la fine dell'assolutismo.
La Dichiarazione dei diritti dell'uomo e del cittadino (1789) afferma libertà, proprietà, sicurezza e resistenza all'oppressione.
Durante la Convenzione (1792-1795) la Repubblica affronta guerre esterne e la Terrore guidata da Robespierre.
Napoleone Bonaparte consolida il potere con il colpo di Stato del 1799, ponendo fine al periodo rivoluzionario più turbolento ma diffondendo riforme giuridiche e amministrative in Europa.`;

export const FIXTURE_PHOTOSYNTHESIS = `La fotosintesi clorofilliana è il processo con cui le piante convertono energia luminosa in energia chimica.
Avviene nei cloroplasti, organelli contenenti la clorofilla, pigmento capace di assorbire la luce.
Nella fase lumiosa, l'acqua (H2O) viene scissa: si liberano ossigeno (O2), protoni ed elettroni.
Nella fase oscura (ciclo di Calvin), l'anidride carbonica (CO2) fissa carbonio e, grazie all'ATP e al NADPH prodotti prima, forma glucosio (C6H12O6).
La fotosintesi è fondamentale per la catena alimentare e per il bilancio di ossigeno nell'atmosfera.
Fattori limitanti: intensità luminosa, concentrazione di CO2, temperatura, disponibilità idrica.`;

export const FIXTURE_COSTITUZIONE = `La Costituzione italiana, entrata in vigore il 1 gennaio 1948, è la legge fondamentale della Repubblica.
I principi fondamentali (artt. 1-12) definiscono l'Italia come Repubblica democratica fondata sul lavoro.
La sovranità appartiene al popolo, che la esercita nelle forme costituzionali.
Sono garantiti i diritti inviolabili della persona, l'uguaglianza formale e sostanziale, e il rifiuto della guerra di aggressione.
Il Parlamento italiano è bicamerale: Camera dei deputati e Senato della Repubblica.
La Costituzione tutela libertà di pensiero, di religione, di manifestazione del pensiero, e il diritto al lavoro.
Il Presidente della Repubblica è il capo dello Stato; il Governo ha potere esecutivo; la magistratura è autonoma e indipendente.`;

export const FIXTURE_UNIVERSITY_MEMORY = `La memoria è un insieme di processi cognitivi che permettono di codificare, conservare e recuperare informazioni.
Il modello multi-store distingue memoria sensoriale, memoria a breve termine (working memory) e memoria a lungo termine.
La codificazione profonda (elaborazione semantica) favorisce la ritenzione rispetto alla ripetizione meccanica.
Il recupero può essere facilitato da indizi contestuali; lo schema di interferenza spiega dimenticanze e confusioni tra materiale simile.
L'apprendimento efficace combina ripasso distribuito, pratica recupero (retrieval practice) e auto-spiegazione.
In ambito letterario, l'analisi del testo richiede tema, destinatario, registro, figure retoriche e coerenza argomentativa.`;

export const STUDY_FIXTURES = [
  { id: "history-revolution", label: "Storia — Rivoluzione francese", text: FIXTURE_REVOLUTION_FR, mustInclude: ["1789", "Bastiglia", "Napoleone", "Terzo Stato"] },
  { id: "biology-photosynthesis", label: "Biologia — Fotosintesi", text: FIXTURE_PHOTOSYNTHESIS, mustInclude: ["clorofilla", "CO2", "glucosio", "ossigeno", "luce"] },
  { id: "law-constitution", label: "Diritto — Costituzione", text: FIXTURE_COSTITUZIONE, mustInclude: ["1948", "repubblica", "parlamento", "diritti"] },
  { id: "university-memory", label: "Università — Memoria", text: FIXTURE_UNIVERSITY_MEMORY, mustInclude: ["memoria", "apprendimento", "recupero"] },
] as const;
