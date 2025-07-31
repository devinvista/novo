/**
 * Script para testar se a correção da função parseDecimalBR resolve o problema
 */

import { MySQLStorage } from './mysql-storage-optimized.js';
import { formatDecimalBR, convertDatabaseToBR, parseDecimalBR } from './formatters.js';

const storage = new MySQLStorage();

async function testCheckpointFix() {
  try {
    console.log('🔧 Testando correção da função parseDecimalBR');
    
    // Casos específicos que causavam problema
    const testCases = [
      '2.500',      // Usuário digitou 2.500 (dois mil e quinhentos)
      '2,500',      // Usuário digitou 2,500 (dois mil e quinhentos) 
      '2300.00',    // Valor vindo do banco de dados
      '2.300,00',   // Valor brasileiro completo
      '25000'       // Valor sem formatação
    ];
    
    console.log('\n📋 Testando conversões corrigidas:');
    testCases.forEach((testCase, index) => {
      const parsed = parseDecimalBR(testCase);
      const formatted = convertDatabaseToBR(parsed);
      
      console.log(`  ${index + 1}. "${testCase}" -> ${parsed} -> "${formatted}"`);
    });
    
    // Teste específico do cenário relatado: 2.500 -> 2.3
    console.log('\n🎯 Teste específico do problema relatado:');
    const problematico = '2.500';
    const parsed = parseDecimalBR(problematico);
    const formatted = convertDatabaseToBR(parsed);
    
    console.log(`Entrada: "${problematico}"`);
    console.log(`Parsed: ${parsed}`);
    console.log(`Formatted: "${formatted}"`);
    console.log(`Problema resolvido: ${parsed === 2500 ? '✅ SIM' : '❌ NÃO'}`);
    
    // Testar divisão em checkpoints
    console.log('\n📊 Teste de divisão em checkpoints:');
    const totalTarget = parsed;
    const totalPeriods = 3;
    
    for (let i = 0; i < totalPeriods; i++) {
      const isLast = i === totalPeriods - 1;
      const targetValue = isLast ? totalTarget : (totalTarget / totalPeriods) * (i + 1);
      const formattedValue = targetValue.toFixed(2);
      const displayed = convertDatabaseToBR(formattedValue);
      
      console.log(`  Checkpoint ${i + 1}: ${targetValue} -> "${formattedValue}" -> "${displayed}"`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

testCheckpointFix();