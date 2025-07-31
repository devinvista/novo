/**
 * Script para testar especificamente o cenário onde 2.500 vira 2.3
 */

import { MySQLStorage } from './mysql-storage-optimized.js';
import { formatDecimalBR, convertDatabaseToBR, parseDecimalBR } from './formatters.js';

const storage = new MySQLStorage();

async function test2500Scenario() {
  try {
    console.log('🔍 Testando cenário específico: 2.500 -> 2.3');
    
    // Simular cenário onde o target value é 2.500
    const scenarios = [
      { input: '2.500', description: 'String brasileira com ponto separador' },
      { input: '2500', description: 'String numérica' },
      { input: 2500, description: 'Número' },
      { input: '2,500', description: 'String brasileira com vírgula decimal' },
      { input: '2300.00', description: 'String do banco de dados' }
    ];
    
    scenarios.forEach(scenario => {
      console.log(`\n📊 Testando: ${scenario.description}`);
      console.log(`  Entrada: "${scenario.input}" (${typeof scenario.input})`);
      
      try {
        // Teste parseDecimalBR
        const parsed = parseDecimalBR(scenario.input);
        console.log(`  parseDecimalBR: ${parsed}`);
        
        // Teste formatDecimalBR  
        const formatted = formatDecimalBR(parsed);
        console.log(`  formatDecimalBR: "${formatted}"`);
        
        // Teste convertDatabaseToBR
        const convertedToBR = convertDatabaseToBR(parsed);
        console.log(`  convertDatabaseToBR: "${convertedToBR}"`);
        
        // Simular divisão por períodos
        const totalPeriods = 3;
        const dividedValue = parsed / totalPeriods;
        console.log(`  Dividido por ${totalPeriods}: ${dividedValue}`);
        console.log(`  Dividido formatado: ${dividedValue.toFixed(2)}`);
        console.log(`  Dividido para BR: ${convertDatabaseToBR(dividedValue.toFixed(2))}`);
        
      } catch (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      }
    });
    
    // Teste específico de formatação problemática
    console.log('\n🧪 Teste de formatação específica:');
    const testValue = 2300;
    console.log(`Valor base: ${testValue}`);
    
    // Ver o que acontece com Intl.NumberFormat
    const intlFormatter = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    console.log(`Intl.NumberFormat (sem decimais): "${intlFormatter.format(testValue)}"`);
    
    const intlFormatterWithDecimals = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    console.log(`Intl.NumberFormat (com decimais): "${intlFormatterWithDecimals.format(testValue)}"`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

test2500Scenario();