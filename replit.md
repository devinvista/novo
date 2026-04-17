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
- **Banco de Dados**: PostgreSQL via Neon (serverless)
- **ORM**: Drizzle ORM com drizzle-zod para validação
- **Autenticação**: Passport.js (estratégia local) + express-session + MemoryStore
- **Estado**: TanStack Query v5 para estado do servidor
- **Roteamento**: Wouter (frontend)
- **Formulários**: React Hook Form + Zod

### Estrutura de Arquivos
```
/client/src/
  components/         # Componentes reutilizáveis (sidebar, header, formulários, tabelas, etc.)
  components/ui/      # Componentes Shadcn/ui
  pages/              # Páginas: Dashboard, Objetivos, KRs, Ações, Checkpoints, Indicadores, Usuários, Relatórios, Configurações
  hooks/              # Custom hooks: useAuth, useFilters, useSidebarToggle, useQuarterlyFilter, useMobile, useToast
  lib/                # Utilitários: queryClient, formatters, checkpoint-utils, frequency-translations, modal-cleanup, emergency-cleanup
  providers/          # Provedores de contexto (AppProviders)
/server/
  index.ts            # Entry point (porta 5000, timezone America/Sao_Paulo)
  routes.ts           # Todas as rotas da API (~1945 linhas)
  auth.ts             # Autenticação e autorização (Passport.js + scrypt)
  pg-storage.ts       # Implementação de acesso ao banco (PostgreSQL + Drizzle) + interface IStorage
  pg-db.ts            # Conexão com PostgreSQL (DATABASE_URL env var)
  storage.ts          # Re-exporta pg-storage (abstração)
  quarterly-periods.ts # Utilitários de cálculo de períodos trimestrais
  formatters.ts       # Formatação de números no padrão brasileiro ABNT (server-side)
  vite.ts             # Setup do servidor Vite em desenvolvimento
/shared/
  pg-schema.ts        # Schema Drizzle (PostgreSQL) + tipos TypeScript + schemas Zod
  schema.ts           # Re-exporta pg-schema
/migrations/          # Migrations históricas (referência apenas; usar db:push para sincronizar)
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
| `activities` | Log de atividades do sistema |

### API - Rotas Principais
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/login` | Autenticação |
| POST | `/api/logout` | Encerrar sessão |
| POST | `/api/register` | Registro público (aguarda aprovação do gestor) |
| GET | `/api/user` | Usuário atual autenticado |
| GET/POST | `/api/objectives` | Listar / criar objetivos |
| GET/PUT/DELETE | `/api/objectives/:id` | Objetivo específico |
| GET/POST | `/api/key-results` | Listar / criar resultados-chave |
| GET/PUT/DELETE | `/api/key-results/:id` | KR específico |
| POST | `/api/key-results/:id/recreate-checkpoints` | Recriar checkpoints de um KR |
| GET/POST | `/api/actions` | Listar / criar ações |
| GET/PUT/DELETE | `/api/actions/:id` | Ação específica |
| GET/POST | `/api/actions/:id/comments` | Comentários de ação |
| GET | `/api/checkpoints` | Listar checkpoints |
| GET | `/api/checkpoints/:id` | Checkpoint específico |
| PUT | `/api/checkpoints/:id` | Atualizar checkpoint completo |
| POST | `/api/checkpoints/:id/update` | Atualização simplificada de checkpoint |
| DELETE | `/api/checkpoints/:id` | Excluir checkpoint |
| GET | `/api/dashboard/kpis` | KPIs do dashboard |
| GET | `/api/executive-summary` | Resumo executivo |
| GET | `/api/users` | Usuários (filtrado por role do solicitante) |
| GET | `/api/managers` | Lista de gestores |
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
| Rota | Página | Visibilidade |
|------|--------|-------------|
| `/` | Dashboard | Todos |
| `/objectives` | Objetivos | Todos |
| `/key-results` | Resultados-Chave | Todos |
| `/actions` | Ações | Todos |
| `/checkpoints` | Checkpoints | Todos |
| `/indicators` | Indicadores Estratégicos | Todos |
| `/reports` | Relatórios | Todos |
| `/users` | Usuários | Admin e Gestor |
| `/settings` | Configurações | Admin |

### Formatação de Números
- Padrão brasileiro ABNT (vírgula como separador decimal, ponto como separador de milhar)
- Client-side: `formatBrazilianNumber()`, `parseDecimalBR()` em `client/src/lib/formatters.ts`
- Server-side: `formatBrazilianNumber()`, `convertBRToDatabase()` em `server/formatters.ts`
- A API converte automaticamente valores do formato BR para banco (e vice-versa) nos endpoints de KR e Checkpoint

### Gerenciamento de Modais
- Limpeza automática de overlays Radix UI travados em `client/src/lib/modal-cleanup.ts`
- Cleanup de emergência disponível em `client/src/lib/emergency-cleanup.ts`
- Atalho de teclado `Ctrl+Shift+C` para limpeza manual de emergência

### Checkpoints
- Gerados automaticamente ao criar um Key Result com base na frequência (semanal, quinzenal, mensal, trimestral)
- Endpoint `/api/key-results/:id/recreate-checkpoints` permite recriar checkpoints
- Ao concluir um checkpoint, o `currentValue` e `progress` do KR pai são atualizados automaticamente

## Configuração do Ambiente

### Variáveis de Ambiente
| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `SESSION_SECRET` | Segredo para sessões (padrão inseguro em dev) | Recomendada |

### Usuário Padrão
- **Username**: `admin`
- **Senha**: `admin123`
- **Role**: admin

### Executar o Projeto
```bash
npm run dev         # Desenvolvimento (tsx + Vite HMR) — porta 5000
npm run build       # Build de produção (frontend Vite + backend esbuild)
npm run start       # Produção (requer build prévio)
npm run db:push     # Sincronizar schema Drizzle com banco de dados
```

## Workflow de Desenvolvimento
O projeto usa um único workflow "Start application" que executa `npm run dev` → `tsx server/index.ts`. O servidor Express na porta 5000 serve tanto a API REST quanto o frontend React (via Vite HMR em dev / arquivos estáticos em prod).

## Notas de Manutenção
- Schema gerenciado pelo Drizzle ORM via `npm run db:push` (sem migrations manuais)
- Arquivos em `/migrations/` são referência histórica apenas
- Autenticação usa scrypt com salt para hash de senhas (formato `hash.salt`)
- Comentários automáticos do sistema são criados ao alterar ações para status final
- O timezone do servidor é `America/Sao_Paulo` (UTC-3), configurado no entry point
