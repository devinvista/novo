/**
 * Debug específico da lógica de parsing
 */

const testValue = "2.500";
console.log('Debugging parsing logic for:', testValue);

const stringValue = testValue.toString().trim();
console.log('StringValue:', stringValue);

// Se é um número padrão do banco (apenas dígitos e ponto decimal), usar parseFloat direto
const isStandardNumber = /^\d+\.?\d*$/.test(stringValue);
console.log('Is standard number?', isStandardNumber);

if (isStandardNumber) {
  const parsed = parseFloat(stringValue);
  console.log('Parsed as standard:', parsed);
} else {
  // Para formato brasileiro, determinar se vírgula é decimal ou separador de milhares
  const hasComma = stringValue.includes(',');
  const hasDot = stringValue.includes('.');
  
  console.log('Has comma:', hasComma);
  console.log('Has dot:', hasDot);

  if (hasDot && !hasComma) {
    // Só ponto - verificar se é decimal ou separador de milhares
    const dotIndex = stringValue.indexOf('.');
    const beforeDot = stringValue.substring(0, dotIndex);
    const afterDot = stringValue.substring(dotIndex + 1);
    
    console.log('Before dot:', beforeDot, 'length:', beforeDot.length);
    console.log('After dot:', afterDot, 'length:', afterDot.length);
    
    // Lógica brasileira: se tem exatamente 3 dígitos após ponto E não mais que 4 dígitos antes,
    // é separador de milhares (ex: 2.500, 12.500, 1234.500)
    // Se tem 1-2 dígitos após ponto, é decimal (ex: 2.50, 123.45)
    let cleanValue: string;
    if (afterDot.length === 3 && beforeDot.length <= 4) {
      console.log('Treating as thousands separator');
      cleanValue = stringValue.replace(/\./g, '');
    } else if (afterDot.length <= 2) {
      console.log('Treating as decimal');
      cleanValue = stringValue;
    } else {
      console.log('Complex pattern, removing dots');
      cleanValue = stringValue.replace(/\./g, '');
    }
    
    console.log('Clean value:', cleanValue);
    const parsed = parseFloat(cleanValue);
    console.log('Final parsed:', parsed);
  }
}

console.log('\n=== Test cases ===');
const testCases = [
  '2.500',    // Should be 2500
  '2.50',     // Should be 2.50
  '12.500',   // Should be 12500
  '12.50',    // Should be 12.50
  '1234.500', // Should be 1234500
  '1234.50',  // Should be 1234.50
];

testCases.forEach(test => {
  const isStandard = /^\d+\.?\d*$/.test(test);
  console.log(`"${test}" -> isStandard: ${isStandard}`);
  
  if (!isStandard) {
    const hasDot = test.includes('.');
    if (hasDot) {
      const dotIndex = test.indexOf('.');
      const beforeDot = test.substring(0, dotIndex);
      const afterDot = test.substring(dotIndex + 1);
      
      const isThousandsSeparator = afterDot.length === 3 && beforeDot.length <= 4;
      console.log(`  beforeDot: "${beforeDot}" (len: ${beforeDot.length}), afterDot: "${afterDot}" (len: ${afterDot.length})`);
      console.log(`  isThousandsSeparator: ${isThousandsSeparator}`);
      
      const cleanValue = isThousandsSeparator ? test.replace(/\./g, '') : test;
      const parsed = parseFloat(cleanValue);
      console.log(`  clean: "${cleanValue}" -> parsed: ${parsed}`);
    }
  } else {
    const parsed = parseFloat(test);
    console.log(`  direct parsed: ${parsed}`);
  }
});