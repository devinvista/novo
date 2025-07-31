# replit.md

## Overview
This is a full-stack OKR (Objectives and Key Results) management system designed to track organizational objectives, key results, actions, and checkpoints across various regions and service lines. Built with React, Express.js, and MySQL, it offers role-based access control, real-time progress tracking, and comprehensive reporting capabilities. The business vision is to provide a robust tool for efficient OKR management, enhancing strategic planning and execution for organizations.

## User Preferences
Preferred communication style: Simple, everyday language.
Project language: Portuguese Brazil (Português brasileiro) - All interface, documentation, and text converted to Brazilian Portuguese.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Responsive design, intuitive navigation, clear visual feedback. The system uses a color palette based on FIERGS institutional colors: Azul FIERGS (#1a4b9f), Verde SESI (#4db74f), Verde IEL (#00b39c), Laranja SENAI (#ef5e31), and Azul CIERGS (#0091d6), applied consistently across cards, icons, badges, buttons, and progress indicators for a professional, branded look. Number formatting adheres to Brazilian ABNT standards (comma as decimal separator).

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js (local strategy, session-based auth) using Node.js crypto module for scrypt hashing. Role-based access control (admin, gestor, operacional) with hierarchical permissions and multi-regional support.
- **Session Storage**: MySQL
- **Core Functionality**:
    - **OKR Management**: Objectives, Key Results (with multi-indicator and service line associations), Actions, Checkpoints (automatic generation, cumulative targets, progress tracking).
    - **Organizational Structure**: Supports Solutions, Service Lines, Services, Regions (11 FIERGS regions), Sub-regions (21 specific divisions), and Strategic Indicators (7 predefined metrics).
    - **Data Flow**: Client-server communication via authenticated API requests; Express middleware for auth, logging, error handling; Drizzle ORM for type-safe database queries. React Query handles client-side caching and invalidation for performance.
    - **Quarterly Period Management**: Automatic date-based filtering and display of OKRs by quarter (e.g., 2025-T1), with Portuguese naming conventions.

### Database Architecture
- **Database**: MySQL (srv1661.hstgr.io:3306)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: MySQL schema with proper relationships and constraints (snake_case for most fields, camelCase for JSON fields)
- **Connection**: MySQL2 connection pool with secure authentication. Optimized with LRU cache and query monitoring.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection (Note: MySQL is the primary, this might be a remnant or for specific non-primary cases)
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **express-session**: Session management
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **recharts**: Data visualization charts
- **class-variance-authority**: Component variant management
- **mysql2**: MySQL client for Node.js