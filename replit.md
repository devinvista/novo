# replit.md

## Visão Geral
Este é um sistema completo de gerenciamento de OKRs (Objetivos e Resultados-Chave) projetado para acompanhar objetivos organizacionais, resultados-chave, ações e marcos através de várias regiões e linhas de serviço. Construído com React, Express.js e MySQL, oferece controle de acesso baseado em funções, rastreamento de progresso em tempo real e relatórios extensivos. A visão do sistema é fornecer uma plataforma abrangente e intuitiva para gestão estratégica, melhorando o alinhamento e desempenho organizacional.

## Preferências do Usuário
Estilo de comunicação preferido: Linguagem simples e cotidiana.
Idioma do projeto: Português brasileiro - Toda interface, documentação e textos convertidos para português brasileiro.

## Mudanças Recentes (6 de agosto de 2025)
✓ **Migração Completa para Replit**: Migração bem-sucedida do sistema OKR do Replit Agent para o ambiente padrão do Replit
  - **Problema Resolvido**: Dependência `tsx` estava faltando, causando falha na inicialização do servidor
  - **Solução Implementada**: Instalação das dependências necessárias (`tsx`, `@types/multer`)
  - **Servidor Funcionando**: Aplicação rodando corretamente na porta 5000
  - **Monitoramento MySQL**: Sistema de monitoramento de desempenho MySQL ativo e funcional
  - **Configuração de Workflow**: Workflow "Start application" funcionando corretamente
  - **Revisão de Dependências**: Análise completa das dependências utilizadas e necessárias
  - **Documentação Atualizada**: Toda documentação convertida para português brasileiro

## Mudanças Anteriores (5 de agosto de 2025)
✓ **Schema Consolidation Completed**: Successfully consolidated database schema files into single source of truth
  - **Problem Solved**: Had duplicate schema files (mysql-schema.ts and mysql-schema-final.ts) causing confusion and potential inconsistencies
  - **Solution Implemented**: Merged all definitions from mysql-schema-final.ts into mysql-schema.ts as primary schema
  - **File Cleanup**: Removed mysql-schema-final.ts and updated all imports to use unified mysql-schema.ts
  - **Import Updates**: Updated server/mysql-db.ts, shared/schema.ts, and server/mysql-storage-optimized.ts to use consolidated schema
  - **System Verification**: Server restarted successfully and all functionality confirmed working

✓ **Migration Completed**: Successfully migrated project from Replit Agent to standard Replit environment
  - **Package Installation**: All Node.js packages properly installed including tsx and dependencies
  - **Workflow Configuration**: Start application workflow now running correctly on port 5000
  - **Database Connectivity**: MySQL connection verified and working properly
  - **Schema Updates**: Updated shared/mysql-schema.ts to match current database structure with proper MySQL types
  - **Data Cleanup**: Successfully removed all actions and key results as requested by user
  - **Performance Monitoring**: Enhanced MySQL performance monitoring active and functional

## Previous Changes (August 5, 2025)
✓ **Admin Configuration Page Created**: New "Configurações" page added exclusively for admin users
  - **Problem Solved**: System lacked centralized configuration management for master data
  - **Solution Implemented**: Admin-only settings page with complete CRUD operations for strategic indicators, regions/sub-regions, and solutions/service lines/services
  - **Security**: Admin role verification prevents unauthorized access to configuration features
  - **Backend API**: New admin endpoints with proper validation and dependency checking
  - **Storage Methods**: Extended MySQLStorageOptimized with full CRUD methods for configuration entities
  - **User Experience**: Tabbed interface with organized sections for different configuration types

## Previous Changes (August 1, 2025)
✓ **Action Plan Tab Created**: New "Plano de Ação" tab added to Reports page following user's specific model
  - **Problem Solved**: Actions were not loading correctly due to incorrect relationship mapping
  - **Solution Implemented**: Fixed action filtering to work through key results (actions → key results → objectives)
  - **Strategic Indicators Display**: Enhanced to show actual strategic indicators associated with key results
  - **Error Handling**: Added robust parsing for strategicIndicatorIds field (handles both array and JSON string formats)
  - **Table Structure**: Organized by objectives with separate sections for key results and actions as per user model
  - **Real Data Integration**: All data comes from actual OKR system with proper Brazilian formatting

