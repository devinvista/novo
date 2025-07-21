import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './db';
import * as schema from "@shared/schema";

console.log('Setting up SQLite database...');

// Create tables directly from schema
const createTables = () => {
  console.log('Creating tables...');
  
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');
  
  // Create all tables
  sqlite.exec(`
    -- Users table with role-based access and solution/service permissions
    CREATE TABLE IF NOT EXISTS "users" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "username" text NOT NULL UNIQUE,
      "password" text NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "role" text NOT NULL DEFAULT 'operacional',
      "region_id" integer,
      "sub_region_id" integer,
      "gestor_id" integer REFERENCES users(id),
      "solution_ids" text,
      "service_line_ids" text,
      "service_ids" text,
      "approved" integer DEFAULT 0 NOT NULL,
      "approved_at" text,
      "approved_by" integer REFERENCES users(id),
      "active" integer DEFAULT 1 NOT NULL,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );

    -- Regions table
    CREATE TABLE IF NOT EXISTS "regions" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL UNIQUE,
      "code" text NOT NULL UNIQUE
    );

    -- Sub-regions table
    CREATE TABLE IF NOT EXISTS "sub_regions" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "region_id" integer NOT NULL REFERENCES regions(id)
    );

    -- Solutions table
    CREATE TABLE IF NOT EXISTS "solutions" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL UNIQUE,
      "description" text
    );

    -- Service Lines table
    CREATE TABLE IF NOT EXISTS "service_lines" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL,
      "description" text,
      "solution_id" integer NOT NULL REFERENCES solutions(id)
    );

    -- Services table
    CREATE TABLE IF NOT EXISTS "services" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL,
      "description" text,
      "service_line_id" integer NOT NULL REFERENCES service_lines(id)
    );

    -- Strategic Indicators table
    CREATE TABLE IF NOT EXISTS "strategic_indicators" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "name" text NOT NULL UNIQUE,
      "description" text,
      "unit" text
    );

    -- Objectives table
    CREATE TABLE IF NOT EXISTS "objectives" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "title" text NOT NULL,
      "description" text,
      "owner_id" integer NOT NULL REFERENCES users(id),
      "region_id" integer REFERENCES regions(id),
      "sub_region_id" integer REFERENCES sub_regions(id),
      "solution_id" integer REFERENCES solutions(id),
      "service_line_id" integer REFERENCES service_lines(id),
      "status" text DEFAULT 'active' NOT NULL,
      "progress" real DEFAULT 0,
      "period" text,
      "start_date" text NOT NULL,
      "end_date" text NOT NULL,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );

    -- Key Results table
    CREATE TABLE IF NOT EXISTS "key_results" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "objective_id" integer NOT NULL REFERENCES objectives(id),
      "title" text NOT NULL,
      "description" text,
      "target_value" real NOT NULL,
      "current_value" real DEFAULT 0,
      "unit" text,
      "strategic_indicator_id" integer REFERENCES strategic_indicators(id),
      "service_line_id" integer REFERENCES service_lines(id),
      "service_id" integer REFERENCES services(id),
      "start_date" text NOT NULL,
      "end_date" text NOT NULL,
      "frequency" text NOT NULL,
      "status" text DEFAULT 'active' NOT NULL,
      "progress" real DEFAULT 0,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );

    -- Actions table
    CREATE TABLE IF NOT EXISTS "actions" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "key_result_id" integer NOT NULL REFERENCES key_results(id),
      "title" text NOT NULL,
      "description" text,
      "number" integer NOT NULL,
      "strategic_indicator_id" integer REFERENCES strategic_indicators(id),
      "responsible_id" integer REFERENCES users(id),
      "due_date" text,
      "status" text DEFAULT 'pending' NOT NULL,
      "priority" text DEFAULT 'medium' NOT NULL,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );

    -- Checkpoints table  
    CREATE TABLE IF NOT EXISTS "checkpoints" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "key_result_id" integer NOT NULL REFERENCES key_results(id),
      "period" text NOT NULL,
      "target_value" real NOT NULL,
      "actual_value" real DEFAULT 0,
      "status" text DEFAULT 'pending' NOT NULL,
      "notes" text,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );

    -- Activities table
    CREATE TABLE IF NOT EXISTS "activities" (
      "id" integer PRIMARY KEY AUTOINCREMENT,
      "user_id" integer NOT NULL REFERENCES users(id),
      "action" text NOT NULL,
      "details" text,
      "created_at" text DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✓ Tables created successfully');
};

createTables();
console.log('✅ SQLite database setup completed');