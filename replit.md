# Sistema de Gestão Estratégica - OKRs FIERGS/SESI/SENAI

## Visão Geral
Plataforma de gerenciamento de OKR (Objectives and Key Results) para rastreamento de objetivos organizacionais, resultados-chave, ações e checkpoints de progresso. Suporta estrutura multi-regional com controle de acesso hierárquico (admin / gestor / operacional).

## Preferências do Usuário
- Estilo de comunicação: Linguagem simples e cotidiana
- Idioma: Português brasileiro (toda interface, documentação e textos)

## Arquitetura do Sistema

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn/ui (Radix UI)
- **Backend**: Node.js + Express.js (TypeScript, ES modules)
- **Banco de Dados**: PostgreSQL (conexão via `DATABASE_URL` usando o pacote `postgres`)
- **ORM**: Drizzle ORM com drizzle-zod para validação
- **Autenticação**: Passport.js (estratégia local) + express-session + connect-pg-simple (sessões PostgreSQL)
- **Estado**: TanStack Query v5 para estado do servidor
- **Roteamento**: Wouter (frontend)
- **Formulários**: React Hook Form + Zod

### Estrutura de Arquivos
```
/client/src/
  components/
    action-form.tsx               # Formulário de criação/edição de ações
    action-plan.tsx               # Plano de ação (exibido na aba Relatórios)
    action-timeline.tsx           # Timeline visual de ações
    animated-progress-ring.tsx    # Anel de progresso animado (checkpoint-progress-grid)
    checkpoint-progress-grid.tsx  # Grade de progresso de checkpoints
    checkpoint-timeline-header.tsx # Cabeçalho com timeline de checkpoints
    checkpoint-timeline.tsx       # Timeline de checkpoints por KR
    checkpoint-update-dialog.tsx  # Diálogo de atualização de checkpoint
    checkpoint-updater.tsx        # Componente de atualização inline de checkpoint
    compact-header.tsx            # Cabeçalho global com filtros (região/sub-região/linha/trimestre)
    executive-summary.tsx         # Resumo executivo
    indicators-dashboard.tsx      # Painel de indicadores estratégicos
    key-result-form-simple.tsx    # Formulário de KR (único formulário ativo)
    kr-progress-chart.tsx         # Gráfico de progresso de KR (recharts)
    kr-progress-chart-lazy.tsx    # Wrapper com Suspense que faz lazy-load do gráfico (isola recharts em chunk próprio)
    gantt-timeline.tsx            # Timeline Gantt de ações (página Ações)
    next-checkpoints-overview.tsx # Visão geral dos próximos checkpoints
    objective-form.tsx            # Formulário de objetivo
    objectives-table.tsx          # Tabela de objetivos
    quarterly-filter.tsx          # Filtro de período trimestral
    sidebar.tsx                   # Barra lateral de navegação
  components/ui/                  # Componentes Shadcn/ui (inclui date-input-br.tsx e number-input-br.tsx para entrada no padrão BR)
  pages/
    alignment-tree.tsx            # / — Árvore de alinhamento (dashboard principal)
    objectives.tsx                # /objectives — Objetivos
    key-results.tsx               # /key-results — Resultados-Chave
    actions.tsx                   # /actions — Ações
    checkpoints.tsx               # /checkpoints — Checkpoints
    indicators.tsx                # /indicators — Indicadores (rota disponível, fora do menu)
    reports.tsx                   # /reports — Relatórios (indicadores + resumo + plano de ação)
    users.tsx                     # /users — Usuários (admin/gestor)
    settings.tsx                  # /settings — Configurações (admin)
    auth-page.tsx                 # Página de login/registro
    not-found.tsx                 # 404
  hooks/
    use-auth.ts                   # Autenticação
    use-filters.ts                # Filtros globais (região, sub-região, linha de serviço)
    use-quarterly-filter.ts       # Filtro de período trimestral global
    use-sidebar-toggle.ts         # Estado de abertura/fechamento do sidebar
    use-mobile.ts                 # Detecção de dispositivo móvel
    use-toast.ts                  # Toast notifications
  lib/
    queryClient.ts                # TanStack Query client + apiRequest helper
    formatters.ts                 # Formatação de números (padrão BR: vírgula decimal) + datas DD/MM/AAAA
    timezone.ts                   # Helpers de fuso horário (America/Sao_Paulo) baseados em date-fns-tz
    checkpoint-utils.ts           # Utilitários de progresso/badge de checkpoints
    frequency-translations.ts     # Tradução de frequências (en → pt-BR)
    modal-cleanup.ts              # Limpeza de overlays Radix UI travados
    emergency-cleanup.ts          # Limpeza de emergência (Ctrl+Shift+C)
  providers/
    app-providers.tsx             # Provedores de contexto (AuthProvider, FiltersProvider, QueryClientProvider)
/server/
  index.ts                        # Entry point (porta 5000/PORT env, timezone America/Sao_Paulo, helmet, rate-limit, healthcheck)
  routes.ts                       # Apenas montagem dos routers modulares (~50 linhas)
  auth.ts                         # Autenticação e autorização (Passport.js + scrypt, cookies env-aware)
  storage/                        # IStorage isolado (interface.ts) + implementação Drizzle (pg.ts) + barrel (index.ts)
                                   # Facade fina que compõe os repositórios (server/repositories/*) — delega chamadas
  pg-db.ts                        # Conexão com PostgreSQL via pacote `postgres` (DATABASE_URL env var, pool production-grade)
  repositories/                   # Repositórios por agregado (UserRepo, LookupRepo, ObjectiveRepo, KeyResultRepo, ActionRepo, CheckpointRepo, DashboardRepo) + sessionStore
                                   # Cada repositório encapsula queries Drizzle do seu domínio. Novo código deve importar o repo específico em vez do facade.
  cache.ts                        # LRU cache para look-ups (regions/solutions/strategic-indicators etc.)
  config/env.ts                   # Validação Zod de variáveis de ambiente no boot
  errors/app-error.ts             # Classes de erro tipadas (AppError, NotFoundError, ForbiddenError, ValidationError)
  infra/logger.ts                 # Logger pino (único logger do projeto) + httpLogger pino-http + correlação por requestId. Inclui helper `log()` para chamadas legadas.
  middleware/                     # async-handler, auth (requireAuth/requireRole/sanitizeUser), validate (Zod), error-handler, request-id
  modules/                        # Routers por domínio (ver abaixo)
  domain/checkpoints/recalc.ts    # Recálculo de KR a partir de checkpoints
  shared/                         # Utilitários de servidor compartilhados entre módulos
    formatters.ts                 # Formatação de números no padrão BR (server-side)
    quarterly-periods.ts          # Utilitários de cálculo de períodos trimestrais
  scripts/seed/                   # Scripts de seed de dados (desenvolvimento)
    seed.ts                       # Seed principal (usuários, regiões, soluções, etc.)
    seed-okrs.ts                  # Seed de OKRs de exemplo
  vite.ts                         # Setup do servidor Vite em dev / static files em prod (path resolution correta)
/server/modules/
  objectives/                     # /api/objectives — CRUD de objetivos
  key-results/                    # /api/key-results — CRUD de KRs
  actions/                        # /api/actions — CRUD de ações
  checkpoints/                    # /api/checkpoints — CRUD de checkpoints
  action-comments/                # /api/actions/:id/comments
  lookups/                        # /api/regions, /api/solutions, etc. (com cache)
  admin-lookups/                  # /api/admin/* — CRUD administrativo de lookups
  admin-import/                   # /api/admin/export-template, /api/admin/import-data (Excel)
  dashboard/                      # /api/dashboard/kpis
  quarters/                       # /api/quarters, /api/quarters/stats, /api/quarters/:q/data
  executive-summary/              # /api/executive-summary
  users/                          # /api/users, /api/managers, /api/pending-users, /api/users/approve, /api/managers/public
/tests/                           # Testes Vitest + Supertest
/.github/workflows/ci.yml         # Pipeline CI (lint, format, typecheck, test, build)
/shared/
  schema.ts                       # Schema Drizzle (PostgreSQL) + tipos TypeScript + schemas Zod + índices em FKs e colunas de filtro
/migrations/                      # Migrations históricas (referência apenas; usar db:push)
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
| `activities` | Log de atividades do sistema (disponível para uso futuro) |

### Segurança e Produção
- **Senhas nunca expostas**: `sanitizeUser()` / `sanitizeUsers()` em `server/routes.ts` remove o campo `password` de todas as respostas de usuário
- **`/api/managers` protegido por auth**: requer autenticação; formulário de registro usa `/api/managers/public` (apenas `id` e `name`)
- **Scrypt com salt**: senhas armazenadas como `hash.salt` (64 bytes)
- **Helmet**: headers de segurança HTTP em todas as respostas
- **Rate limiting global**: todas as rotas `/api/*` limitadas a 300 req/min por IP
- **Rate limiting auth**: `/api/login` e `/api/register` adicionalmente limitados a 30 req / 15 min por IP (anti brute-force)
- **`SESSION_SECRET` obrigatório em produção**: o servidor falha o boot se `NODE_ENV=production` e a env não for definida (ver `server/auth.ts`)
- **Sessões PostgreSQL**: `connect-pg-simple` persiste sessões na tabela `session` (auto-criada) — sem perda de sessão em restart
- **Cookies env-aware**: `secure: true` e `sameSite: "none"` apenas em produção; em dev usa `sameSite: "lax"`
- **Liveness probe**: `GET /healthz` (alias `/health`) — verifica apenas que o processo está vivo (sem checagem de DB). Resposta rápida.
- **Readiness probe**: `GET /readyz` — verifica conectividade com banco e estado de shutdown. Retorna 503 enquanto o servidor está drenando.
- **Graceful shutdown**: SIGTERM/SIGINT acionam fechamento ordenado — `/readyz` passa a 503, requisições em andamento drenam, depois processo encerra. Timeout forçado de 10s. Importante para deploys autoscale sem cortar requests.
- **Engines fixados**: `package.json` declara `engines.node: ">=18.0.0 <25.0.0"` para reforçar compatibilidade com a matriz Hostinger
- **CSP estrita em produção**: Helmet aplica Content-Security-Policy com `default-src 'self'`, `object-src 'none'` etc. Em dev é desabilitada para permitir HMR do Vite.
- **Hash de senha legado**: ainda aceito no login mas com auto-upgrade transparente para `hash.salt` no primeiro login bem-sucedido (ver `comparePasswords` em `server/auth.ts`). Plano: remover branch legado depois que todos os usuários ativos tiverem feito login.
- **Métricas Prometheus**: `GET /metrics` expõe métricas em formato `text/plain` (Prometheus): contadores por método/rota/status, histograma de latência (`http_request_duration_seconds`) e métricas default do Node (CPU, memória, GC, event loop). Implementação em `server/infra/metrics.ts`.

### API - Rotas Principais
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/login` | Autenticação |
| POST | `/api/logout` | Encerrar sessão |
| POST | `/api/register` | Registro público (aguarda aprovação do gestor) |
| GET | `/api/user` | Usuário atual autenticado |
| GET | `/api/managers/public` | Gestores para formulário de registro (sem auth, apenas id/name) |
| GET/POST | `/api/objectives` | Listar / criar objetivos |
| GET/PUT/DELETE | `/api/objectives/:id` | Objetivo específico |
| GET/POST | `/api/key-results` | Listar / criar resultados-chave |
| GET/PUT/DELETE | `/api/key-results/:id` | KR específico |
| POST | `/api/key-results/:id/recreate-checkpoints` | Recriar checkpoints de um KR |
| GET/POST | `/api/actions` | Listar / criar ações |
| GET/PUT/DELETE | `/api/actions/:id` | Ação específica |
| GET/POST | `/api/actions/:id/comments` | Comentários de ação |
| GET | `/api/checkpoints` | Listar checkpoints (suporta `?keyResultId=`) |
| GET | `/api/checkpoints/:id` | Checkpoint específico |
| PUT | `/api/checkpoints/:id` | Atualizar checkpoint completo |
| POST | `/api/checkpoints/:id/update` | Atualização simplificada de checkpoint |
| DELETE | `/api/checkpoints/:id` | Excluir checkpoint |
| GET | `/api/dashboard/kpis` | KPIs do dashboard |
| GET | `/api/executive-summary` | Resumo executivo |
| GET | `/api/users` | Usuários (filtrado por role do solicitante) |
| GET | `/api/managers` | Lista de gestores (requer auth) |
| GET | `/api/pending-users` | Usuários pendentes de aprovação |
| POST | `/api/users` | Criar usuário (admin/gestor) |
| PATCH | `/api/users/:id` | Atualizar usuário |
| DELETE | `/api/users/:id` | Excluir usuário |
| PATCH | `/api/users/:id/status` | Alterar status ativo/inativo |
| POST | `/api/users/approve` | Aprovar usuário com permissões |
| GET | `/api/regions` | Listar regiões |
| GET | `/api/sub-regions` | Listar sub-regiões |
| GET | `/api/solutions` | Listar soluções |
| GET | `/api/service-lines` | Listar linhas de serviço |
| GET | `/api/services` | Listar serviços |
| GET | `/api/strategic-indicators` | Listar indicadores estratégicos |
| GET | `/api/quarters` | Períodos trimestrais disponíveis |
| GET | `/api/quarters/stats` | Estatísticas por trimestre |
| GET | `/api/quarters/:quarter/data` | Dados de um trimestre específico |
| POST/PUT/DELETE | `/api/admin/strategic-indicators/:id` | CRUD de indicadores (admin) |
| POST/PUT/DELETE | `/api/admin/regions/:id` | CRUD de regiões (admin) |
| POST/PUT/DELETE | `/api/admin/sub-regions/:id` | CRUD de sub-regiões (admin) |
| POST/PUT/DELETE | `/api/admin/solutions/:id` | CRUD de soluções (admin) |
| POST/PUT/DELETE | `/api/admin/service-lines/:id` | CRUD de linhas de serviço (admin) |
| POST/PUT/DELETE | `/api/admin/services/:id` | CRUD de serviços (admin) |
| GET | `/api/admin/export-template` | Download de template Excel |
| POST | `/api/admin/import-data` | Importação de dados via Excel |

### Controle de Acesso por Role
| Role | Permissões |
|------|-----------|
| `admin` | Acesso total a todos os dados, usuários e configurações |
| `gestor` | Criar/editar objetivos e KRs, gerenciar usuários operacionais de seu time |
| `operacional` | Visualizar dados do seu escopo, atualizar checkpoints e ações |

### Rotas do Frontend (Wouter)
| Rota | Página | Visibilidade no Menu |
|------|--------|-------------|
| `/` | Alinhamento (árvore de objetivos) | Todos |
| `/objectives` | Objetivos | Todos |
| `/key-results` | Resultados-Chave | Todos |
| `/actions` | Ações | Todos |
| `/checkpoints` | Checkpoints | Todos |
| `/reports` | Relatórios (indicadores + resumo executivo + plano de ação) | Todos |
| `/users` | Usuários | Admin e Gestor |
| `/settings` | Configurações | Admin |
| `/indicators` | Indicadores Estratégicos | Rota disponível, fora do menu |

### Filtros Globais
- Gerenciados pelo `FiltersProvider` em `app-providers.tsx`
- Hooks: `useFilters()` (região/sub-região/linha de serviço) e `useQuarterlyFilter()` (trimestre)
- Renderizados via `CompactHeader` com `showFilters={true}` em cada página

### Formatação de Números
- Padrão brasileiro ABNT (vírgula como separador decimal, ponto como separador de milhar)
- Client-side: `formatBrazilianNumber()`, `parseDecimalBR()` em `client/src/lib/formatters.ts`
- Server-side: `formatBrazilianNumber()`, `convertBRToDatabase()` em `server/shared/formatters.ts`
- A API converte automaticamente valores do formato BR para banco (e vice-versa) nos endpoints de KR e Checkpoint

### Formatação de Datas e Fuso Horário
- Fuso horário fixo da aplicação: `America/Sao_Paulo` (UTC-3)
- Server: `process.env.TZ` é definido em `server/index.ts` antes de qualquer outro import
- Client: helpers em `client/src/lib/timezone.ts` (`formatSP`, `parseISOSP`, `nowSP`, `toSPZoned`) usam `date-fns-tz`
- Datas armazenadas como string `YYYY-MM-DD` (sem horário) são interpretadas como meia-noite em São Paulo, evitando deslocamento de dia
- Exibição padrão para o usuário final: `DD/MM/AAAA` (data) e `DD/MM/AAAA HH:mm` (data + hora) via `formatDateBR` / `formatDateTimeBR` em `client/src/lib/formatters.ts`

### Gerenciamento de Modais
- Limpeza automática de overlays Radix UI travados em `client/src/lib/modal-cleanup.ts`
- Cleanup de emergência disponível em `client/src/lib/emergency-cleanup.ts`
- Atalho de teclado `Ctrl+Shift+C` para limpeza manual de emergência

### Checkpoints
- Gerados automaticamente ao criar um Key Result com base na frequência (semanal, quinzenal, mensal, trimestral)
- Endpoint `/api/key-results/:id/recreate-checkpoints` permite recriar checkpoints
- Ao concluir um checkpoint, o `currentValue` e `progress` do KR pai são atualizados automaticamente

### Performance
- Página Resultados-Chave: busca ações e checkpoints **uma vez** (sem filtro por KR), agrupa client-side — evita N+1 requests
- **Code-splitting de páginas**: `client/src/App.tsx` usa `React.lazy` + `Suspense` para todas as páginas autenticadas, reduzindo o bundle inicial. `AuthPage` e `NotFound` permanecem síncronos (caminho crítico)
- **Cache LRU server-side** (`server/cache.ts`): endpoints de lookup (`/api/solutions`, `/api/regions`, `/api/sub-regions`, `/api/service-lines`, `/api/services`, `/api/strategic-indicators`) cacheados com TTL de 5 minutos. Filtros por usuário aplicados após o cache. Mutações em `/api/admin/*` invalidam o cache automaticamente via middleware

### Qualidade de Código
- **ESLint** (`eslint.config.js`): TypeScript + React Hooks + React Refresh, integrado com Prettier
- **Prettier** (`.prettierrc.json`): 100 cols, double quotes, semi, trailing comma ES5
- **Vitest** (`vitest.config.ts`) + **Supertest**: testes em `tests/*.test.ts`, cobertura via `@vitest/coverage-v8`. Cobertura inicial: health, cache, auth (hashing), métricas
- **Husky + lint-staged**: hook `.husky/pre-commit` aplica `eslint --fix` + `prettier --write` apenas nos arquivos staged (config em `.lintstagedrc.json`). Ativado automaticamente após `npm install` via `prepare` script
- **CI** (`.github/workflows/ci.yml`): lint + format check + typecheck + testes + build em cada push/PR
- Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`

## Configuração do Ambiente

### Variáveis de Ambiente
| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL (suporte a `sslmode=require`) | Sim |
| `SESSION_SECRET` | Segredo para sessões — **obrigatório em produção** (string longa e aleatória) | Sim (prod) |
| `PORT` | Porta do servidor (padrão: 5000) — Hostinger define automaticamente | Não |
| `NODE_ENV` | `production` ativa: cookies seguros, logs JSON, pool maior, sem Vite HMR | Sim (prod) |

### Deploy no Hostinger (Node.js)
Stack atual (Express + React + Vite) está dentro da matriz de compatibilidade do Hostinger. Sempre que houver escolha, priorizamos a opção recomendada (em **negrito**).

**Matriz de compatibilidade Hostinger:**
| Categoria | Opções suportadas | Escolha do projeto |
|-----------|-------------------|--------------------|
| Frameworks frontend | Angular, Astro, Next.js, Nuxt, Parcel, **React**, React Router, Svelte, SvelteKit, **Vite**, Vue.js | **React + Vite** |
| Frameworks backend | Astro, **Express**, Fastify, Hono, NestJS, Next.js, Nuxt, React Router, SvelteKit | **Express** |
| Versões Node.js | 24.x, **22.x**, 20.x, 18.x | **22.x** (recomendado) — 20.x suportado |
| Gerenciadores de pacotes | **npm** (padrão), yarn, pnpm | **npm** |

**Configuração no painel Hostinger:**
| Campo | Valor |
|-------|-------|
| Build command | `npm install && npm run build` |
| Start command | `node dist/index.js` |
| Node version | **22.x** (recomendado) ou 20.x |
| Package manager | npm (padrão) |
| Port | automático (definido por `PORT`) |

> **Regra de compatibilidade máxima:** ao adicionar dependências, scripts ou ajustes de build, manter compatibilidade com Node.js 18.x → 24.x e com npm/yarn/pnpm. Evitar APIs específicas de uma única versão de Node ou recursos exclusivos de um único package manager (ex.: `pnpm`-only workspaces protocol). Em caso de escolha, priorizar a combinação **React + Vite + Express + Node 22.x + npm**.

**Variáveis de ambiente a configurar:**
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=<string-aleatoria-longa-e-unica>
NODE_ENV=production
```

**Endpoint de healthcheck:** `GET /health` — retorna `{"status":"ok",...}`

### Usuário Padrão
- **Username**: `admin`
- **Senha**: `admin123`
- **Role**: admin

### Executar o Projeto
```bash
npm run dev         # Desenvolvimento (npx tsx + Vite HMR) — porta 5000
npm run build       # Build de produção (frontend Vite + backend esbuild)
npm run start       # Produção (requer build prévio)
npm run db:push     # Sincronizar schema Drizzle com banco de dados
```

## Workflow de Desenvolvimento
O projeto usa um único workflow "Start application" que executa `npm run dev` → `npx tsx server/index.ts`. O servidor Express na porta 5000 serve tanto a API REST quanto o frontend React (via Vite HMR em dev / arquivos estáticos em prod).

## Notas de Manutenção
- Schema gerenciado pelo Drizzle ORM via `npm run db:push` (sem migrations manuais)
- Arquivos em `/migrations/` são referência histórica apenas
- Autenticação usa scrypt com salt para hash de senhas (formato `hash.salt`)
- Comentários automáticos do sistema são criados ao alterar ações para status final
- O timezone do servidor é `America/Sao_Paulo` (UTC-3), configurado no entry point
- A conexão com o banco usa o pacote `postgres` diretamente (não `@neondatabase/serverless`)
- Sessões persistidas na tabela `session` (PostgreSQL) via `connect-pg-simple`; tabela criada automaticamente ao iniciar
- Logger HTTP centralizado em `server/infra/logger.ts`: em dev mostra apenas rotas `/api`; em prod loga JSON estruturado para cada request
- Health checks expostos em `/health`, `/healthz`, `/api/health` (liveness) e `/readyz`, `/api/ready` (readiness com ping no banco)
- Arquivos excluídos por obsolescência: `key-result-form.tsx` (→ `key-result-form-simple.tsx`), `simple-dashboard.tsx` (componente órfão, sem imports), `header.tsx` (→ `compact-header.tsx`), `filters.tsx` (→ filtros em `compact-header.tsx`), `dashboard.tsx` (página órfã, sem rota registrada)
- Tabela `activities` removida do schema por nunca ter sido populada (audit trail nunca implementado). Caso seja necessário no futuro, recriar com escopo bem definido
