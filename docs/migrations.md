# Migrations versionadas

Este projeto usa Drizzle ORM com PostgreSQL. Hoje o fluxo padrão em desenvolvimento
é `db:push` (sincroniza o schema do código direto no banco). Para produção, o caminho
recomendado é gerar **migrations versionadas** e aplicar via `migrate`.

## Comandos

```bash
# 1) Gerar uma migration a partir das mudanças no shared/schema.ts
npx drizzle-kit generate

# 2) Aplicar migrations em um banco (dev/staging/prod)
npx drizzle-kit migrate

# 3) (Apenas dev) sincronizar o schema sem migration
npm run db:push
```

> Observação: o repositório já contém `migrations/0000_faithful_dakota_north.sql`
> como snapshot inicial. A partir de mudanças futuras no schema, sempre rode
> `drizzle-kit generate` para criar o arquivo `0001_*.sql` correspondente, faça
> review da migration no PR, e aplique com `drizzle-kit migrate` no deploy.

## Fluxo recomendado

1. **Desenvolvimento local**
   - Use `npm run db:push` livremente para iterar.
   - Antes de abrir PR com mudanças no schema, rode `npx drizzle-kit generate`
     e commite a migration gerada.

2. **CI**
   - O job de CI roda `npm run check` (typecheck) e `npm test`.
   - Recomenda-se adicionar um step que verifica se o schema está em sincronia
     com as migrations geradas (ex: `drizzle-kit check`).

3. **Deploy/produção**
   - O comando de boot do servidor **não** deve rodar `db:push`.
   - Pipeline de deploy executa `npx drizzle-kit migrate` antes de subir
     a nova versão da aplicação.
   - Variáveis necessárias: `DATABASE_URL`.

## Boas práticas

- **Nunca edite uma migration já aplicada em produção.** Crie sempre uma nova.
- **Mudanças destrutivas** (drop column, rename, change type) precisam de
  estratégia em duas fases: deploy 1 adiciona a nova coluna e o código passa
  a escrever em ambas; deploy 2 remove a coluna antiga.
- **IDs**: nunca mude o tipo de uma coluna PK (serial ↔ uuid). Drizzle gera
  ALTER TABLE destrutivo.
- **Rollback**: Drizzle não gera `down` automaticamente. Em produção, prefira
  forward-only migrations e mantenha snapshots de banco antes de mudanças
  arriscadas.
