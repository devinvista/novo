/**
 * Teste final da correção do problema "2.300" → 2.3
 */

import { convertBRToDatabase, convertDatabaseToBR } from './formatters.js';

console.log('🧪 Teste final - Problema "2.300" → 2.3:');
console.log('');

// Cenário problemático identificado
const testCases = [
  { input: '2.300', expected: 2300, description: 'Separador de milhares brasileiro' },
  { input: '12.500', expected: 12500, description: 'Separador de milhares maior' },
  { input: '2.50', expected: 2.50, description: 'Decimal brasileiro' },
  { input: '766.67', expected: 766.67, description: 'Decimal com duas casas' },
  { input: '2300.00', expected: 2300, description: 'Formato do banco de dados' },
  { input: '1.234.567,89', expected: 1234567.89, description: 'Formato brasileiro completo' }
];

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. Testando: "${testCase.input}" (${testCase.description})`);
  const result = convertBRToDatabase(testCase.input);
  const isCorrect = result === testCase.expected;
  
  console.log(`   Esperado: ${testCase.expected}`);
  console.log(`   Resultado: ${result}`);
  console.log(`   Status: ${isCorrect ? '✅ CORRETO' : '❌ INCORRETO'}`);
  
  if (!isCorrect) {
    console.log(`   🚨 ERRO: Conversão incorreta!`);
  }
  console.log('');
});

// Teste específico do problema relatado
console.log('🔬 Teste específico do problema reportado:');
const problematicValue = '2.300';
const converted = convertBRToDatabase(problematicValue);
const backToBR = convertDatabaseToBR(converted);

console.log(`Input: "${problematicValue}"`);
console.log(`convertBRToDatabase: ${converted}`);
console.log(`convertDatabaseToBR: "${backToBR}"`);
console.log(`Problema resolvido? ${converted === 2300 ? '✅ SIM' : '❌ NÃO'}`);