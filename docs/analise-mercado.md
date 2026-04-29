# Análise Completa do Sistema de OKRs

> Documento de análise técnica e comparação com sistemas de mercado.
> Gerado em 29/04/2026.

## 1. Visão geral do sistema

Plataforma de gestão de **OKRs** (Objectives and Key Results) com foco no setor de saúde / federações. Estrutura de domínio:

- **Objetivos** → **Key Results** (metas mensuráveis) → **Ações** (tarefas) → **Checkpoints** (medições periódicas)
- Hierarquia em cascata de objetivos (parent → child) até 16 níveis
- Escopo de acesso (ABAC) por região, sub-região, solução, linha de serviço e serviço
- Recálculo automático de progresso bottom-up: checkpoints → KR → objetivo → ancestrais
- Auditoria, aprovação de cadastros, lixeira (soft delete) e importação em massa

**Stack**: React 19 + Vite + TanStack Query + shadcn/ui + Wouter no front; Express 5 + Drizzle ORM + Postgres + passport-local no back; Zod para validação compartilhada.

---

## 2. Pontos fortes

| Categoria | Avaliação |
|---|---|
| Arquitetura modular (`server/modules/*`) | Boa separação por feature (routes/service/repo) |
| Controle de acesso (RBAC + ABAC) | Implementação robusta em `server/lib/access-scope.ts` |
| Soft delete e lixeira | Recuperação de registros excluídos é uma feature madura |
| Hierarquia de OKRs (16 níveis) | Suporte explícito para OKRs em cascata |
| Observabilidade | Pino + Prometheus + request-id já configurados |
| Segurança básica | Helmet (CSP em prod), rate-limit distribuído via Postgres, scrypt para senhas |
| Localização BR | Conversão BR↔DB (vírgula decimal, separador de milhares) e timezone São Paulo |

---

## 3. Bugs e problemas identificados

### 3.1 Críticos

#### A. Race condition no recálculo de progresso *(documentado, não corrigido nesta passada)*
**Arquivos:** `server/domain/checkpoints/recalc.ts`, `server/repositories/objective.repo.ts:405-456`

Quando dois usuários atualizam checkpoints de KRs do **mesmo objetivo simultaneamente**, o recálculo segue padrão *read–modify–write* sem locks. Resultado: o último a gravar pode sobrescrever o cálculo do outro com dados parciais, deixando o `objective.progress` inconsistente.

**Correção sugerida (próximo passo):** envolver `recalcKeyResultFromCheckpoints` + `recalcObjectiveCascade` em uma única `db.transaction(async (tx) => {...})` com `SELECT ... FOR UPDATE` nas linhas dos KRs e objetivos afetados. Como o storage não recebe `tx`, requer refator de assinatura — fora do escopo desta passada de correções rápidas para evitar regressões.

#### B. Falta de validação Zod em rotas de checkpoint **✅ CORRIGIDO**
**Arquivo:** `server/modules/checkpoints/checkpoints.routes.ts`

`POST /api/checkpoints/:id/update` e `PUT /api/checkpoints/:id` aceitavam `req.body` cru — qualquer campo arbitrário poderia ser passado para o storage. Agora ambas as rotas validam payload e o `:id` via Zod (status é um enum fechado, valores numéricos aceitos como string ou number, notes limitado a 2000 chars).

### 3.2 Altos

#### C. Erros de recálculo silenciados **✅ CORRIGIDO**
**Arquivo:** `server/domain/checkpoints/recalc.ts`

O `try/catch` engolia qualquer erro com `console.error` e retornava sucesso ao usuário, mesmo quando o KR ou o objetivo ficava com progresso desatualizado. Agora os erros são logados estruturadamente (Pino) **e propagados** para o handler central, permitindo que o front receba um 500 e mostre toast de erro.

#### D. Filtros JSON aplicados em memória
**Arquivo:** `server/repositories/objective.repo.ts:72-81, 186-192`

Filtros por `serviceLineIds` / `subRegionIds` (colunas JSON) estão sendo aplicados após carregar **todos** os objetivos do usuário em memória. Em escala de centenas de objetivos por trimestre, vira gargalo.

**Correção sugerida:** migrar essas colunas de `json` para `jsonb` (se ainda não forem) e usar operadores `?|`, `@>`, `jsonb_path_ops` via `sql` template do Drizzle, com índice GIN.

#### E. `convertBRToDatabase` aceita formatos ambíguos sem reportar
**Arquivo:** `server/shared/formatters.ts:57-125`

Quando recebe lixo (`"abc,xyz"`) retorna `0` silenciosamente. Isso esconde erros de digitação que viram metas zeradas. Recomendado lançar erro para frontend tratar, ou retornar `null` e validar.

### 3.3 Médios

#### F. Guards contra NaN/Infinity nos cálculos do objetivo **✅ CORRIGIDO**
**Arquivo:** `server/repositories/objective.repo.ts:419-456`

