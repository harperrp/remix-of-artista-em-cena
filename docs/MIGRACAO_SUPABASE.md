# Migração de projeto + banco para novo Supabase

Este guia cobre migração **completa**: schema, policies, functions, storage e dados.

> Destino atual deste repositório: `https://urbicchizsitntoxzvbh.supabase.co`.

## 1) Pré-requisitos

- Supabase CLI instalado.
- Acesso ao projeto antigo e ao novo projeto.
- Chaves e senha do banco de ambos os projetos.

## 2) Vincular o repositório ao projeto novo

No arquivo `supabase/config.toml`, confirme:

```toml
project_id = "urbicchizsitntoxzvbh"
```

Depois, rode:

```bash
supabase login
supabase link --project-ref urbicchizsitntoxzvbh
```

## 3) Aplicar estrutura do banco no projeto novo

Para subir todas as migrations locais para o banco novo:

```bash
supabase db push
```

Isso aplica tabelas, views, índices, triggers, funções e políticas descritas em `supabase/migrations`.

## 4) Migrar dados do projeto antigo para o novo

### Opção recomendada: dump/restore Postgres

1. Gere dump do banco antigo:

```bash
pg_dump "$OLD_DB_URL" --format=custom --no-owner --no-privileges --file old.dump
```

2. Restaure no banco novo:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$NEW_DB_URL" old.dump
```

3. Reaplique migrations locais se necessário para garantir estado final esperado:

```bash
supabase db push
```

## 5) Migrar Storage

Se você usa buckets/arquivos, copie objetos do projeto antigo para o novo (via script com SDK ou ferramenta de sync S3 compatível).

Checklist:

- [ ] Buckets criados no novo projeto
- [ ] Políticas de storage aplicadas
- [ ] Arquivos copiados

## 6) Atualizar variáveis do front-end

No `.env`, mantenha os valores do projeto novo:

```env
VITE_SUPABASE_PROJECT_ID="urbicchizsitntoxzvbh"
VITE_SUPABASE_URL="https://urbicchizsitntoxzvbh.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon_key_do_projeto_novo>"
```

## 7) Validar pós-migração

- Testar login/cadastro
- Testar CRUD das principais telas
- Testar Edge Functions
- Testar leitura/escrita de Storage
- Conferir RLS por perfil

## 8) Comandos úteis de verificação

```bash
npm run test
npm run build
```

Se ambos passarem e o banco novo responder corretamente, a migração está concluída.