## Previous Changes (July 31, 2025)
✓ **Project Migration Completed**: Successfully migrated OKR system from Replit Agent to standard Replit environment
✓ **Number Conversion Logic Issue Fixed**: Resolved Brazilian number formatting issue where "2.300" was incorrectly parsed as 2.3 instead of 2300 in checkpoint creation
  - **Problem Identified**: `parseDecimalBR` function was not correctly identifying 3-digit patterns after decimal point as Brazilian thousands separator
  - **Solution Implemented**: Enhanced logic in `convertBRToDatabase` to always treat exactly 3 digits after decimal point as thousands separator (2.300 → 2300)
  - **Architecture Cleanup**: Eliminated duplicity between `convertDatabaseToBR`, `parseDecimalBR`, and `formatNumberBR` functions
  - **Function Consolidation**: Replaced `parseDecimalBR` with `convertBRToDatabase` and centralized all formatting through `formatBrazilianNumber`
  - **Regex Fix**: Corrected regex pattern to prevent "2.300" from being treated as standard database format (2.3) instead of Brazilian thousands separator
✓ **Key Results Progress Synchronization Fixed**: Resolved backend-frontend sync issue where progress values weren't correctly calculated
  - **Problem Identified**: Missing progress field in getKeyResults query in mysql-storage-optimized.ts
  - **Solution Implemented**: Added progress field to SQL select query and enhanced progress calculation logic
  - **Progress Calculation**: Automatic calculation based on currentValue/targetValue ratio with fallback to database values
  - **Brazilian Format Support**: Progress values properly formatted using Brazilian decimal standards
  - **Debug Logging**: Enhanced logging for Key Result progress tracking and synchronization validation
✓ **Brazilian Number Formatting with Intelligent Display**: Complete implementation of smart Brazilian number formatting throughout the system
  - **Intelligent Formatting**: Numbers display as integers when possible (20), decimals only when necessary (20,5 or 20,75)
  - **Backend**: Added conversion functions in server/formatters.ts for parsing Brazilian format (vírgula decimal) to database format (ponto decimal)
  - **API Routes**: All numeric endpoints now convert input from Brazilian format to database format and output with intelligent Brazilian formatting
  - **Frontend**: Updated all components to display numbers with smart Brazilian formatting (vírgula decimal, ponto milhares)
  - **Key Results, Checkpoints, Charts**: All numeric displays now use intelligent Brazilian standard formatting
  - **Input Components**: NumberInputBR component handles Brazilian number input with proper masking and intelligent formatting
  - **User Experience**: Clean number display reduces visual clutter while maintaining precision when needed
✓ **Badge Visual Standardization**: Completely redesigned badge system with consistent visual rules throughout the frontend
  - Removed problematic z-index overrides that were causing layering issues
  - Standardized all badge usage to use proper variant system (success, warning, error, info, secondary)
  - Replaced hardcoded color classes with semantic badge variants for better consistency
  - Updated priority badges to use error/warning/secondary variants instead of custom color classes
  - Updated status badges to use success/info/secondary variants for consistent theming
  - Cleaned up CSS removing duplicate and conflicting badge rules
✓ **UI Bug Fix**: Fixed dropdown menu positioning in objectives table by adding proper relative positioning and container structure
✓ **Enhanced Key Results Interface**: Added dynamic badges showing action counts and checkpoint counts for each key result
  - Actions button shows "Criar Ações" when no actions exist, "Ações" with count badge when actions present
  - Checkpoints button shows badge with "completed/total" format (e.g., "3/12")
  - Real-time data fetching with optimized API calls for counts
  - Navigation buttons automatically apply key result filter when directing to Actions or Checkpoints pages
