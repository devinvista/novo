import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'srv1661.hstgr.io',
  port: 3306,
  user: 'u175009139_okr_system',
  password: 'SafTdl98!OKRs2024',
  database: 'u175009139_okr_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fixCheckpointOwnership() {
  console.log('=== CORRIGINDO OWNERSHIP DOS KEY RESULTS ===\n');
  
  // Atualizar owner_id do key result 31 para o usuário siandra (ID 16)
  console.log('Atualizando owner do key result 31 para usuário siandra (ID 16)...');
  
  await pool.execute('UPDATE key_results SET owner_id = ? WHERE id = ?', [16, 31]);
  
  console.log('Owner atualizado com sucesso!');
  
  // Verificar se funcionou
  const [krRows] = await pool.execute('SELECT id, title, owner_id FROM key_results WHERE id = 31');
  const keyResult = krRows as any[];
  console.log('Key Result 31 após atualização:', keyResult[0]);
  
  // Verificar quantos checkpoints existem para este KR
  const [checkpointRows] = await pool.execute('SELECT COUNT(*) as total FROM checkpoints WHERE key_result_id = 31');
  const checkpointCount = checkpointRows as any[];
  console.log(`Total de checkpoints para KR 31: ${checkpointCount[0].total}`);
  
  await pool.end();
}

fixCheckpointOwnership().catch(console.error);