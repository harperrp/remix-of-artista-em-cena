# Artista em Cena

Aplicação React + Supabase para gestão de artistas, CRM e financeiro.

## Ambiente já migrado para o novo Supabase

Este repositório está configurado para usar o projeto:

- **Project ID:** `urbicchizsitntoxzvbh`
- **URL:** `https://urbicchizsitntoxzvbh.supabase.co`

Os pontos principais de configuração estão em:

- `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `supabase/config.toml` (`project_id`)

## Rodando localmente

```bash
npm install
npm run dev
```

## Migração completa (estrutura + dados) para outro projeto Supabase

Se você quiser repetir esse processo para um novo projeto no futuro, siga o guia:

- [docs/MIGRACAO_SUPABASE.md](docs/MIGRACAO_SUPABASE.md)

## Scripts úteis

```bash
npm run build
npm run test
npm run lint
```
