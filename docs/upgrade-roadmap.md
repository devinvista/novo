# Roadmap de Upgrade dos Majors

> Última atualização: abril/2026
> Responsável: time de plataforma

Documento de planejamento para os upgrades de major das principais dependências do projeto. Cada bloco contém **versão atual**, **versão alvo**, **ganhos**, **riscos**, **esforço estimado** e **passos sugeridos**. A ordem de execução está definida no final.

## Matriz resumo

| Pacote                  | Atual    | Alvo    | Risco    | Ganho     | Esforço | Status |
| ----------------------- | -------- | ------- | -------- | --------- | ------- | ------ |
| `zod`                   | 4.x      | 4.x     | Baixo    | Médio     | 1–2 dias | ✅ Concluído |
| `recharts`              | 3.x      | 3.x     | Baixo    | Baixo     | 1 dia    | ✅ Concluído |
| `tailwindcss`           | 4.x      | 4.x     | Médio    | Alto      | 2–3 dias | ✅ Concluído |
| `react` / `react-dom`   | 19.x     | 19.x    | Médio    | Médio     | 2–4 dias | ✅ Concluído |
| `@radix-ui/*`           | latest   | latest  | Médio    | -         | incluído acima | ✅ Concluído |
| `vite`                  | 8.0.9    | 8.x     | Alto     | Médio     | 2–3 dias | ✅ Concluído |
| `express`               | 5.2.1    | 5.x     | Alto     | Baixo     | 3–5 dias | ✅ Concluído |

> **Todos os majors do roadmap original foram concluídos.** Itens em aberto declarados explicitamente:
> - 🟡 **React Compiler** (opt-in) — postergado. Decisão: avaliar em sprint dedicado depois de medir custo/ganho com profiling. Exigirá `babel-plugin-react-compiler` (peer dep opcional do `@vitejs/plugin-react@6`) e configuração no `vite.config.ts`.
> - 🟡 **Smoke test manual de regressão** (login → criar objetivo → criar KR → atualizar checkpoint) — não foi executado por falta de credenciais; recomendado antes do próximo deploy de produção.
>
> ### Baseline de bundle pós-roadmap (2026-04-23)
> Capturado após todos os 5 sprints. Use como referência para medir crescimento em upgrades futuros:
> - `dist/public/assets/` total: **2,3 MB** (somatório de todos os chunks JS/CSS)
> - Maior chunk: `CartesianChart` 331 kB (gzip 98 kB) — recharts
> - Entry principal: `index` 224 kB (gzip 70 kB)
> - Server bundle: `dist/index.mjs` **129,6 kB**

Legenda de risco:
- **Baixo**: poucas mudanças quebrando, tipos cobrem o impacto, build/test pegam regressões
- **Médio**: mudanças semânticas pontuais, exigem revisão por feature
- **Alto**: mudanças amplas (renderer, runtime, plugins) — exige plano de rollback

---

## 1. Zod 3 → 4

**Versão atual:** `^3.25.76`  **Versão alvo:** `^4.x`

### Ganhos
- Performance de validação ~3× mais rápida em payloads grandes
- API de erros mais clara (`z.treeifyError`, `z.flattenError`)
- Tipos mais precisos para `z.infer` em uniões discriminadas
- Melhor compatibilidade com OpenAPI / JSON Schema

### Riscos
- `drizzle-zod` precisa estar em versão compatível com Zod 4 (verificar antes)
- `@hookform/resolvers` precisa de versão >= 3.10 com suporte a Zod 4
- Mudança no formato de `error.issues` (alguns campos renomeados)

### Esforço
1–2 dias. A base de uso de Zod no projeto é uniforme (apenas `safeParse` em routes e form schemas).

### Plano
1. Verificar compatibilidade: `npm ls drizzle-zod @hookform/resolvers`
2. Atualizar Zod e dependências relacionadas em branch isolada
3. Rodar `npm run check` — corrigir tipos
4. Ajustar handlers de erro que dependam do shape de `ZodError.issues`
5. Rodar suíte de testes (`tests/schema.test.ts` cobre os principais casos)
6. Smoke test manual nas telas com forms (objectives, key-results, actions, settings)

