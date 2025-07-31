/**
 * Script debug para identificar problema de conversão de valores em checkpoints
 * Onde 2.300 está sendo convertido para 2.3
 */

import { MySQLStorage } from './mysql-storage-optimized.js';
import { formatDecimalBR, convertDatabaseToBR, parseDecimalBR } from './formatters.js';

const storage = new MySQLStorage();

async function debugCheckpointValues() {
  try {
    console.log('🔍 Debug: Investigando conversão de valores nos checkpoints');
    
    // Testar Key Result ID 25 que tem o problema
    const keyResultId = 25;
    const keyResult = await storage.getKeyResult(keyResultId);
    
    if (!keyResult) {
      console.log('❌ Key Result não encontrado');
      return;
    }
    
    console.log('\n📊 Key Result encontrado:');
    console.log('  - ID:', keyResult.id);
    console.log('  - Title:', keyResult.title);
    console.log('  - Target Value (raw):', keyResult.targetValue);
    console.log('  - Target Value (type):', typeof keyResult.targetValue);
    console.log('  - Target Value (parsed as number):', Number(keyResult.targetValue));
    console.log('  - Frequency:', keyResult.frequency);
    
    // Simular cálculo de checkpoint
    const totalTarget = Number(keyResult.targetValue);
    console.log('\n🧮 Simulando cálculo de checkpoints:');
    console.log('  - Total target number:', totalTarget);
    console.log('  - Total target type:', typeof totalTarget);
    
    // Simular 3 períodos
    const totalPeriods = 3;
    
    for (let i = 0; i < totalPeriods; i++) {
      const isLastCheckpoint = i === totalPeriods - 1;
      const targetValue = isLastCheckpoint ? totalTarget : (totalTarget / totalPeriods) * (i + 1);
      const formattedValue = targetValue.toFixed(2);
      
      console.log(`\n  📝 Checkpoint ${i + 1}:`);
      console.log(`    - Is last: ${isLastCheckpoint}`);
      console.log(`    - Calculated value: ${targetValue}`);
      console.log(`    - Formatted value: ${formattedValue}`);
      console.log(`    - Parsed back: ${parseFloat(formattedValue)}`);
      console.log(`    - To BR format: ${convertDatabaseToBR(formattedValue)}`);
      console.log(`    - Format BR decimal: ${formatDecimalBR(targetValue)}`);
    }
    
    // Verificar checkpoints existentes
    console.log('\n📋 Checkpoints existentes:');
    const checkpoints = await storage.getCheckpoints(keyResultId);
    
    checkpoints.forEach((checkpoint, index) => {
      console.log(`\n  🎯 Checkpoint ${index + 1}:`);
      console.log(`    - ID: ${checkpoint.id}`);
      console.log(`    - Title: ${checkpoint.title}`);
      console.log(`    - Target Value (raw): "${checkpoint.targetValue}"`);
      console.log(`    - Target Value (type): ${typeof checkpoint.targetValue}`);
      console.log(`    - Target Value (parsed): ${parseFloat(checkpoint.targetValue)}`);
      console.log(`    - Converted to BR: ${convertDatabaseToBR(checkpoint.targetValue)}`);
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    process.exit(0);
  }
}

debugCheckpointValues();