✓ **Checkpoint Timeline**: Added compact visual timeline to checkpoints page when key result is selected
  - Shows project timeline with standard blue progress bar based on time elapsed
  - Progress badge uses neutral colors for consistent visual hierarchy
  - Visual checkpoint markers (green=completed, red=overdue, white=pending)
  - Compact statistics display with neutral progress percentage
  - Clean, professional design with hover tooltips for checkpoint details
✓ **Development Environment**: Verified all packages installed, workflows running, and database connectivity working properly

## Arquitetura do Sistema

### Arquitetura Frontend
- **Framework**: React 18 com TypeScript
- **Ferramenta de Build**: Vite
- **Framework de UI**: Shadcn/ui (baseado em Radix UI)
- **Estilização**: Tailwind CSS com tokens de design customizados
- **Gerenciamento de Estado**: TanStack Query (React Query) para estado do servidor
- **Roteamento**: Wouter
- **Manipulação de Formulários**: React Hook Form com validação Zod
- **Decisões de UI/UX**:
    - **Esquema de Cores**: Utiliza uma paleta baseada nas cores institucionais da FIERGS (Azul FIERGS, Verde SESI, Verde IEL, Laranja SENAI, Azul CIERGS) para organização temática e identidade visual.
    - **Design de Componentes**: Navegação lateral responsiva, dashboard com cartões KPI, tabelas de dados com ordenação/filtro/busca, formulários modais para operações CRUD, gráficos de progresso e feeds de atividade.
    - **Idioma**: Todos os elementos da UI estão em português brasileiro, incluindo mensagens, placeholders e rótulos.
    - **Formatação Numérica**: Usa formatação decimal brasileira (vírgula como separador decimal) com conversores do lado cliente e servidor.

### Arquitetura Backend
- **Runtime**: Node.js com Express.js
- **Linguagem**: TypeScript com módulos ES
- **Autenticação**: Passport.js com estratégia local e autenticação baseada em sessão (sessão armazenada no MySQL). Módulo crypto do Node.js para hash de senha (scrypt).
- **Funcionalidades Principais**:
    - **Sistema de Autenticação**: Baseado em sessão com hash seguro de senha, controle de acesso baseado em funções (admin, gestor, operacional), rotas protegidas.
    - **Gerenciamento OKR**: Objetivos, Resultados-Chave (com indicadores estratégicos), Ações (com prioridade e status) e Marcos (atualizações de progresso).
    - **Estrutura Organizacional**: Suporta Soluções, Linhas de Serviço, Serviços, Regiões (10 predefinidas) e Sub-regiões (21 específicas).
    - **Fluxo de Dados**: Requisições API autenticadas, middleware Express para manipulação, Drizzle ORM para consultas de banco de dados type-safe e React Query para cache.
    - **Controle de Acesso Baseado em Funções**: Permissões granulares baseadas em funções de usuário (admin, gestor, operacional) e atribuições regionais/hierárquicas.
    - **Gerenciamento de Períodos Trimestrais**: Filtragem automática baseada em data e relatórios através dos trimestres.
    - **Validação de Data**: Validação abrangente garantindo que datas de Resultados-Chave estejam dentro dos intervalos de Objetivos e datas de vencimento de Ações sejam antes das datas de fim dos Resultados-Chave.
    - **Gerenciamento de Usuários**: Aprovação hierárquica de usuários, herança automática de permissões de usuários gestor para operacional e exclusão segura de usuários com funcionalidade em cascata.

### Arquitetura de Banco de Dados
- **Banco de Dados**: MySQL (srv1661.hstgr.io:3306)
- **ORM**: Drizzle ORM com consultas type-safe
- **Gerenciamento de Schema**: Schema MySQL com relacionamentos e restrições adequados, usando snake_case para a maioria dos campos e camelCase para campos JSON conforme estrutura do banco de dados.
- **Conexão**: Pool de conexão MySQL2 com autenticação segura.
- **Otimização**: Cache LRU implementado para consultas frequentes, otimizador de pool de conexões e monitoramento de consultas.

## Dependências Externas

