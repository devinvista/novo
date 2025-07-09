# replit.md

## Overview

This is a full-stack OKR (Objectives and Key Results) management system built with React, Express.js, and PostgreSQL. The application provides comprehensive functionality for managing organizational objectives, key results, actions, and checkpoints across different regions and service lines. It features role-based access control, real-time progress tracking, and comprehensive reporting capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL sessions via connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt hashing

### Database Architecture
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: WebSocket-enabled connection pooling

## Key Components

### Authentication System
- Session-based authentication with secure password hashing
- Role-based access control (admin, gestor, operacional)
- Protected routes with automatic redirection
- User registration and login flows

### OKR Management Structure
- **Objectives**: Top-level goals with ownership and regional assignment
- **Key Results**: Measurable outcomes linked to objectives with strategic indicators
- **Actions**: Specific tasks to achieve key results with priority and status tracking
- **Checkpoints**: Regular progress updates with actual vs. target values

### Organizational Structure
- **Solutions**: Top-level business solutions (Educação, Saúde)
- **Service Lines**: Business line categories under each solution
- **Services**: Specific services under each service line
- **Regions**: 10 predefined geographical regions
- **Sub-regions**: 21 specific sub-regional divisions
- **Strategic Indicators**: 7 predefined performance metrics

### User Interface Components
- Responsive sidebar navigation with role-based menu items
- Dashboard with KPI cards and progress visualization
- Data tables with sorting, filtering, and search capabilities
- Modal forms for CRUD operations
- Progress charts and activity feeds

## Data Flow

### Client-Server Communication
1. Client makes authenticated API requests via fetch with credentials
2. Express middleware handles authentication, logging, and error handling
3. Drizzle ORM processes database queries with type safety
4. Responses are cached by React Query for optimal performance

### Authentication Flow
1. User submits credentials to `/api/login`
2. Passport validates against database with password verification
3. Session created and stored in PostgreSQL
4. Client receives user data and updates auth context
5. Protected routes check authentication status

### Data Management Flow
1. User actions trigger React Query mutations
2. Optimistic updates provide immediate UI feedback
3. API requests validate data with Zod schemas
4. Database operations maintain referential integrity
5. Real-time cache invalidation ensures data consistency

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **express-session**: Session management
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **recharts**: Data visualization charts
- **class-variance-authority**: Component variant management

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **esbuild**: Production bundling
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend development
- TSX for running TypeScript backend with hot reload
- Development database provisioned through Neon
- Environment variables for database connection and session secrets

### Production Build
1. Frontend built with Vite to static assets in `dist/public`
2. Backend bundled with esbuild for Node.js production
3. Database migrations applied via Drizzle Kit
4. Session store configured for production PostgreSQL instance

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required)
- `NODE_ENV`: Environment mode (development/production)

### File Structure
- `/client`: React frontend application
- `/server`: Express.js backend application
- `/shared`: Shared TypeScript schemas and types
- `/migrations`: Database migration files

## Changelog

