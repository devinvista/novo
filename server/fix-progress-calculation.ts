import mysql from 'mysql2/promise';

// MySQL connection config
const pool = mysql.createPool({
  host: 'srv1661.hstgr.io',
  port: 3306,
  user: 'u905571261_okr',
  password: 'Okr2025$',
  database: 'u905571261_okr',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fixProgressCalculation() {
  console.log('🔄 Fixing progress calculation for all Key Results...');
  
  try {
    // Get all key results
    const [keyResults] = await pool.execute(
      'SELECT id, title, current_value, target_value, progress FROM key_results'
    );
    
    console.log(`📊 Found ${(keyResults as any[]).length} key results to check`);
    
    for (const kr of keyResults as any[]) {
      console.log(`\n📝 Processing: "${kr.title}"`);
      console.log(`   Current data: currentValue=${kr.current_value}, targetValue=${kr.target_value}, progress=${kr.progress}`);
      
      const currentValue = parseFloat(kr.current_value) || 0;
      const targetValue = parseFloat(kr.target_value) || 1;
      const calculatedProgress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
      
      console.log(`   🧮 Calculation: ${currentValue} / ${targetValue} * 100 = ${calculatedProgress.toFixed(2)}%`);
      
      // Update progress if different
      if (Math.abs(parseFloat(kr.progress) - calculatedProgress) > 0.01) {
        await pool.execute(
          'UPDATE key_results SET progress = ?, updated_at = NOW() WHERE id = ?',
          [calculatedProgress.toFixed(2), kr.id]
        );
        console.log(`   ✅ Updated progress from ${kr.progress}% to ${calculatedProgress.toFixed(2)}%`);
      } else {
        console.log(`   ✓ Progress is already correct`);
      }
    }
    
    console.log('\n🎉 Progress calculation fixed for all Key Results!');
    
    // Show final results
    const [finalResults] = await pool.execute(
      'SELECT id, title, current_value, target_value, progress FROM key_results ORDER BY id'
    );
    
    console.log('\n📋 Final results:');
    for (const kr of finalResults as any[]) {
      console.log(`   ${kr.title}: ${kr.current_value}/${kr.target_value} = ${kr.progress}%`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing progress calculation:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixProgressCalculation().catch(console.error);