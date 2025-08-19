import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'srv1661.hstgr.io',
  port: 3306,
  user: 'u484026513_okradmin',
  password: '64@BNEkr',
  database: 'u484026513_okr'
};

async function runMigration() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🚀 Starting migration to add code fields...');
    
    // Add code field to solutions table
    await connection.execute('ALTER TABLE solutions ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT \'\' AFTER name');
    console.log('✅ Added code field to solutions table');
    
    // Add code field to service_lines table  
    await connection.execute('ALTER TABLE service_lines ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT \'\' AFTER name');
    console.log('✅ Added code field to service_lines table');
    
    // Add code field to services table
    await connection.execute('ALTER TABLE services ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT \'\' AFTER name');
    console.log('✅ Added code field to services table');
    
    // Add code field to strategic_indicators table
    await connection.execute('ALTER TABLE strategic_indicators ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT \'\' AFTER name');
    console.log('✅ Added code field to strategic_indicators table');
    
    // Add unit field to strategic_indicators table
    await connection.execute('ALTER TABLE strategic_indicators ADD COLUMN unit VARCHAR(50) AFTER description');
    console.log('✅ Added unit field to strategic_indicators table');
    
    // Update existing records with default codes (based on name)
    await connection.execute('UPDATE solutions SET code = UPPER(SUBSTRING(REPLACE(name, \' \', \'\'), 1, 10)) WHERE code = \'\'');
    console.log('✅ Updated solutions with default codes');
    
    await connection.execute('UPDATE service_lines SET code = UPPER(SUBSTRING(REPLACE(name, \' \', \'\'), 1, 10)) WHERE code = \'\'');
    console.log('✅ Updated service_lines with default codes');
    
    await connection.execute('UPDATE services SET code = UPPER(SUBSTRING(REPLACE(name, \' \', \'\'), 1, 10)) WHERE code = \'\'');
    console.log('✅ Updated services with default codes');
    
    await connection.execute('UPDATE strategic_indicators SET code = UPPER(SUBSTRING(REPLACE(name, \' \', \'\'), 1, 10)) WHERE code = \'\'');
    console.log('✅ Updated strategic_indicators with default codes');
    
    // Add unique constraints after populating default values
    await connection.execute('ALTER TABLE solutions ADD CONSTRAINT uk_solutions_code UNIQUE (code)');
    console.log('✅ Added unique constraint to solutions.code');
    
    await connection.execute('ALTER TABLE service_lines ADD CONSTRAINT uk_service_lines_code UNIQUE (code)');
    console.log('✅ Added unique constraint to service_lines.code');
    
    await connection.execute('ALTER TABLE services ADD CONSTRAINT uk_services_code UNIQUE (code)');
    console.log('✅ Added unique constraint to services.code');
    
    await connection.execute('ALTER TABLE strategic_indicators ADD CONSTRAINT uk_strategic_indicators_code UNIQUE (code)');
    console.log('✅ Added unique constraint to strategic_indicators.code');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();