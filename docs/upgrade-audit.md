# Auditoria de upgrades majors

Estado das principais dependências em **abril/2026** e avaliação de breaking
changes. Todas as majors abaixo já estão instaladas; este documento valida
que o código está alinhado e lista o que ainda merece atenção.

> Última atualização: 26/abr/2026 — incluída a avaliação do React Compiler
> e marcado como resolvido o débito do `tailwind.config.ts`.

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
- `tailwind.config.ts` **removido em 26/abr/2026** (arquivo redundante; v4
  não o carregava sem `@config` em `index.css`).
- `components.json` ajustado para `"tailwind": { "config": "" }` — o CLI do
  shadcn 4 lê só o CSS-first config.

**Status:** resolvido.

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

## React Compiler — avaliação (26/abr/2026)

**Tentativa de habilitar:** instalados `babel-plugin-react-compiler` e
`@rolldown/plugin-babel` em conjunto com `@vitejs/plugin-react@6` + Vite 8.

**Resultado:**
- ✅ Build de produção completou (3,3 s)
- ✅ 37/37 testes verdes
- ⚠️ Bundle cresceu de 2,3 MB → 2,4 MB (+~4%) — dentro do orçamento de 5%
- ❌ Configuração via `react({ babel: { plugins: [...] } })` **não tipa** —
  `@vitejs/plugin-react@6` removeu `babel` do `Options` (rolldown trocou o
  pipeline). O plugin agora exporta `reactCompilerPreset` que precisa ser
  consumido por `rolldownBabel`.
- ❌ `@rolldown/plugin-babel@0.2.3` exporta default (não named) e o
  `PluginOptions` não aceita `extensions`/`include`/`exclude` diretos — exige
  `filter` configurado, com sintaxe ainda em ajuste no upstream.

**Decisão:** **mantido desligado**. Custo de configuração alto para um ganho
de bundle marginal e sem profiling de produção que justifique. Reavaliar
quando:
1. `@vitejs/plugin-react` v7 documentar um wrapper estável `react({ compiler: true })`, OU
2. tivermos profiling real mostrando hotspots de re-render que `useMemo`/`useCallback` não cobrem.

**Estado do código:** `vite.config.ts` reverteu para o `react()` simples. As
duas dependências experimentais foram removidas via `npm uninstall`.

## Resumo executivo

Todas as majors estão **funcionalmente compatíveis** com o código atual. As
dívidas anteriormente listadas foram resolvidas em 26/abr/2026:

1. ✅ **`tailwind.config.ts` redundante** — removido; `components.json`
   ajustado para CSS-first config.
2. 🟡 **`forwardRef` em shadcn/ui** — modernização opcional para alinhar ao
   novo modelo de refs do React 19. Sem urgência. Recomendado fazer junto
   com upgrade de shadcn ou na chegada do React 20.
3. 🟡 **Bug de checkpoints automáticos no KR create** — descoberto no smoke
   test de regressão. `POST /api/key-results` não dispara a geração
   automática de checkpoints documentada em `replit.md`. Workaround atual:
   chamar `/api/key-results/:id/recreate-checkpoints` em seguida.

Nenhum upgrade emergencial recomendado. Próximos majors a monitorar:
- **Express 6** (em desenvolvimento) — vai trazer router refatorado.
- **React 20** — provável remoção de `forwardRef`.
- **Tailwind 5** — sem roadmap público ainda.

Para um Sprint 6 dedicado a destravar 11 majors disponíveis (UI + tooling),
ver `docs/upgrade-roadmap.md` → seção "Sprint 6 (proposto)".
