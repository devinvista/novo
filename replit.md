# replit.md

## Overview
This is a full-stack OKR (Objectives and Key Results) management system designed to track organizational objectives, key results, actions, and checkpoints across various regions and service lines. Built with React, Express.js, and MySQL, it offers role-based access control, real-time progress tracking, and extensive reporting. The system's vision is to provide a comprehensive and intuitive platform for strategic management, enhancing organizational alignment and performance.

## User Preferences
Preferred communication style: Simple, everyday language.
Project language: Portuguese Brazil (Português brasileiro) - All interface, documentation, and text converted to Brazilian Portuguese.

## Recent Changes (July 31, 2025)
✓ **Project Migration Completed**: Successfully migrated OKR system from Replit Agent to standard Replit environment
✓ **CSS Optimization**: Removed z-index rules for badges that were causing visual layering issues
✓ **UI Bug Fix**: Fixed dropdown menu positioning in objectives table by adding proper relative positioning and container structure
✓ **Enhanced Key Results Interface**: Added dynamic badges showing action counts and checkpoint counts for each key result
  - Actions button shows "Criar Ações" when no actions exist, "Ações" with count badge when actions present
  - Checkpoints button shows badge with "completed/total" format (e.g., "3/12")
  - Real-time data fetching with optimized API calls for counts
  - Navigation buttons automatically apply key result filter when directing to Actions or Checkpoints pages
✓ **Checkpoint Timeline**: Added compact visual timeline to checkpoints page when key result is selected
  - Shows project timeline with start/end dates and progress bar based on time elapsed
  - Visual checkpoint markers (green=completed, amber=overdue, white=pending)
  - Compact statistics display (completed count, time progress, total checkpoints)
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