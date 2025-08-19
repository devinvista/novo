-- Add code fields to configuration tables
-- Migration: Add code fields to solutions, service_lines, services, and strategic_indicators

-- Add code field to solutions table
ALTER TABLE solutions ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT '' AFTER name;

-- Add code field to service_lines table  
ALTER TABLE service_lines ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT '' AFTER name;

-- Add code field to services table
ALTER TABLE services ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT '' AFTER name;

-- Add code field and unit field to strategic_indicators table
ALTER TABLE strategic_indicators ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT '' AFTER name;
ALTER TABLE strategic_indicators ADD COLUMN unit VARCHAR(50) AFTER description;

-- Update existing records with default codes (based on name)
UPDATE solutions SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 10)) WHERE code = '';
UPDATE service_lines SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 10)) WHERE code = '';
UPDATE services SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 10)) WHERE code = '';
UPDATE strategic_indicators SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 10)) WHERE code = '';

-- Add unique constraints after populating default values
ALTER TABLE solutions ADD CONSTRAINT uk_solutions_code UNIQUE (code);
ALTER TABLE service_lines ADD CONSTRAINT uk_service_lines_code UNIQUE (code);
ALTER TABLE services ADD CONSTRAINT uk_services_code UNIQUE (code);
ALTER TABLE strategic_indicators ADD CONSTRAINT uk_strategic_indicators_code UNIQUE (code);