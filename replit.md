# replit.md

## Overview
This is a comprehensive OKR (Objectives and Key Results) management system designed to track organizational objectives, key results, actions, and milestones across various regions and service lines. Built with React, Express.js, and MySQL, it offers role-based access control, real-time progress tracking, and extensive reporting. The system's vision is to provide a comprehensive and intuitive platform for strategic management, improving organizational alignment and performance.

## User Preferences
Estilo de comunicação preferido: Linguagem simples e cotidiana.
Idioma do projeto: Português brasileiro - Toda interface, documentação e textos convertidos para português brasileiro.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built with Vite.
- **UI Framework**: Shadcn/ui (based on Radix UI) with Tailwind CSS for styling and custom design tokens.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter.
- **Form Handling**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - **Color Scheme**: Uses a palette based on FIERGS institutional colors (FIERGS Blue, SESI Green, IEL Green, SENAI Orange, CIERGS Blue) for thematic organization and visual identity.
    - **Component Design**: Responsive sidebar navigation, KPI card dashboards, data tables with sorting/filtering/searching, modal forms for CRUD operations, progress charts, and activity feeds.
    - **Language**: All UI elements are in Brazilian Portuguese, including messages, placeholders, and labels.
    - **Number Formatting**: Uses Brazilian decimal formatting (comma as decimal separator) with client-side and server-side converters.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Authentication**: Passport.js with local strategy and session-based authentication (session stored in MySQL). Node.js crypto module for password hashing (scrypt).
- **Core Functionality**:
    - **Authentication System**: Session-based with secure password hashing, role-based access control (admin, manager, operational), protected routes.
    - **OKR Management**: Objectives, Key Results (with strategic indicators), Actions (with priority and status), and Milestones (progress updates).
    - **Organizational Structure**: Supports Solutions, Service Lines, Services, Regions (10 predefined), and Sub-regions (21 specific).
    - **Data Flow**: Authenticated API requests, Express middleware, Drizzle ORM for type-safe database queries, and React Query for caching.
    - **Role-Based Access Control**: Granular permissions based on user roles (admin, manager, operational) and regional/hierarchical assignments.
    - **Quarterly Period Management**: Automatic date-based filtering and reporting across quarters.
    - **Date Validation**: Comprehensive validation ensuring Key Result dates are within Objective ranges and Action due dates are before Key Result end dates.
    - **User Management**: Hierarchical user approval, automatic inheritance of permissions from manager to operational users, and secure user deletion with cascading functionality.

### Database Architecture
- **Database**: MySQL (srv1661.hstgr.io:3306).
- **ORM**: Drizzle ORM for type-safe queries.
- **Schema Management**: MySQL schema with appropriate relationships and constraints, using snake_case for most fields and camelCase for JSON fields.
- **Connection**: MySQL2 connection pool with secure authentication.
- **Optimization**: LRU cache implemented for frequent queries, connection pool optimizer, and query monitoring.

## External Dependencies

### Backend/Server
- **express**: Web framework for Node.js.
- **drizzle-orm**: Type-safe ORM for MySQL.
- **drizzle-zod**: Drizzle integration with Zod for validation.
- **mysql2**: MySQL client for Node.js.
- **passport**: Authentication middleware with local strategy.
- **express-session**: HTTP session management.
- **express-mysql-session**: MySQL session store.
- **zod**: Schema validation and runtime type checking.
- **multer**: Middleware for file uploads.
- **xlsx**: Reading and writing Excel files.
- **lru-cache**: LRU cache for performance optimization.
- **ws**: WebSocket for real-time communication.

### Frontend/Client
- **react**: JavaScript library for user interfaces.
- **@tanstack/react-query**: Server state management.
- **react-hook-form**: Form handling and validation.
- **wouter**: Minimalist router for React.
- **date-fns**: Date utility library.
- **clsx**: Utility for conditional CSS classes.
- **tailwind-merge**: Merging Tailwind CSS classes.
- **class-variance-authority**: Component variant management.
- **@radix-ui/*****: Accessible UI primitives.
- **lucide-react**: SVG icon library.
- **react-icons**: Additional icons.
- **recharts**: Charting and data visualization library.
- **framer-motion**: Animations and transitions.
- **embla-carousel-react**: Carousel component.
- **react-day-picker**: Date picker.
- **input-otp**: OTP input component.
- **vaul**: Responsive drawer/modal.
- **react-resizable-panels**: Resizable panels.
- **next-themes**: Light/dark theme management.