Em `recalcProgressFromKeyResults` e `recalcProgressFromChildren` qualquer `NaN`/`Infinity` (vindo de coluna corrompida ou divisão por zero não-pega) era convertido com `.toFixed(2)` resultando em `"NaN"` gravado no Postgres. Agora todos os valores intermediários e o `avg` final passam por `Number.isFinite` antes de gravar.

#### F.1. `normalizeFrequency` retorna `'default'` silenciosamente
**Arquivo:** `server/repositories/checkpoint.repo.ts:25-37`

Frequências inválidas viram `'default'`, e em `addFrequency` não há `case 'default'` — gera comportamento inesperado na geração de checkpoints. Preferir lançar erro com lista de frequências aceitas.

#### G. Uso disseminado de `any` em repositórios e rotas
Vários repositórios (`checkpoint.repo.ts`, `objective.repo.ts`) e rotas (`req: any, res`) usam `any`. Perde-se segurança de tipos do TS justamente nas fronteiras críticas. Sugestão: tipar `req` com `AuthenticatedRequest = Request & { user: User }`.

#### H. Cascade delete não definido em FKs
**Arquivo:** `shared/schema.ts`

Nenhuma FK declara `onDelete`. Em prática isso é amenizado pelo soft delete, mas convém ser explícito (`{ onDelete: "set null" }` ou `"restrict"`) para evitar dependência implícita da camada de aplicação.

### 3.4 Baixos

| # | Achado | Arquivo |
|---|---|---|
| I | N+1 implícito no recálculo em cascata (uma query por ancestral) | `server/domain/checkpoints/recalc.ts:60-62` |
| J | Índices compostos em `activities` (entityType+entityId) ausentes | `shared/schema.ts:224+` |
| K | Loading skeleton ausente em algumas páginas (alignment-tree) | `client/src/pages/alignment-tree.tsx` |
| L | Sem retry/backoff configurado no TanStack Query | `client/src/lib/queryClient.ts` |

---

## 4. Comparação com sistemas de mercado

Avaliação contra **Workboard, Perdoo, Weekdone, Lattice (OKR module), Quantive (ex-Gtmhub) e Mooncamp**:

| Funcionalidade | Seu sistema | Mercado | Gap |
|---|---|---|---|
| Hierarquia multinível de OKRs | ✅ até 16 níveis | ✅ | — |
| Alinhamento visual (tree view) | ✅ | ✅ | — |
| Cálculo automático de progresso | ✅ bottom-up | ✅ | Workboard suporta múltiplos *types* (boolean, %, threshold, etc.) |
| Check-ins semanais com confidence | 🟡 schema `krCheckIns` existe mas sem UI completa | ✅ Lattice/Quantive padrão | **Construir UI de check-in 1-clique com sentimento (on track / at risk / off track) e nível de confiança 1-10** |
| Conversations, Feedback & Recognition (CFRs) | ❌ | ✅ Lattice | Adicionar feed por KR/Action com menções e reações |
| Integrações (Jira/Salesforce/Sheets) | ❌ | ✅ todos | Atualização manual hoje. Mínimo: importar valor de `currentValue` via webhook ou POST autenticado |
| Histórico/Snapshots de progresso | 🟡 checkpoints servem como série temporal mas sem comparação versionada | ✅ Quantive/Workboard guardam delta semanal | Adicionar tabela `kr_snapshots` (date, value, progress) populada por job |
| Relatórios executivos | 🟡 página existe | ✅ exportação PDF/PowerPoint | Exportar PDF do resumo executivo |
| Alertas e notificações | ❌ | ✅ Slack/email/in-app | Notificar dono do KR quando confiança cai ou prazo próximo sem update |
| RBAC + ABAC | ✅ excelente (geo + produto) | 🟡 | Pontuação acima da média |
| Auditoria | ✅ tabela activities | ✅ | — |
| Mobile / PWA | 🟡 responsivo, sem instalável | 🟡 | Adicionar manifest + service worker para instalação |
| Modo escuro | 🟡 next-themes instalado | ✅ | Verificar cobertura completa da paleta |
| Acessibilidade (WCAG AA) | 🟡 shadcn ajuda mas não há auditoria | 🟡 | Rodar axe-core no CI |
| Comentários em ações/KRs | ✅ `actionComments` | ✅ | — |
| Templates de OKR / sugestões IA | ❌ | ✅ Mooncamp/Quantive | Catálogo de templates por área (vendas, ops, RH) |
| Dependências entre ações | 🟡 indício no domínio | 🟡 | Visualizar grafo de dependências |
| Anonimato em feedback | ❌ | ✅ Lattice | Não obrigatório para OKR |
| API pública para integração | 🟡 rotas internas existem mas sem versionamento | ✅ | Versionar `/api/v1/...` e publicar OpenAPI |

