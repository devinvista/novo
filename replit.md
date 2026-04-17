# Sistema de Gestão Estratégica - OKRs FIERGS/SESI/SENAI

## Visão Geral
Plataforma de gerenciamento de OKR (Objectives and Key Results) para rastreamento de objetivos organizacionais, resultados-chave, ações e checkpoints de progresso. Suporta estrutura multi-regional com controle de acesso hierárquico.

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
/client/src/          # Frontend React
  components/         # Componentes reutilizáveis
  pages/              # Páginas (Dashboard, Objetivos, KRs, Ações, Checkpoints, Usuários, Relatórios, Configurações)
  hooks/              # Custom hooks (useAuth, useFilters, etc.)
  lib/                # Utilitários (queryClient, formatters, etc.)
  providers/          # Provedores de contexto
/server/              # Backend Express
  index.ts            # Entry point (porta 5000)
  routes.ts           # Todas as rotas API
  auth.ts             # Autenticação e autorização
  pg-storage.ts       # Implementação de acesso ao banco (PostgreSQL)
  pg-db.ts            # Conexão com PostgreSQL
  storage.ts          # Re-exporta pg-storage (abstração)
  quarterly-periods.ts # Utilitários de cálculo de períodos trimestrais
  formatters.ts       # Formatação de números no padrão brasileiro
  vite.ts             # Setup do servidor Vite em desenvolvimento
/shared/
  pg-schema.ts        # Schema Drizzle (PostgreSQL) + tipos + schemas Zod
  schema.ts           # Re-exporta pg-schema
```

### Banco de Dados - Tabelas Principais
| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários com roles (admin/gestor/operacional) e permissões por arrays JSON |
| `objectives` | Objetivos estratégicos com dono, região, sub-regiões e período |
| `key_results` | Resultados-chave vinculados a objetivos com metas e progresso |
| `actions` | Ações vinculadas a key results com responsável, prazo e status |
| `checkpoints` | Marcos de progresso gerados automaticamente por frequência do KR |
| `action_comments` | Comentários em ações |
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
| GET | `/api/user` | Usuário atual |
| GET/POST | `/api/objectives` | Objetivos |
| GET/PUT/DELETE | `/api/objectives/:id` | Objetivo específico |
| GET/POST | `/api/key-results` | Resultados-chave |
| GET/PUT/DELETE | `/api/key-results/:id` | KR específico |
| GET/POST | `/api/actions` | Ações |
| GET/PUT/DELETE | `/api/actions/:id` | Ação específica |
| GET | `/api/checkpoints` | Checkpoints |
| PUT | `/api/checkpoints/:id` | Atualizar checkpoint |
| GET | `/api/dashboard/kpis` | KPIs do dashboard |
| GET | `/api/executive-summary` | Resumo executivo |
| GET | `/api/users` | Usuários |
| GET | `/api/managers` | Lista de gestores |
| GET | `/api/regions` | Regiões |
| GET | `/api/sub-regions` | Sub-regiões |
| GET | `/api/solutions` | Soluções |
| GET | `/api/service-lines` | Linhas de serviço |
| GET | `/api/services` | Serviços |
| GET | `/api/strategic-indicators` | Indicadores estratégicos |
| GET | `/api/quarters` | Períodos trimestrais disponíveis |

### Controle de Acesso por Role
| Role | Permissões |
|------|-----------|
| `admin` | Acesso total a todos os dados e configurações |
| `gestor` | Criar/editar objetivos e KRs, gerenciar usuários operacionais de seu time |
| `operacional` | Visualizar dados do seu escopo, atualizar checkpoints e ações |

### Formatação de Números
- O sistema usa formatação brasileira (vírgula como separador decimal)
- Conversão client-side: `formatBrazilianNumber()`, `parseDecimalBR()` em `client/src/lib/formatters.ts`
- Conversão server-side: `formatDecimalBR()`, `convertBRToDatabase()` em `server/formatters.ts`

### Gerenciamento de Modais
- Sistema de limpeza automática de modais em `client/src/lib/modal-cleanup.ts`
- Cleanup de emergência em `client/src/lib/emergency-cleanup.ts`
- Atalho `Ctrl+Shift+C` para limpeza manual (modo dev)

## Configuração do Ambiente

### Variáveis de Ambiente
| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL (Neon) | Sim |
| `SESSION_SECRET` | Segredo para sessões (padrão inseguro em dev) | Recomendada |

### Usuário Padrão
- **Username**: `admin`
- **Senha**: `admin123`
- **Role**: admin

### Executar o Projeto
```bash
npm run dev         # Desenvolvimento (tsx + Vite HMR)
npm run build       # Build de produção
npm run start       # Produção (requer build)
npm run db:push     # Sincronizar schema com banco de dados
```

## Workflow de Desenvolvimento
O projeto usa um único workflow "Start application" que executa `NODE_ENV=development npx tsx server/index.ts`. O servidor Express na porta 5000 serve tanto a API quanto o frontend React (via Vite em dev / estático em prod).
