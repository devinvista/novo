/**
 * Debug script para identificar problema de conversão de números nos checkpoints
 */

import { parseDecimalBR, convertDatabaseToBR } from './formatters.js';

console.log('🧪 Testando conversões problemas 2300 -> 2.3:');
console.log('');

// Valor original: 2300
const original = 2300;
console.log('1. Valor original:', original);
console.log('2. toFixed(2):', original.toFixed(2));
console.log('3. convertDatabaseToBR(original.toFixed(2)):', convertDatabaseToBR(original.toFixed(2)));
console.log('4. convertDatabaseToBR(original):', convertDatabaseToBR(original));
console.log('');

// Simulando o problema reportado
const formattedAsString = '2300.00';
console.log('String formatada:', formattedAsString);
console.log('parseDecimalBR(formattedAsString):', parseDecimalBR(formattedAsString));
console.log('convertDatabaseToBR(parseDecimalBR(formattedAsString)):', convertDatabaseToBR(parseDecimalBR(formattedAsString)));
console.log('');

// Testando formato brasileiro que pode estar causando o problema
const problematicValue = '2.300';
console.log('Valor problemático "2.300":');

// Debug detalhado da função parseDecimalBR
const testValue = '2.300';
console.log('Testando parseDecimalBR("2.300"):');
console.log('  hasComma:', testValue.includes(','));
console.log('  hasDot:', testValue.includes('.'));
console.log('  dotIndex:', testValue.indexOf('.'));
console.log('  beforeDot:', testValue.substring(0, testValue.indexOf('.')));
console.log('  afterDot:', testValue.substring(testValue.indexOf('.') + 1));
console.log('  afterDot.length:', testValue.substring(testValue.indexOf('.') + 1).length);

console.log('parseDecimalBR("2.300"):', parseDecimalBR('2.300'));
console.log('convertDatabaseToBR(parseDecimalBR("2.300")):', convertDatabaseToBR(parseDecimalBR('2.300')));
console.log('');

// Testando sequência completa
console.log('🔍 Sequência completa de conversão:');
const targetValue = 2300;
const step1 = targetValue.toFixed(2); // "2300.00"
const step2 = convertDatabaseToBR(step1); // Problema aqui?
console.log('targetValue:', targetValue);
console.log('targetValue.toFixed(2):', step1);
console.log('convertDatabaseToBR(step1):', step2);