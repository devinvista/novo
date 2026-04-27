# Sistema de Gestão Estratégica - OKRs FIERGS/SESI/SENAI

## Overview
Platform for managing OKRs (Objectives and Key Results) to track organizational objectives, key results, actions, and progress checkpoints. It supports a multi-regional structure with hierarchical access control (admin / manager / operational). The project aims to provide a comprehensive tool for strategic planning and execution, enabling organizations to define, monitor, and achieve their strategic goals efficiently.

## User Preferences
- Estilo de comunicação: Linguagem simples e cotidiana
- Idioma: Português brasileiro (toda interface, documentação e textos)

## System Architecture

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
The project is organized into `/client` for the frontend, `/server` for the backend, and `/shared` for common schemas and utilities. Key frontend features are modularized under `client/src/features/`, while backend routes and business logic reside in `server/modules/` and `server/services/`. Repositories for database interactions are located in `server/repositories/`.

### Banco de Dados - Tabelas Principais
The database schema includes tables for `users`, `objectives`, `key_results`, `actions`, `checkpoints`, `regions`, `sub_regions`, `solutions`, `service_lines`, `services`, `strategic_indicators`, `quarterly_periods`, and `activities` for auditing.

### Segurança e Produção
- **Senhas Seguras**: Scrypt com salt; `sanitizeUser()` remove senhas de respostas.
- **Headers de Segurança**: Helmet para headers HTTP seguros.
- **Rate Limiting**: Global e por rota de autenticação, com store distribuído via PostgreSQL.
- **Sessões Seguras**: `SESSION_SECRET` obrigatório em produção, sessões persistidas em PostgreSQL, cookies `env-aware`.
- **Probes**: Liveness (`/health`) e Readiness (`/readyz`) probes para monitoramento.
- **Graceful Shutdown**: Fechamento ordenado em SIGTERM/SIGINT.
- **Métricas**: Prometheus (`/metrics`) para monitoramento de performance.

### API - Rotas Principais
The API provides comprehensive CRUD operations for objectives, key results, actions, checkpoints, and user management. It also includes routes for dashboard KPIs, executive summaries, audit trails, and administrative lookups. Key authentication routes include `/api/login`, `/api/logout`, and `/api/register`.

### Controle de Acesso
- **Roles**: `admin` (acesso total), `gestor` (gerencia objetivos, KRs e usuários operacionais do time), `operacional` (visualiza dados, atualiza checkpoints e ações).
- **Permissões Organizacionais**: Usuários não-admin têm restrições baseadas em Regiões, Sub-regiões, Soluções, Linhas de Serviço e Serviços, gerenciadas via árvores de seleção (`RegionTreePicker`, `PermissionTreePicker`). As permissões são filtradas no backend para todas as listagens de dados.

### Funcionalidades
- **Filtros Globais**: Região, sub-região, linha de serviço e trimestre, gerenciados via `FiltersProvider`.
- **Formatação**: Números e datas no padrão brasileiro (ABNT) e fuso horário `America/Sao_Paulo`.
- **Checkpoints**: Gerados automaticamente ao criar um KR com base na frequência e atualizam o progresso do KR pai.
- **Validação Hierárquica de Datas**: KRs dentro do período do objetivo pai; ações dentro do período do KR pai.
- **Performance**: Code-splitting com `React.lazy`, cache LRU server-side para lookups, e lazy-loading de bibliotecas grandes como `recharts`.
- **Qualidade de Código**: ESLint, Prettier, Vitest/Supertest para testes, Husky + lint-staged para hooks de pre-commit, e CI automatizado.

## External Dependencies
- **PostgreSQL**: Primary database for all application data and session storage.
- **Passport.js**: Authentication middleware.
- **Express.js**: Web framework for the backend.
- **React**: Frontend library.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Shadcn/ui (Radix UI)**: UI component library.
- **TanStack Query**: Server state management.
- **Wouter**: Frontend routing.
- **React Hook Form**: Form management.
- **Zod**: Schema validation.
- **Drizzle ORM**: TypeScript ORM.
- **Pino**: Logging library.
- **Prometheus**: Metrics collection.
- **date-fns-tz**: Date and time utilities with timezone support.