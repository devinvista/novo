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

async function debugCheckpointsAccess() {
  console.log('=== DEBUG: Checkpoints Access Control ===\n');
  
  // Verificar usuário siandra
  const [userRows] = await pool.execute('SELECT id, username, role FROM users WHERE username = ?', ['siandra']);
  const user = userRows as any[];
  console.log('Usuario siandra:', user[0]);
  
  // Verificar checkpoints recém criados
  const [checkpointRows] = await pool.execute('SELECT id, key_result_id, period, created_at FROM checkpoints ORDER BY created_at DESC LIMIT 10');
  const checkpoints = checkpointRows as any[];
  console.log('\nCheckpoints mais recentes:');
  checkpoints.forEach(cp => {
    console.log(`- ID: ${cp.id}, KR ID: ${cp.key_result_id}, Periodo: ${cp.period}`);
  });
  
  // Verificar ownership dos key results
  const [krRows] = await pool.execute(`
    SELECT kr.id, kr.title, kr.owner_id, u.username as owner_name
    FROM key_results kr 
    LEFT JOIN users u ON kr.owner_id = u.id 
    WHERE kr.id IN (SELECT DISTINCT key_result_id FROM checkpoints)
  `);
  const keyResults = krRows as any[];
  console.log('\nKey Results com checkpoints:');
  keyResults.forEach(kr => {
    console.log(`- KR ID: ${kr.id}, Owner ID: ${kr.owner_id}, Owner: ${kr.owner_name}, Titulo: ${kr.title}`);
  });
  
  // Teste da query de access control
  const keyResultId = 31;
  const currentUserId = 16;
  
  console.log(`\n=== Testando access control para KR ${keyResultId} e user ${currentUserId} ===`);
  
  const [accessTestRows] = await pool.execute(`
    SELECT c.*, kr.title as keyResultTitle, kr.owner_id as keyResultOwnerId, u.username, u.role
    FROM checkpoints c
    LEFT JOIN key_results kr ON c.key_result_id = kr.id
    LEFT JOIN users u ON kr.owner_id = u.id
    WHERE c.key_result_id = ? AND kr.owner_id = ?
  `, [keyResultId, currentUserId]);
  
  const accessTest = accessTestRows as any[];
  console.log(`Checkpoints encontrados com filtro de acesso: ${accessTest.length}`);
  accessTest.forEach(cp => {
    console.log(`- Checkpoint ID: ${cp.id}, Owner ID: ${cp.keyResultOwnerId}, Owner: ${cp.username}`);
  });
}

debugCheckpointsAccess().catch(console.error);