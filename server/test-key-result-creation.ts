/**
 * Script para testar criação de Key Result diretamente no MySQL
 */

import mysql from 'mysql2/promise';

async function testKeyResultCreation() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'srv1661.hstgr.io',
      port: 3306,
      user: 'u905571261_okr',
      password: 'Okr2025$',
      database: 'u905571261_okr',
    });

    console.log('🔄 Testando criação de Key Result...');
    
    // Testar inserção direta
    const [result] = await connection.execute(
      'INSERT INTO key_results (objective_id, title, description, target_value, current_value, unit, strategicIndicatorIds, serviceLineIds, service_id, start_date, end_date, frequency, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        10, // objective_id
        'Teste direto MySQL',
        'Teste inserção direta',
        100.50, // target_value
        10.75,  // current_value
        'unidades',
        JSON.stringify([7]), // strategicIndicatorIds
        JSON.stringify([4]), // serviceLineIds
        11, // service_id
        '2025-02-01', // start_date
        '2025-03-31', // end_date
        'monthly', // frequency
        'active', // status
        '0' // progress
      ]
    );
    
    console.log('Result:', result);
    const insertId = (result as any).insertId;
    console.log('Insert ID:', insertId, 'Type:', typeof insertId);
    
    if (insertId) {
      // Buscar o registro criado
      const [rows] = await connection.execute('SELECT * FROM key_results WHERE id = ?', [insertId]);
      console.log('Created record:', rows);
    }
    
    console.log('✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testKeyResultCreation().catch(console.error);