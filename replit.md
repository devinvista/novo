# Sistema de Gestão Estratégica - OKRs FIERGS/SESI/SENAI

## Visão Geral
Plataforma de gerenciamento de OKR (Objectives and Key Results) para rastreamento de objetivos organizacionais, resultados-chave, ações e checkpoints de progresso. Suporta estrutura multi-regional com controle de acesso hierárquico (admin / gestor / operacional).

## Preferências do Usuário
- Estilo de comunicação: Linguagem simples e cotidiana
- Idioma: Português brasileiro (toda interface, documentação e textos)

## Arquitetura do Sistema

### Stack Tecnológico
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS 4, Shadcn/ui (Radix UI)
- **Backend**: Node.js + Express.js 5 (TypeScript, ES modules)
- **Banco de Dados**: PostgreSQL (conexão via `DATABASE_URL` usando o pacote `postgres`)
- **ORM**: Drizzle ORM com drizzle-zod para validação
- **Autenticação**: Passport.js (estratégia local) + express-session + connect-pg-simple (sessões PostgreSQL)
- **Estado**: TanStack Query v5 para estado do servidor
- **Roteamento**: Wouter (frontend)
- **Formulários**: React Hook Form + Zod 4

### Estrutura de Arquivos

```
/client/src/
  components/
    layout/
      sidebar.tsx              # Barra lateral de navegação (App.tsx)
      compact-header.tsx       # Cabeçalho global com filtros (importado por todas as páginas)
      quarterly-filter.tsx     # Filtro de período trimestral (usado pelo compact-header)
    ui/                        # Componentes Shadcn/ui
      date-input-br.tsx        # Input de data no padrão BR (DD/MM/AAAA)
      number-input-br.tsx      # Input numérico no padrão BR (vírgula decimal)
      [demais componentes ui shadcn]
  features/
    actions/
      action-form.tsx          # Formulário de criação/edição de ações
      action-plan.tsx          # Plano de ação (aba Relatórios)
      action-timeline.tsx      # Timeline visual de ações
      gantt-timeline.tsx       # Timeline Gantt de ações
    checkpoints/
      checkpoint-progress-grid.tsx    # Grade de progresso de checkpoints (círculos animados)
      checkpoint-timeline-header.tsx  # Cabeçalho com timeline de checkpoints
      checkpoint-update-dialog.tsx    # Diálogo de atualização de checkpoint
      next-checkpoints-overview.tsx   # Visão geral dos próximos checkpoints
    indicators/
      animated-progress-ring.tsx  # Anel de progresso animado (usado no checkpoint-progress-grid)
      indicators-dashboard.tsx    # Painel de indicadores estratégicos (lazy-loaded)
    key-results/
      key-result-form-simple.tsx  # Formulário de KR
      kr-progress-chart.tsx       # Gráfico de progresso de KR (recharts)
      kr-progress-chart-lazy.tsx  # Wrapper lazy com Suspense (isola recharts em chunk próprio)
    objectives/
      objective-form.tsx          # Formulário de objetivo
      objectives-table.tsx        # Tabela de objetivos
    reports/
      executive-summary.tsx       # Resumo executivo
  pages/
    alignment-tree.tsx  # / — Árvore de alinhamento (dashboard principal)
    objectives.tsx      # /objectives — Objetivos
    key-results.tsx     # /key-results — Resultados-Chave
    actions.tsx         # /actions — Ações
    checkpoints.tsx     # /checkpoints — Checkpoints
    indicators.tsx      # /indicators — Indicadores (rota disponível, fora do menu)
    reports.tsx         # /reports — Relatórios (indicadores + resumo + plano de ação)
    users.tsx           # /users — Usuários (admin/gestor)
    settings.tsx        # /settings — Configurações (admin)
    trash.tsx           # /trash — Lixeira
    audit.tsx           # /audit — Auditoria
    dashboard.tsx       # /dashboard — Meu Painel
    auth-page.tsx       # Página de login/registro
    not-found.tsx       # 404
  hooks/
    use-auth.tsx               # Autenticação
    use-filters.tsx            # Filtros globais (região, sub-região, linha de serviço)
    use-quarterly-filter.tsx   # Filtro de período trimestral global
    use-sidebar-toggle.tsx     # Estado de abertura/fechamento do sidebar
    use-mobile.tsx             # Detecção de dispositivo móvel
    use-toast.ts               # Toast notifications
  lib/
    queryClient.ts             # TanStack Query client + apiRequest helper
    formatters.ts              # Formatação de números (padrão BR) + datas DD/MM/AAAA
    timezone.ts                # Helpers de fuso horário (America/Sao_Paulo) via date-fns-tz
    checkpoint-utils.ts        # Utilitários de progresso/badge de checkpoints
    frequency-translations.ts  # Tradução de frequências (en → pt-BR)
    modal-cleanup.ts           # Limpeza de overlays Radix UI travados
    emergency-cleanup.ts       # Limpeza de emergência (Ctrl+Shift+C)
  providers/
    app-providers.tsx          # Provedores de contexto (AuthProvider, FiltersProvider, QueryClientProvider)

/server/
  index.ts              # Entry point (porta 5000/PORT, timezone America/Sao_Paulo, helmet, rate-limit, healthcheck)
  routes.ts             # Montagem dos routers modulares (~55 linhas)
  auth.ts               # Autenticação (Passport.js + scrypt, cookies env-aware)
  pg-db.ts              # Conexão PostgreSQL via `postgres` (DATABASE_URL, pool production-grade)
  cache.ts              # LRU cache para lookups (5 min TTL, auto-invalidado em mutações /api/admin/*)
  config/env.ts         # Validação Zod de variáveis de ambiente no boot
  errors/app-error.ts   # Classes de erro tipadas (AppError, NotFoundError, ForbiddenError, ValidationError)
  infra/
    logger.ts           # Logger pino (único logger) + httpLogger pino-http + correlação por requestId
    metrics.ts          # Métricas Prometheus (GET /metrics): contadores, histograma de latência, métricas Node
  middleware/
    async-handler.ts    # Wrapper async para rotas Express (propaga erros corretamente)
    auth.ts             # requireAuth / requireRole / sanitizeUser
    error-handler.ts    # Handler centralizado (AppError, ZodError, fallback)
    request-id.ts       # Correlação de request (UUID por request, injetado no logger)
    validate.ts         # Middleware de validação Zod para body/params/query
  modules/              # Routers por domínio (ver tabela de rotas abaixo)
    objectives/         # /api/objectives
    key-results/        # /api/key-results
    actions/            # /api/actions
    checkpoints/        # /api/checkpoints
    action-comments/    # /api/actions/:id/comments
    action-dependencies/# /api/action-dependencies
    kr-check-ins/       # /api/kr-check-ins
    lookups/            # /api/regions, /api/solutions, etc. (com cache)
    admin-lookups/      # /api/admin/* — CRUD administrativo de lookups
    admin-import/       # /api/admin/export-template, /api/admin/import-data (Excel)
    dashboard/          # /api/dashboard/kpis
    quarters/           # /api/quarters
    executive-summary/  # /api/executive-summary
    users/              # /api/users, /api/managers, /api/pending-users
    trash/              # /api/trash
    activities/         # /api/activities (audit trail)
  domain/
    checkpoints/recalc.ts  # Recálculo de KR/Objetivo a partir de checkpoints
  repositories/            # Repositórios Drizzle por agregado
    user.repo.ts           # UserRepo
    lookup.repo.ts         # LookupRepo (regions, solutions, services, indicators)
    objective.repo.ts      # ObjectiveRepo
    key-result.repo.ts     # KeyResultRepo
    action.repo.ts         # ActionRepo
    checkpoint.repo.ts     # CheckpointRepo
    kr-check-in.repo.ts    # KrCheckInRepo
    dashboard.repo.ts      # DashboardRepo
    activity.repo.ts       # ActivityRepo
    session-store.ts       # connect-pg-simple session store
    index.ts               # Barrel de repositórios
  storage/
    interface.ts           # Interface IStorage (facade composta pelos repos)
    pg.ts                  # PgStorage — implementação Drizzle (compõe repos)
    index.ts               # Barrel: export { PgStorage, storage } + IStorage
  shared/
    formatters.ts          # Formatação números BR server-side (convertBRToDatabase, formatBrazilianNumber)
    quarterly-periods.ts   # Cálculo de períodos trimestrais
  lib/
    audit-log.ts           # recordActivity() — grava na tabela activities
    region-guard.ts        # canAccessRegion / canAccessAnySubRegion / isAdmin
  scripts/seed/
    seed.ts                # Seed principal (usuários, regiões, soluções)
    seed-okrs.ts           # Seed de OKRs de exemplo
  vite.ts                  # Setup Vite dev / static files prod

/shared/
  schema.ts   # Schema Drizzle (PostgreSQL) + tipos TypeScript + schemas Zod + índices

/tests/       # Testes Vitest + Supertest
  auth.test.ts
  cache.test.ts
  health.test.ts
  metrics.test.ts
  repositories.test.ts
  routes.test.ts
  schema.test.ts

/migrations/  # Migrations históricas (referência; usar db:push em dev)
/docs/        # Documentação interna (upgrade-roadmap.md, migrations.md, upgrade-audit.md)
/.github/workflows/ci.yml  # Pipeline CI (lint, format, typecheck, test, build)
```

