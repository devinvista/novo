import mysql from 'mysql2/promise';

async function debugServiceLineFilter() {
  const pool = mysql.createPool({
    host: 'srv1661.hstgr.io',
    port: 3306,
    user: 'u928820799_okr_user',
    password: 'OKR!2024#Fiergs',
    database: 'u928820799_okr_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🔍 Debugging Service Line Filter Issue');
    
    // 1. Get all service lines
    console.log('\n1. Available Service Lines:');
    const [serviceLines] = await pool.execute('SELECT id, name FROM service_lines ORDER BY id');
    console.table(serviceLines);
    
    // 2. Find the Vacinação key result
    console.log('\n2. Key Results containing "Vacinação":');
    const [vacinacaoKRs] = await pool.execute(`
      SELECT kr.id, kr.title, kr.service_line_id, sl.name as service_line_name 
      FROM key_results kr 
      LEFT JOIN service_lines sl ON kr.service_line_id = sl.id 
      WHERE kr.title LIKE '%Vacinação%'
    `);
    console.table(vacinacaoKRs);
    
    // 3. Check if there's a service line that should contain "Vacinação"
    console.log('\n3. Service Lines containing "Vacinação" or similar:');
    const [vacinacaoSLs] = await pool.execute(`
      SELECT id, name, description 
      FROM service_lines 
      WHERE name LIKE '%Vacinação%' OR name LIKE '%Saúde%' OR name LIKE '%Vacina%'
    `);
    console.table(vacinacaoSLs);
    
    // 4. Check the exact serviceLineId being filtered
    console.log('\n4. Testing specific filter - serviceLineId = 4:');
    const [filteredResults] = await pool.execute(`
      SELECT kr.id, kr.title, kr.service_line_id, sl.name as service_line_name 
      FROM key_results kr 
      LEFT JOIN service_lines sl ON kr.service_line_id = sl.id 
      WHERE kr.service_line_id = 4
    `);
    console.table(filteredResults);
    
    // 5. Get all key results with their service line info
    console.log('\n5. All Key Results with Service Line info:');
    const [allKRs] = await pool.execute(`
      SELECT kr.id, kr.title, kr.service_line_id, sl.name as service_line_name 
      FROM key_results kr 
      LEFT JOIN service_lines sl ON kr.service_line_id = sl.id 
      ORDER BY kr.id
    `);
    console.table(allKRs);
    
  } catch (error) {
    console.error('Error debugging service line filter:', error);
  } finally {
    process.exit(0);
  }
}

debugServiceLineFilter();