import { pool } from './db.js';

// SQL Server table creation scripts
const createTables = async () => {
  console.log('🔧 Setting up Microsoft Fabric SQL Server tables...');
  
  try {
    await pool.connect();
    console.log('✓ Connected to Microsoft Fabric SQL Server');

    const tables = [
      // Users table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
       CREATE TABLE users (
         id int IDENTITY(1,1) PRIMARY KEY,
         username nvarchar(255) NOT NULL UNIQUE,
         password nvarchar(255) NOT NULL,
         name nvarchar(255) NOT NULL,
         email nvarchar(255) NOT NULL UNIQUE,
         role nvarchar(50) NOT NULL DEFAULT 'operacional',
         region_id int,
         sub_region_id int,
         active bit NOT NULL DEFAULT 1,
         created_at datetime2 DEFAULT GETDATE()
       )`,

      // Regions table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='regions' AND xtype='U')
       CREATE TABLE regions (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL UNIQUE,
         code nvarchar(50) NOT NULL UNIQUE
       )`,

      // Sub-regions table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sub_regions' AND xtype='U')
       CREATE TABLE sub_regions (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL,
         code nvarchar(50) NOT NULL UNIQUE,
         region_id int NOT NULL
       )`,

      // Solutions table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='solutions' AND xtype='U')
       CREATE TABLE solutions (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL UNIQUE,
         description nvarchar(max),
         created_at datetime2 DEFAULT GETDATE()
       )`,

      // Service lines table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='service_lines' AND xtype='U')
       CREATE TABLE service_lines (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL,
         description nvarchar(max),
         solution_id int NOT NULL,
         created_at datetime2 DEFAULT GETDATE()
       )`,

      // Services table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='services' AND xtype='U')
       CREATE TABLE services (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL,
         description nvarchar(max),
         service_line_id int NOT NULL,
         created_at datetime2 DEFAULT GETDATE()
       )`,

      // Strategic indicators table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='strategic_indicators' AND xtype='U')
       CREATE TABLE strategic_indicators (
         id int IDENTITY(1,1) PRIMARY KEY,
         name nvarchar(255) NOT NULL UNIQUE,
         description nvarchar(max),
         unit nvarchar(50),
         active bit NOT NULL DEFAULT 1
       )`,

      // Objectives table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='objectives' AND xtype='U')
       CREATE TABLE objectives (
         id int IDENTITY(1,1) PRIMARY KEY,
         title nvarchar(255) NOT NULL,
         description nvarchar(max),
         owner_id int NOT NULL,
         region_id int,
         sub_region_id int,
         start_date datetime2 NOT NULL,
         end_date datetime2 NOT NULL,
         status nvarchar(50) NOT NULL DEFAULT 'active',
         progress decimal(5,2) DEFAULT 0,
         created_at datetime2 DEFAULT GETDATE(),
         updated_at datetime2 DEFAULT GETDATE()
       )`,

      // Key results table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='key_results' AND xtype='U')
       CREATE TABLE key_results (
         id int IDENTITY(1,1) PRIMARY KEY,
         objective_id int NOT NULL,
         title nvarchar(255) NOT NULL,
         description nvarchar(max),
         number int NOT NULL,
         strategic_indicator_ids nvarchar(max),
         service_line_id int,
         service_id int,
         initial_value decimal(15,2) NOT NULL,
         target_value decimal(15,2) NOT NULL,
         current_value decimal(15,2) DEFAULT 0,
         unit nvarchar(50),
         frequency nvarchar(50) NOT NULL,
         start_date datetime2 NOT NULL,
         end_date datetime2 NOT NULL,
         progress decimal(5,2) DEFAULT 0,
         status nvarchar(50) NOT NULL DEFAULT 'active',
         created_at datetime2 DEFAULT GETDATE(),
         updated_at datetime2 DEFAULT GETDATE()
       )`,

      // Actions table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='actions' AND xtype='U')
       CREATE TABLE actions (
         id int IDENTITY(1,1) PRIMARY KEY,
         key_result_id int NOT NULL,
         title nvarchar(255) NOT NULL,
         description nvarchar(max),
         number int NOT NULL,
         strategic_indicator_id int,
         responsible_id int,
         due_date datetime2,
         status nvarchar(50) NOT NULL DEFAULT 'pending',
         priority nvarchar(50) NOT NULL DEFAULT 'medium',
         created_at datetime2 DEFAULT GETDATE(),
         updated_at datetime2 DEFAULT GETDATE()
       )`,

      // Checkpoints table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='checkpoints' AND xtype='U')
       CREATE TABLE checkpoints (
         id int IDENTITY(1,1) PRIMARY KEY,
         key_result_id int NOT NULL,
         period nvarchar(50) NOT NULL,
         target_value decimal(15,2) NOT NULL,
         actual_value decimal(15,2),
         progress decimal(5,2) DEFAULT 0,
         status nvarchar(50) NOT NULL DEFAULT 'pendente',
         notes nvarchar(max),
         completed_at datetime2,
         created_at datetime2 DEFAULT GETDATE(),
         updated_at datetime2 DEFAULT GETDATE()
       )`,

      // Activities table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
       CREATE TABLE activities (
         id int IDENTITY(1,1) PRIMARY KEY,
         user_id int NOT NULL,
         entity_type nvarchar(50) NOT NULL,
         entity_id int NOT NULL,
         action nvarchar(50) NOT NULL,
         description nvarchar(255) NOT NULL,
         old_values nvarchar(max),
         new_values nvarchar(max),
         created_at datetime2 DEFAULT GETDATE()
       )`
    ];

    // Execute table creation queries
    for (const tableSQL of tables) {
      const request = pool.request();
      await request.query(tableSQL);
      console.log('✓ Table created/verified');
    }

    console.log('✅ All Microsoft Fabric SQL Server tables are ready');
    return true;
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    return false;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default createTables;