/**
 * Teste específico para validar a correção da função parseDecimalBR
 */

// Simular a função corrigida diretamente
function parseDecimalBRFixed(value: string | number): number {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (!value || value === "" || value === null || value === undefined) return 0;
  
  const stringValue = value.toString().trim();
  
  // Se é um número padrão do banco (apenas dígitos e ponto decimal), usar parseFloat direto
  if (/^\d+\.?\d*$/.test(stringValue)) {
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // Para formato brasileiro, determinar se vírgula é decimal ou separador de milhares
  const hasComma = stringValue.includes(',');
  const hasDot = stringValue.includes('.');
  
  let cleanValue: string;
  
  if (hasComma && hasDot) {
    // Formato: 1.234.567,89 (ponto = milhares, vírgula = decimal)
    const parts = stringValue.split(',');
    if (parts.length === 2) {
      const wholePart = parts[0].replace(/\./g, ''); // Remove pontos dos milhares
      const decimalPart = parts[1];
      cleanValue = `${wholePart}.${decimalPart}`;
    } else {
      cleanValue = stringValue.replace(/[^\d.,]/g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    // Só vírgula - pode ser decimal (2,50) ou milhares (2.500 digitado como 2,500)
    const commaIndex = stringValue.indexOf(',');
    const afterComma = stringValue.substring(commaIndex + 1);
    
    // Se tem 1-2 dígitos após vírgula, é decimal; se tem 3+ dígitos, é separador de milhares
    if (afterComma.length <= 2) {
      cleanValue = stringValue.replace(',', '.');
    } else {
      cleanValue = stringValue.replace(',', '');
    }
  } else if (hasDot && !hasComma) {
    // Só ponto - verificar se é decimal ou separador de milhares
    const dotIndex = stringValue.indexOf('.');
    const afterDot = stringValue.substring(dotIndex + 1);
    
    // CORREÇÃO CRÍTICA: Se tem exatamente 3 dígitos após ponto, é separador de milhares brasileiro
    console.log(`🔍 Debug para "${stringValue}": afterDot="${afterDot}", length=${afterDot.length}`);
    
    if (afterDot.length === 3) {
      // Sempre considerar separador de milhares quando tem 3 dígitos após ponto
      cleanValue = stringValue.replace(/\./g, '');
      console.log(`🔧 CORRIGIDO: "${stringValue}" → "${cleanValue}" (separador de milhares)`);
    } else if (afterDot.length === 1 || afterDot.length === 2) {
      // 1-2 dígitos após ponto = decimal
      cleanValue = stringValue;
      console.log(`✅ CORRETO: "${stringValue}" → "${cleanValue}" (decimal)`);
    } else {
      // Mais de 3 dígitos ou outros casos = separador de milhares
      cleanValue = stringValue.replace(/\./g, '');
      console.log(`🔧 CORRIGIDO: "${stringValue}" → "${cleanValue}" (separador de milhares longo)`);
    }
  } else {
    // Só dígitos
    cleanValue = stringValue.replace(/[^\d]/g, '');
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

console.log('🧪 Testando função parseDecimalBR corrigida:');
console.log('');

// Casos problemáticos
console.log('CASO 1: "2.300" (deve retornar 2300)');
const result1 = parseDecimalBRFixed('2.300');
console.log('Resultado:', result1);
console.log('Correto?', result1 === 2300 ? '✅ SIM' : '❌ NÃO');
console.log('');

console.log('CASO 2: "12.500" (deve retornar 12500)');
const result2 = parseDecimalBRFixed('12.500');
console.log('Resultado:', result2);
console.log('Correto?', result2 === 12500 ? '✅ SIM' : '❌ NÃO');
console.log('');

console.log('CASO 3: "2.50" (deve retornar 2.5)');
const result3 = parseDecimalBRFixed('2.50');
console.log('Resultado:', result3);
console.log('Correto?', result3 === 2.5 ? '✅ SIM' : '❌ NÃO');
console.log('');

console.log('CASO 4: "1.234.567,89" (deve retornar 1234567.89)');
const result4 = parseDecimalBRFixed('1.234.567,89');
console.log('Resultado:', result4);
console.log('Correto?', result4 === 1234567.89 ? '✅ SIM' : '❌ NÃO');