### Avaliação resumida vs. mercado

- **Maturidade do core OKR**: 7,5/10 — modelo sólido, cálculo correto, hierarquia profunda
- **Maturidade de check-ins/CFRs**: 4/10 — esquema pronto, UX pendente
- **Integrações**: 2/10 — ainda 100% manual ou via importação admin
- **Reporting & analytics**: 5/10 — dashboards bons, mas sem exportação executiva
- **Permissões**: 9/10 — supera muitos concorrentes em granularidade geo/produto
- **DX & manutenção**: 7/10 — boa modularização, débito técnico em `any` e ausência de testes E2E

---

## 5. Roadmap de melhorias sugerido

### Sprint 1 — Estabilidade (1-2 semanas)
1. **Transação atômica no recálculo** com `SELECT FOR UPDATE` (item A acima)
2. **Validação Zod em todas rotas de mutação** restantes (`checkpoints` ✅; auditar demais)
3. **Eliminar `any` em `req`/`res`** com tipo `AuthenticatedRequest`
4. **Testes E2E críticos** com Playwright para: login, criar OKR, atualizar checkpoint, ver dashboard

### Sprint 2 — Check-ins e CFRs (2-3 semanas)
1. UI completa de **check-in semanal** por KR com:
   - Status (on track / at risk / off track)
   - Confiança 1-10
   - Comentário curto
   - Histórico em timeline
2. Notificação in-app quando KR vai para `at_risk` ou `off_track`
3. **Snapshots automáticos** (job agendado) para histórico de progresso

### Sprint 3 — Integrações e API pública (3-4 semanas)
1. Endpoints `POST /api/v1/key-results/:id/value` e `POST /api/v1/checkpoints/:id/value` autenticados por **API key** (com escopo)
2. **Webhook receiver** genérico para Zapier/n8n/Make
3. **OpenAPI 3.1** gerado automaticamente, servido em `/api/docs`
4. Conector exemplo: planilha Google → KR

### Sprint 4 — Reporting executivo (2 semanas)
1. **Exportação PDF** do resumo executivo (com gráficos)
2. **Comparação trimestre vs trimestre** (delta de progresso)
3. **Heatmap de risco** por região / serviço

### Sprint 5 — UX e adoção (contínuo)
1. **Templates de OKR** por área de negócio
2. **Modo offline / PWA** para uso em campo
3. **Auditoria de acessibilidade** com axe-core no CI
4. **Onboarding guiado** (tour) para novos usuários

---

## 6. Boas práticas técnicas recomendadas

1. **Tipagem ponta-a-ponta**: usar `tRPC` ou gerador OpenAPI para tipar fetch no frontend automaticamente; eliminar `any` nas rotas e nas respostas formatadas.
2. **Camada de query keys central**: criar `client/src/lib/queryKeys.ts` com builders (`qk.checkpoints.list({ keyResultId })`) — evita cache sujo por strings divergentes.
3. **Optimistic updates** em mutações de progresso de checkpoint (UI responde imediato, rollback em erro).
4. **Migrations versionadas** no lugar de `db:push --force` em produção (Drizzle Kit suporta `migrate`).
5. **CI gates**: `tsc --noEmit`, `eslint`, `vitest run`, `playwright` rodando em PR.
6. **Feature flags** simples (env-based ou via tabela `feature_flags`) para rollouts graduais.
7. **Limites de payload** explícitos (`express.json({ limit: '500kb' })`) e por-rota para uploads.
8. **CSRF**: como o app usa cookies de sessão, considerar `csurf` ou tokens em header para mutações.
9. **Audit trail diff**: registrar `before/after` em `activities` para edições, não apenas o evento.
10. **Guarda de timezone**: já há `process.env.TZ = 'America/Sao_Paulo'`, mas datas em `varchar(10)` (`startDate`/`endDate`) deveriam virar `date` nativo do Postgres para evitar parsing manual.

---

## 7. Resumo do que foi corrigido nesta passada

| # | Correção | Arquivos |
|---|---|---|
| ✅ | Validação Zod em `POST /api/checkpoints/:id/update` e `PUT /api/checkpoints/:id` (incluindo validação de `:id` numérico e `status` enum fechado) | `server/modules/checkpoints/checkpoints.routes.ts` |
| ✅ | Erros do recálculo de KR não são mais engolidos — agora são logados estruturadamente e propagados ao handler central | `server/domain/checkpoints/recalc.ts` |
| ✅ | Guard contra `NaN`/`Infinity` em `recalcProgressFromKeyResults` e `recalcProgressFromChildren`, com clamp final entre 0 e 999,99 | `server/repositories/objective.repo.ts` |
| ✅ | Guard contra divisão problemática no recálculo de KR (`Number.isFinite(rawProgress) ? rawProgress : 0`) | `server/domain/checkpoints/recalc.ts` |