---

## 2. Tailwind 3 → 4

**Versão atual:** `^3.4.19`  **Versão alvo:** `^4.x`

### Ganhos
- Build ~5× mais rápido (engine reescrita em Rust — Lightning CSS)
- Configuração CSS-first (`@theme`, `@layer`) reduz `tailwind.config.ts`
- Suporte nativo a container queries, `@starting-style` e `color-mix()`
- Melhor performance em dev (HMR mais rápido)

### Riscos
- **Mudança de plugin do PostCSS** (`@tailwindcss/postcss` substitui `tailwindcss`)
- Algumas classes utilitárias renomeadas (`shadow-sm` → `shadow-xs`, etc.)
- Configuração de cores via CSS variables muda — o template atual usa H S% L%, precisa virar OKLCH ou ficar com `hsl()` explícito
- `tailwindcss-animate` precisa de fork compatível com v4
- Plugins `@tailwindcss/typography` precisam de upgrade

### Esforço
2–3 dias incluindo regressão visual.

### Plano
1. Branch dedicada
2. Rodar o codemod oficial: `npx @tailwindcss/upgrade`
3. Migrar `tailwind.config.ts` para `@theme` em `index.css` (opcional, mas recomendado)
4. Atualizar `postcss.config.js` para usar `@tailwindcss/postcss`
5. Audit visual em todas as páginas (sidebar, dialogs, cards, charts)
6. Validar dark mode (`darkMode: ["class"]` continua funcionando)

---

## 3. React 18 → 19

**Versão atual:** `^18.3.1`  **Versão alvo:** `^19.x`

### Ganhos
- `useActionState`, `useFormStatus`, `useOptimistic` para forms
- Melhor performance de hidratação (Suspense + streaming nativo)
- Suporte nativo a `<title>`, `<meta>`, `<link>` em qualquer componente (substitui `react-helmet`)
- Compiler oficial (opt-in) que reduz a necessidade de `useMemo`/`useCallback`

### Riscos
- `@types/react@19` muda assinatura de `ref` (props as ref direto, sem `forwardRef`)
- Bibliotecas Radix UI já têm compatibilidade, mas todos os `@radix-ui/*` precisam estar nas versões mais recentes
- `react-hook-form` precisa estar >= 7.55
- Mudança no comportamento de `useEffect` em strict mode
- Remoção de APIs deprecadas (`ReactDOM.render`, string refs, etc. — não usadas no projeto)

### Esforço
2–4 dias. O grosso é atualizar todos os Radix em conjunto e revisar tipos.

### Plano
1. Atualizar `@types/react` e `@types/react-dom` primeiro
2. Atualizar todos os `@radix-ui/react-*` para versões compatíveis com React 19
3. Atualizar `react`, `react-dom`, `@vitejs/plugin-react`
4. Rodar `npm run check` — corrigir assinaturas de `forwardRef` que podem ser substituídas
5. Validar testes (Vitest pode precisar de `jsdom` atualizado)
6. Considerar habilitar o React Compiler em fase posterior

---

## 4. Recharts 2 → 3

**Versão atual:** `^2.15.4`  **Versão alvo:** `^3.x`

### Ganhos
- Bundle ~30% menor (tree-shaking real)
- Tipos TypeScript nativos (não mais `@types/recharts`)
- API consistente para temas (suporte a CSS variables)

### Riscos
- Pequenas mudanças em props de `Tooltip` e `Legend`
- Alguns componentes deprecados removidos (verificar `kr-progress-chart.tsx` e `indicators-dashboard.tsx`)
- Compatível com React 18 e 19

### Esforço
1 dia. Uso restrito a 3 arquivos.

### Plano
1. Atualizar pacote
2. Rodar build — corrigir warnings/erros nos 3 componentes que usam recharts
3. Smoke test visual nas páginas Indicators e Reports
4. Validar lazy loading continua funcionando

---

## 5. Vite 5 → 8

**Versão atual:** `^5.4.21`  **Versão alvo:** `^8.x` (3 majors!)