### Banco de Dados - Tabelas Principais
| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários com roles (admin/gestor/operacional) e arrays JSON de permissões |
| `objectives` | Objetivos estratégicos com dono, região, sub-regiões e período |
| `key_results` | Resultados-chave vinculados a objetivos com metas e progresso |
| `actions` | Ações vinculadas a key results com responsável, prazo e status |
| `checkpoints` | Marcos de progresso gerados automaticamente por frequência do KR |
| `action_comments` | Comentários em ações (incluindo comentários automáticos do sistema) |
| `regions` | Regiões organizacionais |
| `sub_regions` | Sub-regiões vinculadas a regiões |
| `solutions` | Soluções FIERGS (SESI, SENAI, IEL, etc.) |
| `service_lines` | Linhas de serviço por solução |
| `services` | Serviços por linha de serviço |
| `strategic_indicators` | Indicadores estratégicos globais |
| `quarterly_periods` | Períodos trimestrais de controle |
| `activities` | Log de atividades (audit trail) |
| `session` | Sessões PostgreSQL (auto-criada pelo connect-pg-simple) |

### Segurança e Produção
- **Senhas nunca expostas**: `sanitizeUser()` remove `password` de todas as respostas de usuário
- **`/api/managers` protegido por auth**: formulário de registro usa `/api/managers/public` (só `id` e `name`)
- **Scrypt com salt**: senhas armazenadas como `hash.salt` (64 bytes)
- **Helmet**: headers de segurança HTTP em todas as respostas
- **Rate limiting global**: todas as rotas `/api/*` limitadas a 300 req/min por IP
- **Rate limiting auth**: `/api/login` e `/api/register` limitados a 30 req / 15 min por IP (anti brute-force)
- **`SESSION_SECRET` obrigatório em produção**: boot falha se `NODE_ENV=production` e env não definida
- **Sessões PostgreSQL**: `connect-pg-simple` persiste sessões na tabela `session`
- **Cookies env-aware**: `secure: true` e `sameSite: "none"` só em produção; dev usa `sameSite: "lax"`
- **Liveness probe**: `GET /health`, `/healthz`, `/api/health` — verifica apenas que o processo está vivo
- **Readiness probe**: `GET /readyz`, `/api/ready` — verifica conectividade com banco + estado de shutdown
- **Graceful shutdown**: SIGTERM/SIGINT acionam fechamento ordenado. Timeout forçado de 10s
- **CSP estrita em produção**: Helmet aplica Content-Security-Policy com `default-src 'self'`
- **Hash de senha legado**: ainda aceito no login com auto-upgrade para `hash.salt` no primeiro login
- **Métricas Prometheus**: `GET /metrics` — contadores por método/rota/status, histograma de latência

