# Scriptora

**Universal Publishing OS** — scrivi, rifinisci ed esporta libri professionali (narrativa, saggistica, manuali, poesia e altro) con AI adattiva per tipo di opera.

## Stack

- React + Vite + TypeScript
- Supabase (auth, storage, edge functions, credit wallet)
- Tailwind + Radix UI

## Sviluppo locale

```bash
npm install
cp .env.example .env   # compila le chiavi Supabase
npm run dev
```

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