### Dependências Principais (Produção)
**Backend/Servidor:**
- **express**: Framework web para Node.js - servidor HTTP principal
- **drizzle-orm**: ORM type-safe para banco de dados MySQL
- **drizzle-zod**: Integração Drizzle com Zod para validação
- **mysql2**: Cliente MySQL para Node.js - conexão com banco de dados
- **passport**: Middleware de autenticação com estratégia local
- **passport-local**: Estratégia de autenticação local para Passport
- **express-session**: Gerenciamento de sessões HTTP
- **express-mysql-session**: Armazenamento de sessões no MySQL
- **memorystore**: Store de memória para sessões (fallback)
- **zod**: Validação de schema e runtime type checking
- **zod-validation-error**: Formatação de erros de validação Zod
- **multer**: Middleware para upload de arquivos
- **xlsx**: Leitura e escrita de arquivos Excel
- **lru-cache**: Cache LRU para otimização de performance
- **ws**: WebSocket para comunicação em tempo real

**Frontend/Cliente:**
- **react**: Biblioteca JavaScript para interfaces de usuário
- **react-dom**: Renderização DOM para React
- **@tanstack/react-query**: Gerenciamento de estado do servidor
- **react-hook-form**: Manipulação e validação de formulários
- **@hookform/resolvers**: Resolvers para React Hook Form (Zod)
- **wouter**: Roteador minimalista para React
- **date-fns**: Biblioteca de utilitários para datas
- **clsx**: Utilitário para classes CSS condicionais
- **tailwind-merge**: Merge de classes Tailwind CSS
- **class-variance-authority**: Gerenciamento de variantes de componentes

**UI/Componentes:**
- **@radix-ui/*****: Conjunto completo de primitivos UI acessíveis (20+ componentes)
- **lucide-react**: Biblioteca de ícones SVG
- **react-icons**: Ícones adicionais (logos de empresas)
- **recharts**: Biblioteca de gráficos e visualização de dados
- **framer-motion**: Animações e transições
- **embla-carousel-react**: Componente de carrossel
- **react-day-picker**: Seletor de datas
- **input-otp**: Componente de entrada OTP
- **vaul**: Drawer/modal responsivo
- **react-resizable-panels**: Painéis redimensionáveis
- **next-themes**: Gerenciamento de temas claro/escuro

### Dependências de Desenvolvimento
- **typescript**: Superset JavaScript com tipagem estática
- **tsx**: Executor TypeScript para desenvolvimento
- **vite**: Build tool moderno e dev server
- **esbuild**: Bundler rápido para produção
- **@vitejs/plugin-react**: Plugin React para Vite
- **drizzle-kit**: CLI para migrações Drizzle ORM
- **tailwindcss**: Framework CSS utility-first
- **autoprefixer**: PostCSS plugin para prefixos CSS
- **postcss**: Processador CSS
- **tailwindcss-animate**: Animações pré-construídas para Tailwind
- **@tailwindcss/typography**: Plugin de tipografia para Tailwind
- **@tailwindcss/vite**: Plugin Vite para Tailwind CSS

**Tipos TypeScript:**
- **@types/express**: Tipos para Express.js
- **@types/express-session**: Tipos para express-session
- **@types/passport**: Tipos para Passport
- **@types/passport-local**: Tipos para passport-local
- **@types/node**: Tipos para Node.js
- **@types/react**: Tipos para React
- **@types/react-dom**: Tipos para React DOM
- **@types/multer**: Tipos para Multer
- **@types/ws**: Tipos para WebSocket

**Plugins Replit:**
- **@replit/vite-plugin-cartographer**: Plugin de mapeamento para Replit
- **@replit/vite-plugin-runtime-error-modal**: Modal de erros em runtime

### Dependências Opcionais
- **bufferutil**: Otimização de performance para WebSocket

### Dependências Não Utilizadas (Para Remoção)
Baseado na análise do código, as seguintes dependências podem ser removidas:
- **better-sqlite3**: Usado apenas em arquivos de migração legacy
- **postgres**: Não utilizado na implementação atual (MySQL apenas)
- **tw-animate-css**: Funcionalidade sobreposta com tailwindcss-animate
- **@jridgewell/trace-mapping**: Dependência transitiva desnecessária