```
Changelog:
- July 01, 2025. Initial setup
- July 02, 2025. Migration from Replit Agent to Replit environment completed
  - Added PostgreSQL database connection
  - Fixed authentication with session secret
  - Implemented hierarchical Solution > Service Line > Service structure
  - Created and populated solutions, service lines, and services tables
  - Updated API endpoints to support new hierarchy
  - Updated objective form with cascading selects for the new structure
- July 03, 2025. Comprehensive OKR system improvements and visual enhancements implemented
  - Fixed objectives API error by removing serviceLine references (not in schema)
  - Updated regions and sub-regions with new organizational structure
  - Fixed KPI dashboard values to return proper numbers instead of strings
  - Updated seed files to reflect new region/sub-region hierarchy
  - 11 regions with 21 sub-regions matching user requirements
  - Migration from Replit Agent to Replit environment completed successfully
  - Created comprehensive key results form with objective association
  - Fixed key results page buttons to properly create and edit KRs
  - Implemented proper TypeScript handling for form components
  - Removed initial value field from key results form (simplified workflow)
  - Added start and end date fields to key results (required fields)
  - Implemented status functionality with automatic updates based on dates and progress
  - Status values: pending, active, completed, delayed, cancelled
  - Updated key results display to show dates and proper status badges
  - Enhanced actions and checkpoints integration with key results
  - Created comprehensive ActionForm component for managing actions
  - Added filtering functionality to actions page by key result
  - Added edit functionality to actions with proper form handling
  - Enhanced checkpoints page with key result filtering
  - Improved actions display with proper badges and responsible user info
  - Fixed TypeScript issues in action form handling
  - **MAJOR UPDATE**: Adjusted all entity relationships per user specifications:
    - Strategic indicators now associate ONLY with Key Results
    - Service lines now associate ONLY with Key Results  
    - Services now associate ONLY with Key Results (optional, based on service line selection)
    - Regions now associate ONLY with Objectives
    - Sub-regions now associate ONLY with Objectives
  - Updated database schema with new serviceLineId and serviceId fields for Key Results
  - Modified storage layer to include new relationships in queries
  - Enhanced Key Results form with cascading service line and service selectors
  - Implemented advanced progress visualization component with multiple chart types
  - Added comprehensive dashboard with bar charts, pie charts, line charts, and trend analysis
  - Created four visualization modes: overview, objectives, key results, and trends
  - Implemented real-time progress tracking with detailed status indicators
  - Enhanced visual design with color-coded status badges and progress bars
  - All filtering systems updated to match new relationship definitions
- July 07, 2025. Replit Agent to Replit environment migration completed and multi-selection features implemented
  - Successfully migrated from Replit Agent to Replit environment
  - Fixed database connection and authentication issues
  - Resolved action creation validation errors with proper schema defaults
  - **STRATEGIC INDICATORS UPDATE**: Updated strategic indicators list per user requirements:
    - Sustentabilidade Operacional
    - Receita de Serviços
    - Matrículas em Educação
    - Indústrias Atendidas em Saúde
    - Trabalhadores da Indústria Atendidos em Saúde
    - Matrículas Presenciais com Mais de 4 Horas
    - Custo Hora Aluno
  - **MULTI-SELECTION IMPLEMENTATION**: Enhanced Key Results to support multiple strategic indicators
    - Changed strategicIndicatorId to strategicIndicatorIds array field
    - Updated database schema to support integer arrays
    - Migrated existing data to new array format
    - Implemented checkbox-based multi-selection interface in Key Results form
    - Updated storage layer to handle array relationships properly
    - Enhanced form validation to support multiple strategic indicator selection
- July 09, 2025. Replit Agent to Replit environment migration successfully completed
  - **MIGRATION COMPLETED**: Successfully migrated from Replit Agent to Replit environment
  - **DATABASE FIXES**: Resolved database schema inconsistencies and field mismatches
    - Fixed objectives table by making 'period' and 'service_line_id' nullable
    - Updated key_results table structure to match application schema
    - Added missing fields: strategic_indicator_ids, service_line_id, service_id, start_date, end_date
    - Fixed users table field references in storage queries
  - **API ENDPOINTS FIXED**: Resolved 500 errors in objectives, key-results, and actions endpoints
    - Fixed createObjective method with proper error handling
    - Updated storage layer queries to match actual database structure
    - Resolved authentication and session management issues
  - **KEY RESULTS MULTI-INDICATOR SUPPORT**: Successfully implemented multi-indicator relationships
    - KRs now properly linked to 1 objective and can be related to 1 or more strategic indicators
    - Fixed strategic_indicator_ids array field to properly store multiple indicator IDs
    - Updated validation schema to handle multi-selection of strategic indicators
    - Tested and verified multi-indicator functionality working correctly
  - **KEY RESULTS LOADING FIX**: Resolved issue where KRs were not appearing on the page
    - Fixed field mapping issue in getKeyResults method (actualValue vs currentValue)
    - KRs now load correctly with proper strategic indicator relationships
    - All key results display properly with their associated objectives and indicators
  - **CHECKPOINT SYSTEM FULLY FUNCTIONAL**: Fixed checkpoint generation and display
    - Resolved date handling issue between PostgreSQL date type and Drizzle ORM mapping
    - Implemented direct database query for reliable date retrieval
    - Checkpoint generation now works for all frequencies (weekly, monthly, quarterly)
    - Tested: 13 weekly checkpoints and 3 monthly checkpoints generated successfully
    - Proportional target values calculated correctly (cumulative progress tracking)
    - Checkpoints now visible in the application interface
  - **TESTING VERIFIED**: Application now fully functional
    - Objective creation working successfully (tested with API calls)
    - Key Results creation with multiple strategic indicators working
    - Checkpoint generation and regeneration working for all frequencies
    - All major endpoints returning correct responses
    - Authentication and session management operational
    - Dashboard KPIs loading properly
  - **SECURITY MAINTAINED**: Client/server separation preserved with secure practices
  - **ERROR HANDLING**: Implemented robust error handling with proper logging
- July 08, 2025. Final Replit Agent to Replit environment migration completed and checkpoint system enhancement
  - **MIGRATION COMPLETED**: Successfully completed full migration from Replit Agent to Replit environment
  - **FORM VALIDATION FIXES**: Resolved key results and actions creation validation errors
    - Fixed unit field validation to accept nullable/optional values
    - Enhanced date handling in key results schema with proper transformations
    - Improved client-side form data preprocessing for null value handling
    - Added comprehensive server-side data validation and cleanup
    - Fixed strategic indicators multi-selection implementation
  - **CHECKPOINT SYSTEM ENHANCEMENT**: Implemented comprehensive checkpoint management
    - Fixed key results creation error by correcting generateCheckpoints method call
    - Enhanced automatic checkpoint generation with proportional target distribution
    - Implemented cumulative progress tracking based on frequency (weekly, monthly, quarterly)
    - Created enhanced checkpoints page with filtering and progress visualization
    - Added checkpoint update functionality with status tracking and progress indicators
    - Implemented comprehensive checkpoint API endpoints for updates and regeneration
  - **STRATEGIC INDICATORS UPDATE**: Updated indicators per user requirements:
    - Sustentabilidade Operacional
    - Receita de Serviços  
    - Matrículas em Educação
    - Indústrias Atendidas em Saúde
    - Trabalhadores da Indústria Atendidos em Saúde
    - Matrículas Presenciais com Mais de 4 Horas
    - Custo Hora Aluno
  - **ANIMATED CHECKPOINT SYSTEM**: Implemented engaging animated progress rings
    - Created AnimatedProgressRing component with smooth progress animations
    - Added motivational micro-interactions and hover effects
    - Implemented celebration particles for completed checkpoints
    - Created CheckpointProgressGrid for visual checkpoint management
    - Added grid and list view modes for checkpoint display
    - Enhanced checkpoint editing with modal dialogs
    - Implemented performance insights and momentum tracking
    - Added responsive design for different screen sizes
  - **FIERGS VISUAL IDENTITY**: Implemented complete FIERGS color palette
    - Updated CSS variables to use official FIERGS colors
    - Azul FIERGS (#1a4b9f) as primary color
    - Azul CIERGS (#0091d6) for accent elements
    - Verde IEL (#00b39c) for success/completion states
    - Laranja SENAI (#ef5e31) for warning/attention states
    - Verde SESI (#4db74f) for positive metrics and growth
    - Applied FIERGS colors to progress rings, charts, and status indicators
    - Created utility classes for FIERGS branded components
  - **SECURITY ENHANCEMENTS**: Maintained client/server separation with secure authentication
  - **ERROR HANDLING**: Implemented robust error handling with detailed logging
  - **TESTING**: Verified application functionality with working server on port 5000
  - Migration completed successfully - application is fully operational in Replit environment
  - Fixed PostgreSQL database provisioning and connection setup
  - Applied database migrations and seeded initial data
  - Resolved Key Results form validation issue with unit field (made optional)
  - Fixed server-side data processing to handle null/empty unit values
  - All core functionality tested and working: authentication, objectives, key results, actions, checkpoints
  - Project now fully operational in Replit environment with proper security practices
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```