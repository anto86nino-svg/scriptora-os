# Scriptora

**Universal Publishing OS** — scrivi, rifinisci ed esporta libri professionali (narrativa, saggistica, manuali, poesia e altro) con AI adattiva per tipo di opera.

## Stack

- React + Vite + TypeScript
- Supabase (auth, storage, edge functions, credit wallet)
- Tailwind + Radix UI

## Sviluppo locale

```bash
cd ~/Developer/'Startap scriptora.ac'
nvm use 22             # oppure usa Node 22 installato con Homebrew
npm ci
cp .env.example .env   # solo se .env non esiste; compila le chiavi Supabase
npm run dev
```

Apri il workspace pronto in Visual Studio Code dalla Scrivania con
`Scriptora.code-workspace`. Il server locale usa
[http://localhost:8081](http://localhost:8081).

Il progetto di lavoro è intenzionalmente fuori da iCloud Drive: migliaia di
placeholder cloud rallentavano o bloccavano Vite, Git e Vitest.

## Qualità

```bash
npm test
npm run build
npx tsc --noEmit
```

Audit qualità riproducibile: `src/lib/scriptora-quality-audit.ts`

## Pagamenti

Infrastruttura pronta, checkout disattivato di default.  
Guida attivazione: [docs/payments-setup.md](docs/payments-setup.md)

## Documentazione

- [docs/payments-roadmap.md](docs/payments-roadmap.md)
- [README_EXPORT.md](README_EXPORT.md)