### API - Rotas Principais
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/login` | Autenticação |
| POST | `/api/logout` | Encerrar sessão |
| POST | `/api/register` | Registro público (aguarda aprovação) |
| GET | `/api/user` | Usuário atual autenticado |
| GET | `/api/managers/public` | Gestores para formulário de registro (sem auth) |
| GET/POST | `/api/objectives` | Listar / criar objetivos |
| GET/PUT/DELETE | `/api/objectives/:id` | Objetivo específico |
| GET/POST | `/api/key-results` | Listar / criar resultados-chave |
| GET/PUT/DELETE | `/api/key-results/:id` | KR específico |
| POST | `/api/key-results/:id/recreate-checkpoints` | Recriar checkpoints de um KR |
| GET/POST | `/api/actions` | Listar / criar ações |
| GET/PUT/DELETE | `/api/actions/:id` | Ação específica |
| GET/POST | `/api/actions/:id/comments` | Comentários de ação |
| GET | `/api/checkpoints` | Listar checkpoints (suporta `?keyResultId=`) |
| PUT | `/api/checkpoints/:id` | Atualizar checkpoint |
| POST | `/api/checkpoints/:id/update` | Atualização simplificada de checkpoint |
| DELETE | `/api/checkpoints/:id` | Excluir checkpoint |
| GET | `/api/dashboard/kpis` | KPIs do dashboard |
| GET | `/api/executive-summary` | Resumo executivo |
| GET/POST | `/api/users` | Usuários |
| GET | `/api/managers` | Lista de gestores (requer auth) |
| GET | `/api/pending-users` | Usuários pendentes de aprovação |
| PATCH | `/api/users/:id` | Atualizar usuário |
| DELETE | `/api/users/:id` | Excluir usuário |
| POST | `/api/users/approve` | Aprovar usuário com permissões |
| GET | `/api/regions` | Listar regiões |
| GET | `/api/sub-regions` | Listar sub-regiões |
| GET | `/api/solutions` | Listar soluções |
| GET | `/api/service-lines` | Listar linhas de serviço |
| GET | `/api/services` | Listar serviços |
| GET | `/api/strategic-indicators` | Listar indicadores estratégicos |
| GET | `/api/quarters` | Períodos trimestrais |
| GET | `/api/activities` | Log de atividades (audit trail) |
| GET | `/api/action-dependencies` | Dependências entre ações |
| POST/PUT/DELETE | `/api/admin/strategic-indicators/:id` | CRUD indicadores (admin) |
| POST/PUT/DELETE | `/api/admin/regions/:id` | CRUD regiões (admin) |
| POST/PUT/DELETE | `/api/admin/sub-regions/:id` | CRUD sub-regiões (admin) |
| POST/PUT/DELETE | `/api/admin/solutions/:id` | CRUD soluções (admin) |
| POST/PUT/DELETE | `/api/admin/service-lines/:id` | CRUD linhas de serviço (admin) |
| POST/PUT/DELETE | `/api/admin/services/:id` | CRUD serviços (admin) |
| GET | `/api/admin/export-template` | Download de template Excel |
| POST | `/api/admin/import-data` | Importação de dados via Excel |

### Controle de Acesso por Role
| Role | Permissões |
|------|-----------|
| `admin` | Acesso total a todos os dados, usuários e configurações |
| `gestor` | Criar/editar objetivos e KRs, gerenciar usuários operacionais do time |
| `operacional` | Visualizar dados do escopo, atualizar checkpoints e ações |

### Rotas do Frontend (Wouter)
| Rota | Página | Visibilidade no Menu |
|------|--------|-------------|
| `/` | Alinhamento (árvore de objetivos) | Todos |
| `/dashboard` | Meu Painel | Todos |
| `/objectives` | Objetivos | Todos |
| `/key-results` | Resultados-Chave | Todos |
| `/actions` | Ações | Todos |
| `/checkpoints` | Checkpoints | Todos |
| `/reports` | Relatórios (indicadores + resumo + plano de ação) | Todos |
| `/users` | Usuários | Admin e Gestor |
| `/settings` | Configurações | Admin |
| `/trash` | Lixeira | Admin |
| `/audit` | Auditoria | Admin |
| `/indicators` | Indicadores Estratégicos | Fora do menu |

### Filtros Globais
- Gerenciados pelo `FiltersProvider` em `app-providers.tsx`
- Hooks: `useFilters()` (região/sub-região/linha de serviço) e `useQuarterlyFilter()` (trimestre)
- Renderizados via `CompactHeader` com `showFilters={true}` em cada página

### Formatação de Números
- Padrão brasileiro ABNT (vírgula como separador decimal, ponto como separador de milhar)
- Client-side: `formatBrazilianNumber()`, `parseDecimalBR()` em `client/src/lib/formatters.ts`
- Server-side: `formatBrazilianNumber()`, `convertBRToDatabase()` em `server/shared/formatters.ts`

### Formatação de Datas e Fuso Horário
- Fuso horário fixo: `America/Sao_Paulo` (UTC-3) — definido em `server/index.ts` via `process.env.TZ`
- Client: helpers em `client/src/lib/timezone.ts` (`formatSP`, `parseISOSP`, `nowSP`, `toSPZoned`) via `date-fns-tz`
- Datas armazenadas como `YYYY-MM-DD` (sem horário) — interpretadas como meia-noite em São Paulo
- Exibição: `DD/MM/AAAA` e `DD/MM/AAAA HH:mm` via `formatDateBR` / `formatDateTimeBR` em `client/src/lib/formatters.ts`

### Gerenciamento de Modais
- Limpeza automática de overlays Radix UI travados em `client/src/lib/modal-cleanup.ts`
- Cleanup de emergência via `Ctrl+Shift+C` em `client/src/lib/emergency-cleanup.ts`

### Checkpoints
- Gerados automaticamente ao criar um KR com base na frequência (semanal, quinzenal, mensal, trimestral)
- Endpoint `/api/key-results/:id/recreate-checkpoints` recria checkpoints
- Ao concluir um checkpoint, o `currentValue` e `progress` do KR pai são atualizados (via `recalc.ts`)

### Performance
- **Code-splitting**: `App.tsx` usa `React.lazy` + `Suspense` para todas as páginas autenticadas
- **Cache LRU server-side** (`server/cache.ts`): lookups cacheados com TTL de 5 minutos; mutações em `/api/admin/*` invalidam o cache automaticamente
- **recharts lazy-loaded**: `kr-progress-chart-lazy.tsx` isola a lib recharts em chunk separado

### Qualidade de Código
- **ESLint** (`eslint.config.js`): TypeScript + React Hooks + React Refresh, integrado com Prettier
- **Prettier** (`.prettierrc.json`): 100 cols, double quotes, semi, trailing comma ES5
- **Vitest** + **Supertest**: testes em `tests/*.test.ts`, cobertura via `@vitest/coverage-v8`
- **Husky + lint-staged**: hook `pre-commit` aplica `eslint --fix` + `prettier --write` nos arquivos staged
- **CI** (`.github/workflows/ci.yml`): lint + format check + typecheck + testes + build em cada push/PR

## Configuração do Ambiente

### Variáveis de Ambiente
| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `SESSION_SECRET` | Segredo para sessões (obrigatório em produção) | Sim (prod) |
| `PORT` | Porta do servidor (padrão: 5000) | Não |
| `NODE_ENV` | `production` ativa cookies seguros, logs JSON, etc. | Sim (prod) |

### Usuário Padrão
- **Username**: `admin`
- **Senha**: `admin123`
- **Role**: admin

### Executar o Projeto
```bash
npm run dev             # Desenvolvimento (tsx + Vite HMR) — porta 5000
npm run build           # Build de produção (Vite frontend + esbuild backend)
npm run start           # Produção (requer build prévio)
npm run db:push         # Sincronizar schema Drizzle com banco (dev)
npm test                # Suíte Vitest completa
npm run lint            # ESLint
npm run format          # Prettier
```

### Migrations Versionadas (Produção)
```bash
npx drizzle-kit generate   # Gera SQL incremental em /migrations
npx drizzle-kit migrate    # Aplica migrations pendentes
```

## Workflow de Desenvolvimento
Único workflow "Start application" executa `npm run dev` → `node_modules/.bin/tsx server/index.ts`. O servidor Express na porta 5000 serve tanto a API REST quanto o frontend React (Vite HMR em dev / estáticos em prod).

## Notas de Manutenção
- Schema sincronizado com `npm run db:push` em dev; migrations versionadas para produção
- Autenticação usa scrypt com salt (`hash.salt`); hash legado ainda suportado com auto-upgrade
- Comentários automáticos criados ao alterar ações para status final
- Logger HTTP centralizado em `server/infra/logger.ts`: dev mostra só rotas `/api`; prod loga JSON estruturado
- A conexão com o banco usa o pacote `postgres` diretamente (não `@neondatabase/serverless`)
- Sessões persistidas na tabela `session` (PostgreSQL) via `connect-pg-simple`
- Arquivos limpos em abril/2026: `server/logger.ts`, `server/formatters.ts`, `server/pg-storage.ts`, `server/storage.ts`, `server/quarterly-periods.ts`, `server/seed.ts`, `server/seed-okrs.ts`, `shared/pg-schema.ts` (todos eram barris de compatibilidade obsoletos sem uso direto); `client/src/components/` duplas de componentes agora canônicos em `client/src/features/` e `client/src/components/layout/`