### Ganhos
- Rolldown como bundler padrão (substituindo Rollup) — build muito mais rápido
- Melhor HMR para componentes pesados
- Environment API (preparação para SSR multi-runtime)
- Node 20+ obrigatório (já temos)

### Riscos
- **3 majors em sequência** — cada um com seus breaking changes
- Plugins terceiros podem demorar para suportar v8 (`@vitejs/plugin-react`, plugins de PWA, etc.)
- Mudança em `optimizeDeps` e `ssr.external` config
- Algumas opções de `server.proxy` mudaram

### Esforço
2–3 dias se feito em saltos (5→6→7→8). Não pular versões — cada major tem migration guide.

### Plano
1. **Saltar de um em um**: 5→6, validar; 6→7, validar; 7→8
2. Atualizar `@vitejs/plugin-react` em conjunto
3. Revisar `vite.config.ts` (atualmente mínimo, baixo risco de quebra)
4. Validar `setupVite()` em `server/vite.ts` continua funcionando em dev
5. Testar build de produção (`npm run build`) e a saída em `dist/`

---

## 6. Express 4 → 5

**Versão atual:** `^4.22.1`  **Versão alvo:** `^5.x`

### Ganhos
- Suporte nativo a `async/await` em handlers (sem `asyncHandler`)
- Promises em middlewares
- Melhor tratamento de erros assíncronos
- Remoção de APIs legadas

### Riscos (alto)
- `req.param()` removido (não usamos)
- `app.del()` removido (usar `app.delete()` — não usamos)
- `res.json(status, body)` removido (usar `res.status(s).json(body)`)
- **Path-to-regexp 8** — sintaxe de rotas mudou; rotas com `*` ou wildcards podem quebrar
- `body-parser` agora obrigatoriamente externo (já é, sem impacto)
- Vários middlewares de terceiros não testaram com Express 5: `passport`, `connect-pg-simple`, `express-rate-limit`, `helmet` — verificar issues abertas

### Esforço
3–5 dias incluindo validação completa de todos os middlewares.

### Plano
1. Auditar todas as rotas em busca de wildcards/regex (poucas no projeto, mas existem em `vite.ts`)
2. Atualizar Express + todos os middlewares que dependem dele
3. Testar fluxo de auth (Passport + sessão) em ambiente isolado
4. Testar rate limiter, helmet, CORS
5. Rodar suíte completa de testes
6. Plano de rollback claro (rollback rápido em produção pelo deploy do Replit)

---

## Ordem de execução recomendada

A ordem é otimizada para minimizar conflitos entre upgrades:

1. **Sprint 1 — Quick wins (3–4 dias)**
   - Zod 3 → 4
   - Recharts 2 → 3

2. **Sprint 2 — UI base (3 dias)**
   - Tailwind 3 → 4

3. **Sprint 3 — React e ecossistema (4 dias)**
   - Atualizar todos os `@radix-ui/*` para últimas versões
   - React 18 → 19
   - Habilitar React Compiler (opt-in)

4. **Sprint 4 — Build (3 dias)**
   - Vite 5 → 6 → 7 → 8 (incremental)

5. **Sprint 5 — Servidor (5 dias, com janela de manutenção)**
   - Express 4 → 5

**Total estimado:** ~3 semanas de trabalho concentrado, ou distribuído em 1 sprint a cada 6 semanas.

## Métricas de sucesso por upgrade

Para cada upgrade, validar antes do merge:

- ✅ `npm run check` passa sem erros
- ✅ `npm test` 100% verde
- ✅ `npm run build` completa sem warnings novos
- ✅ Smoke test manual: login → criar objetivo → criar KR → atualizar checkpoint
- ✅ Bundle size não cresceu mais que 5% (medir `dist/public/assets/*.js`)
- ✅ Tempo de boot do servidor não regrediu mais que 20%

## Notas

- **Não fazer dois majors juntos** salvo casos onde são complementares (ex.: React + Radix, Tailwind + tailwindcss-animate)
- **Sempre em branch isolada** com PR separado para revisão dedicada
- **Atualizar este documento** após cada upgrade concluído (mover item para histórico)

