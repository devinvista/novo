import mysql from 'mysql2/promise';

const setupMySQLDatabase = async () => {
  console.log('🔧 Setting up MySQL database...');

  // MySQL connection configuration
  const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    socketPath: process.env.MYSQL_SOCKET || '/tmp/mysql.sock',
    ssl: false,
    multipleStatements: true,
  };

  try {
    // Connect without database first
    const connection = await mysql.createConnection(mysqlConfig);
    
    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS okr_db');
    console.log('✓ Database okr_db created/verified');
    
    // Use the database
    await connection.execute('USE okr_db');
    
    // Create all tables
    const createTablesSQL = `
      -- Users table with role-based access
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role ENUM('admin', 'gestor', 'operacional') NOT NULL DEFAULT 'operacional',
        region_id INT,
        sub_region_id INT,
        gestor_id INT,
        approved BOOLEAN DEFAULT FALSE NOT NULL,
        approved_at TIMESTAMP NULL,
        approved_by INT,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gestor_id) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      );

      -- Regions table
      CREATE TABLE IF NOT EXISTS regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE
      );

      -- Sub-regions table
      CREATE TABLE IF NOT EXISTS sub_regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        region_id INT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions(id)
      );

      -- Solutions table
      CREATE TABLE IF NOT EXISTS solutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT
      );

      -- Service Lines table
      CREATE TABLE IF NOT EXISTS service_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        solution_id INT NOT NULL,
        FOREIGN KEY (solution_id) REFERENCES solutions(id)
      );

      -- Services table
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        service_line_id INT NOT NULL,
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id)
      );

      -- Strategic Indicators table
      CREATE TABLE IF NOT EXISTS strategic_indicators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        unit VARCHAR(50)
      );

      -- Objectives table
      CREATE TABLE IF NOT EXISTS objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        region_id INT,
        sub_region_id INT,
        status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft' NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (region_id) REFERENCES regions(id),
        FOREIGN KEY (sub_region_id) REFERENCES sub_regions(id)
      );

      -- Key Results table
      CREATE TABLE IF NOT EXISTS key_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        objective_id INT NOT NULL,
        strategic_indicator_id INT,
        service_line_id INT,
        service_id INT,
        initial_value DECIMAL(10,2) DEFAULT 0 NOT NULL,
        target_value DECIMAL(10,2) NOT NULL,
        current_value DECIMAL(10,2) DEFAULT 0 NOT NULL,
        unit VARCHAR(50),
        status ENUM('in_progress', 'completed', 'at_risk', 'cancelled') DEFAULT 'in_progress' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (objective_id) REFERENCES objectives(id),
        FOREIGN KEY (strategic_indicator_id) REFERENCES strategic_indicators(id),
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );

      -- Actions table
      CREATE TABLE IF NOT EXISTS actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        key_result_id INT NOT NULL,
        strategic_indicator_id INT,
        responsible_id INT,
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending' NOT NULL,
        due_date DATE,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id),
        FOREIGN KEY (strategic_indicator_id) REFERENCES strategic_indicators(id),
        FOREIGN KEY (responsible_id) REFERENCES users(id)
      );

      -- Checkpoints table
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_result_id INT NOT NULL,
        period VARCHAR(50) NOT NULL,
        target_value DECIMAL(10,2) NOT NULL,
        actual_value DECIMAL(10,2) DEFAULT 0 NOT NULL,
        notes TEXT,
        status ENUM('pending', 'completed', 'overdue') DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id)
      );

      -- Activities table
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await connection.execute(createTablesSQL);
    console.log('✓ All tables created successfully');

    await connection.end();
    console.log('✅ MySQL database setup completed');
    
  } catch (error) {
    console.error('❌ Error setting up MySQL database:', error);
    throw error;
  }
};

setupMySQLDatabase().catch(console.error);