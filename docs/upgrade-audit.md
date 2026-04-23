# Auditoria de upgrades majors

Estado das principais dependências em **abril/2026** e avaliação de breaking
changes. Todas as majors abaixo já estão instaladas; este documento valida
que o código está alinhado e lista o que ainda merece atenção.

| Pacote | Versão atual | Status |
|---|---|---|
| react / react-dom | ^19.2.5 | ✅ OK (com observação) |
| express | ^5.2.1 | ✅ OK |
| tailwindcss | ^4.2.4 | ✅ OK (config legado redundante) |
| vite | ^8.0.9 | ✅ OK |
| zod | ^4.3.6 | ✅ OK |
| recharts | ^3.8.1 | ✅ OK (corrigido em chart.tsx) |
| drizzle-orm | ^0.45.2 | ✅ OK |
| @tanstack/react-query | ^5.99.2 | ✅ OK |
| wouter | ^3.9.0 | ✅ OK |
| helmet | ^8.1.0 | ✅ OK |

---

## React 19

**Breaking changes auditados:**
- `defaultProps` em function components: ❌ não usado
- `propTypes`: ❌ não usado
- `ReactDOM.render` / `findDOMNode`: ❌ não usado
- `<Context.Provider>` ainda aceito (só warning)
- `forwardRef`: ainda usado em todos os componentes shadcn (`components/ui/`).
  Em React 19 o `ref` virou prop normal de function components, mas `forwardRef`
  segue funcionando — só será removido em uma major futura.

**Recomendação (médio prazo):**
- Migrar gradualmente os componentes de `components/ui/` para usarem `ref` como
  prop direta. Não é urgente; recomendado fazer junto com upgrades do shadcn.

## Express 5

**Breaking changes auditados:**
- `res.send(<status>)`: ❌ não usado
- `req.param()`: ❌ não usado
- `app.del()`: ❌ não usado
- Rotas com regex sem `:param` nomeado: ❌ não usado
- Promises em rotas não capturadas: ✅ tratadas via `asyncHandler` em todos os módulos

**Status:** sem ajustes necessários.

## Tailwind 4

**Estado atual:**
- `client/src/index.css` já usa a sintaxe v4: `@import 'tailwindcss';`,
  `@plugin`, `@theme`, `@custom-variant dark`.
- `postcss.config.js` usa `@tailwindcss/postcss` (correto para v4).

**Pendência (limpeza, não urgente):**
- `tailwind.config.ts` continua no repositório mas **não é mais carregado**
  por Tailwind 4 (não há `@config` directive em `index.css`). As declarações
  `darkMode`, `content`, `theme.extend.colors`, `theme.extend.borderRadius`
  estão duplicadas no `@theme` do CSS.
- `components.json` (shadcn CLI) ainda referencia `tailwind.config.ts`. Se for
  rodar `npx shadcn add`, o CLI lê esse arquivo. Se a equipe não usa mais o CLI
  do shadcn, o config pode ser removido.

**Recomendação:**
- Manter `tailwind.config.ts` enquanto a equipe ainda rodar `npx shadcn add`.
- Caso contrário, remover e atualizar `components.json` para refletir só a
  configuração CSS-first.

## Vite 8

**Breaking changes auditados:**
- Node 20+ requerido: ✅ projeto usa Node 20
- `__dirname` em ESM: ✅ resolvido manualmente em `server/vite.ts`
  (`fileURLToPath(import.meta.url)`)
- `server.allowedHosts: true` necessário no Replit: ✅ configurado
- `defineConfig` import: ✅ usado

**Status:** sem ajustes necessários.

## Zod 4

**Breaking changes auditados:**
- `z.string().email()`, `.url()`, `.uuid()` viraram `z.email()`, `z.url()`,
  `z.uuid()`: ❌ nenhum uso dos antigos no código (só em `node_modules`)
- `z.record(K, V)` agora exige 2 argumentos: ❌ nenhum uso de `z.record(...)`
- `.errors` virou `.issues` em `ZodError`: ✅ código já usa `err.issues`
  (ver `server/modules/*/routes.ts`)

**Status:** sem ajustes necessários.

## Recharts 3

**Breaking changes resolvidos:**
- `TooltipProps` e `LegendProps` ganharam genéricos mais estritos.
  Os wrappers em `client/src/components/ui/chart.tsx` foram retipados em
  Sprint 3 para tipos próprios — typecheck passa.

**Status:** corrigido.

## Drizzle ORM 0.45

**Breaking changes auditados:**
- `relations()` API: ❌ não usado (projeto usa joins explícitos via `.leftJoin`)
- `db.execute()` retorna shape diferente: não relevante (queries usam
  builders tipados)

**Status:** sem ajustes necessários.

## @tanstack/react-query v5

**Breaking changes auditados:**
- Apenas a forma objeto: `useQuery({ queryKey, queryFn })`: ✅ código alinhado
- `cacheTime` virou `gcTime`: ❌ nenhum uso
- `onSuccess`/`onError` removidos de queries (só em mutations): ✅ código alinhado

**Status:** sem ajustes necessários.

## Wouter 3

**Breaking changes auditados:**
- `useLocation` retorna `[location, setLocation]`: ✅ código alinhado em todas
  as páginas (`pages/auth-page.tsx`, `pages/key-results.tsx`, etc.)

**Status:** sem ajustes necessários.

## Helmet 8

**Breaking changes auditados:**
- `frameguard` removido (substituído por `X-Frame-Options` default): ❌ não usado
- `contentSecurityPolicy.useDefaults: true` necessário: ✅ usado em
  `server/index.ts`

**Status:** sem ajustes necessários.

---

## Resumo executivo

Todas as majors estão **funcionalmente compatíveis** com o código atual. A
única dívida real identificada é:

1. **`tailwind.config.ts` redundante** — pode ser removido se a equipe não usa
   mais o CLI `npx shadcn add`. Decisão de produto.
2. **`forwardRef` em shadcn/ui** — modernização opcional para alinhar ao novo
   modelo de refs do React 19. Sem urgência.

Nenhum upgrade emergencial recomendado. Próximos majors a monitorar:
- **Express 6** (em desenvolvimento) — vai trazer router refatorado.
- **React 20** — provável remoção de `forwardRef`.
- **Tailwind 5** — sem roadmap público ainda.
