# replit.md

## Overview
This is a full-stack OKR (Objectives and Key Results) management system designed to track organizational objectives, key results, actions, and checkpoints across various regions and service lines. Built with React, Express.js, and MySQL, it offers role-based access control, real-time progress tracking, and extensive reporting. The system's vision is to provide a comprehensive and intuitive platform for strategic management, enhancing organizational alignment and performance.

## User Preferences
Preferred communication style: Simple, everyday language.
Project language: Portuguese Brazil (Português brasileiro) - All interface, documentation, and text converted to Brazilian Portuguese.

## Recent Changes (July 31, 2025)
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

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**:
    - **Color Scheme**: Utilizes a palette based on FIERGS institutional colors (Azul FIERGS, Verde SESI, Verde IEL, Laranja SENAI, Azul CIERGS) for thematic organization and visual identity.
    - **Component Design**: Responsive sidebar navigation, dashboard with KPI cards, data tables with sorting/filtering/search, modal forms for CRUD operations, progress charts, and activity feeds.
    - **Language**: All UI elements are in Portuguese Brazil, including messages, placeholders, and labels.
    - **Numeric Formatting**: Uses Brazilian decimal formatting (comma as decimal separator) with client-side and server-side converters.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based authentication (session stored in MySQL). Node.js crypto module for password hashing (scrypt).
- **Core Functionality**:
    - **Authentication System**: Session-based with secure password hashing, role-based access control (admin, gestor, operacional), protected routes.
    - **OKR Management**: Objectives, Key Results (with strategic indicators), Actions (with priority and status), and Checkpoints (progress updates).
    - **Organizational Structure**: Supports Solutions, Service Lines, Services, Regions (10 predefined), and Sub-regions (21 specific).
    - **Data Flow**: Authenticated API requests, Express middleware for handling, Drizzle ORM for type-safe database queries, and React Query for caching.
    - **Role-Based Access Control**: Granular permissions based on user roles (admin, gestor, operacional) and regional/hierarchical assignments.
    - **Quarterly Period Management**: Automatic date-based filtering and reporting across quarters.
    - **Date Validation**: Comprehensive validation ensuring Key Results dates are within Objective ranges and Action due dates are before Key Result end dates.
    - **User Management**: Hierarchical user approval, automatic inheritance of permissions from gestor to operacional users, and secure user deletion with cascade functionality.

### Database Architecture
- **Database**: MySQL (srv1661.hstgr.io:3306)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: MySQL schema with proper relationships and constraints, using snake_case for most fields and camelCase for JSON fields as per database structure.
- **Connection**: MySQL2 connection pool with secure authentication.
- **Optimization**: Implemented LRU cache for frequent queries, connection pooling optimizer, and query monitoring.

## External Dependencies

### Core Dependencies
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **express-session**: Session management
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **mysql2**: MySQL client for Node.js
- **@neondatabase/serverless**: (Note: While mentioned in `original_replit_md`, the final architecture strictly uses MySQL. This dependency might be vestigial or for previous iterations)

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