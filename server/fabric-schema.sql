-- Microsoft Fabric SQL Server Schema for OKR Management System
-- This script creates all necessary tables and relationships

-- Drop existing tables if they exist (in correct order to avoid foreign key constraints)
IF OBJECT_ID('dbo.activities', 'U') IS NOT NULL DROP TABLE dbo.activities;
IF OBJECT_ID('dbo.checkpoints', 'U') IS NOT NULL DROP TABLE dbo.checkpoints;
IF OBJECT_ID('dbo.actions', 'U') IS NOT NULL DROP TABLE dbo.actions;
IF OBJECT_ID('dbo.key_results', 'U') IS NOT NULL DROP TABLE dbo.key_results;
IF OBJECT_ID('dbo.objectives', 'U') IS NOT NULL DROP TABLE dbo.objectives;
IF OBJECT_ID('dbo.services', 'U') IS NOT NULL DROP TABLE dbo.services;
IF OBJECT_ID('dbo.service_lines', 'U') IS NOT NULL DROP TABLE dbo.service_lines;
IF OBJECT_ID('dbo.solutions', 'U') IS NOT NULL DROP TABLE dbo.solutions;
IF OBJECT_ID('dbo.sub_regions', 'U') IS NOT NULL DROP TABLE dbo.sub_regions;
IF OBJECT_ID('dbo.regions', 'U') IS NOT NULL DROP TABLE dbo.regions;
IF OBJECT_ID('dbo.strategic_indicators', 'U') IS NOT NULL DROP TABLE dbo.strategic_indicators;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;

-- Create Users table
CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    name NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'operacional' NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Create Regions table
CREATE TABLE dbo.regions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(10) NOT NULL UNIQUE,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Create Sub-regions table
CREATE TABLE dbo.sub_regions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(10) NOT NULL UNIQUE,
    description NVARCHAR(500),
    region_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (region_id) REFERENCES dbo.regions(id)
);

-- Create Strategic Indicators table
CREATE TABLE dbo.strategic_indicators (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(500),
    category NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Create Solutions table
CREATE TABLE dbo.solutions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Create Service Lines table
CREATE TABLE dbo.service_lines (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    solution_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (solution_id) REFERENCES dbo.solutions(id)
);

-- Create Services table
CREATE TABLE dbo.services (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    service_line_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (service_line_id) REFERENCES dbo.service_lines(id)
);

-- Create Objectives table
CREATE TABLE dbo.objectives (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(300) NOT NULL,
    description NVARCHAR(1000),
    owner_id INT NOT NULL,
    region_id INT,
    sub_region_id INT,
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NOT NULL,
    status NVARCHAR(20) DEFAULT 'active' NOT NULL,
    progress DECIMAL(5,2) DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (owner_id) REFERENCES dbo.users(id),
    FOREIGN KEY (region_id) REFERENCES dbo.regions(id),
    FOREIGN KEY (sub_region_id) REFERENCES dbo.sub_regions(id)
);

-- Create Key Results table
CREATE TABLE dbo.key_results (
    id INT IDENTITY(1,1) PRIMARY KEY,
    objective_id INT NOT NULL,
    title NVARCHAR(300) NOT NULL,
    description NVARCHAR(1000),
    number INT NOT NULL,
    service_line_id INT,
    service_id INT,
    initial_value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    unit NVARCHAR(50),
    frequency NVARCHAR(20) NOT NULL,
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NOT NULL,
    progress DECIMAL(5,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'active' NOT NULL,
    strategic_indicator_ids NVARCHAR(MAX), -- JSON array of strategic indicator IDs
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (objective_id) REFERENCES dbo.objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (service_line_id) REFERENCES dbo.service_lines(id),
    FOREIGN KEY (service_id) REFERENCES dbo.services(id)
);

-- Create Actions table
CREATE TABLE dbo.actions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    key_result_id INT NOT NULL,
    title NVARCHAR(300) NOT NULL,
    description NVARCHAR(1000),
    responsible_id INT,
    priority NVARCHAR(20) DEFAULT 'medium' NOT NULL,
    status NVARCHAR(20) DEFAULT 'pending' NOT NULL,
    due_date DATETIME2,
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (key_result_id) REFERENCES dbo.key_results(id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_id) REFERENCES dbo.users(id)
);

-- Create Checkpoints table
CREATE TABLE dbo.checkpoints (
    id INT IDENTITY(1,1) PRIMARY KEY,
    key_result_id INT NOT NULL,
    period NVARCHAR(50) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    actual_value DECIMAL(15,2),
    progress DECIMAL(5,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'pendente' NOT NULL,
    notes NVARCHAR(1000),
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (key_result_id) REFERENCES dbo.key_results(id) ON DELETE CASCADE
);

-- Create Activities table (for audit logging)
CREATE TABLE dbo.activities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NOT NULL,
    old_values NVARCHAR(MAX), -- JSON data
    new_values NVARCHAR(MAX), -- JSON data
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES dbo.users(id)
);

-- Create indexes for better performance
CREATE INDEX IX_objectives_owner_id ON dbo.objectives(owner_id);
CREATE INDEX IX_objectives_region_id ON dbo.objectives(region_id);
CREATE INDEX IX_objectives_sub_region_id ON dbo.objectives(sub_region_id);
CREATE INDEX IX_key_results_objective_id ON dbo.key_results(objective_id);
CREATE INDEX IX_key_results_service_line_id ON dbo.key_results(service_line_id);
CREATE INDEX IX_actions_key_result_id ON dbo.actions(key_result_id);
CREATE INDEX IX_actions_responsible_id ON dbo.actions(responsible_id);
CREATE INDEX IX_checkpoints_key_result_id ON dbo.checkpoints(key_result_id);
CREATE INDEX IX_activities_user_id ON dbo.activities(user_id);
CREATE INDEX IX_activities_entity ON dbo.activities(entity_type, entity_id);