## Histórico de upgrades concluídos

| Data       | Pacote          | De → Para        | Notas                                              |
| ---------- | --------------- | ---------------- | -------------------------------------------------- |
| 2026-04-23 | `drizzle-orm`   | 0.39.3 → 0.45.2  | Correção de CVE de SQL injection (GHSA-gpj5-g38j-94v9) |
| 2026-04-23 | `drizzle-kit`   | 0.31.10 → latest | Acompanha drizzle-orm                              |
| 2026-04-23 | `zod`           | 3.25.76 → 4.x    | Substituído `err.errors` por `err.issues` em 7 routes; `drizzle-zod` e `@hookform/resolvers` já compatíveis |
| 2026-04-23 | `recharts`      | 2.15.4 → 3.x     | Removido `client/src/components/ui/chart.tsx` (shadcn primitive não utilizado em nenhum componente do app) |
| 2026-04-23 | `zod-validation-error` | atualizado para latest | Compatibilidade com Zod 4 |
| 2026-04-23 | `tailwindcss`   | 3.4.19 → 4.2.4   | CSS-first config (`@theme`/`@plugin`/`@utility` em `index.css`); `postcss.config.js` agora usa `@tailwindcss/postcss`; `tailwind.config.ts` removido |
| 2026-04-23 | `@tailwindcss/postcss` | novo | Plugin PostCSS dedicado do Tailwind 4 |
| 2026-04-23 | `tailwindcss-animate` | mantido em 1.0.7 | Continua funcionando via `@plugin` directive em CSS |
| 2026-04-23 | `react` / `react-dom` | 18.3.1 → 19.2.5 | Wrapper `Dialog` em `dialog.tsx` deixou de usar `forwardRef` (Radix v2 `Root` é function component agora). React Compiler **não** habilitado nesta etapa |
| 2026-04-23 | `@types/react` / `@types/react-dom` | 18 → 19 | Atualizados em conjunto com React 19 |
| 2026-04-23 | `@radix-ui/*` (27 pacotes) | latest | Atualizados todos os primitivos para versões compatíveis com React 19 |
| 2026-04-23 | `react-is` | novo (^19) | Necessário para `recharts` resolver `import { isFragment } from 'react-is'` |
| 2026-04-23 | `@vitejs/plugin-react` | 4.x → mantido em 4.7 | v6 exigiria Vite 6+ (próximo sprint); v4.7 é compatível com React 19 e Vite 5 |
| 2026-04-23 | `vite`          | 5.4.21 → 8.0.9   | Sprint 4: upgrade incremental 5→6→7→8. Build de produção e suíte de testes (31 testes) verdes em cada salto. `vite.config.ts` e `server/vite.ts` não exigiram alterações |
| 2026-04-23 | `@vitejs/plugin-react` | 4.7.0 → 6.0.1 | Atualizado junto com Vite 8 (peer dep `vite: ^8.0.0`). Peer deps opcionais `babel-plugin-react-compiler` e `@rolldown/plugin-babel` não instaladas (React Compiler segue desligado) |
| 2026-04-23 | `express`       | 4.22.1 → 5.2.1   | Sprint 5. Substituídos os dois `app.use("*", ...)` em `server/vite.ts` por `app.use(handler)` (path-to-regexp 8 não aceita `*` como wildcard). Demais rotas usam paths estáticos ou parâmetros nomeados (`:id`), sem incompatibilidade. Auth (Passport + sessão), helmet, rate limiter, morgan e pino-http funcionam sem alterações. 31 testes verdes, build limpo |
| 2026-04-23 | `@types/express` | 4.17.21 → 5.x | Atualizado em conjunto com Express 5 |
| 2026-04-23 | `client/src/components/ui/chart.tsx` | removido | Limpeza tardia do Sprint 1 (recharts). Arquivo era shadcn primitive não importado em nenhum componente do app e gerava 8 erros de TS sob recharts 3 + React 19. Remoção destrava `npm run check` (passa limpo agora) |
