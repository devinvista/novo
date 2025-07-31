/**
 * Funções utilitárias para formatação de números no servidor - PADRÃO BRASILEIRO ABNT
 * Converte entre formato brasileiro (vírgula decimal, ponto separador milhares) e formato de banco (ponto decimal)
 */

// Converte string brasileira (vírgula decimal, ponto milhares) para float do banco de dados
export function parseDecimalBR(value: string | number): number {
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
    const beforeDot = stringValue.substring(0, dotIndex);
    const afterDot = stringValue.substring(dotIndex + 1);
    
    // Lógica brasileira melhorada: 
    // - Se tem exatamente 3 dígitos após ponto, é separador de milhares (ex: 2.300, 12.500, 1234.000)
    // - Se tem 1-2 dígitos após ponto E antes do ponto tem mais de 4 dígitos, é decimal (ex: 12345.67)
    // - Se tem 1-2 dígitos após ponto E antes do ponto tem até 4 dígitos, é decimal (ex: 2.50, 123.45)
    if (afterDot.length === 3) {
      // Sempre considerar separador de milhares quando tem 3 dígitos após ponto
      cleanValue = stringValue.replace(/\./g, '');
    } else if (afterDot.length <= 2) {
      // 1-2 dígitos após ponto = decimal
      cleanValue = stringValue;
    } else {
      // Múltiplos pontos ou padrão complexo - remover pontos (tratando como separador de milhares)
      cleanValue = stringValue.replace(/\./g, '');
    }
  } else {
    // Só dígitos
    cleanValue = stringValue.replace(/[^\d]/g, '');
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Converte float do banco para string brasileira (vírgula decimal)
// Mostra inteiros quando possível, decimais apenas quando necessário
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Se o número é inteiro, não mostrar decimais
  if (num % 1 === 0) {
    return num.toString();
  }
  
  return num.toFixed(decimals).replace(".", ",");
}

// Formata número para exibição completa brasileira (vírgula decimal + ponto milhares)
// Mostra inteiros quando possível, decimais apenas quando necessário
export function formatNumberBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Se o número é inteiro, não mostrar decimais
  if (num % 1 === 0) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Converte valor brasileiro (vírgula, pontos) para valor de banco (apenas ponto decimal)
export function convertBRToDatabase(value: string): number {
  return parseDecimalBR(value);
}

// Converte valor de banco para exibição brasileira
// Usa formatação inteligente como padrão (sem decimais desnecessários)
export function convertDatabaseToBR(value: number | string, decimals?: number): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Se decimais não especificadas, usar formatação inteligente
  if (decimals === undefined) {
    // Se o número é inteiro, não mostrar decimais
    if (num % 1 === 0) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    }
    // Se tem decimais, usar 2 casas
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  
  // Se decimais especificadas, usar formatNumberBR
  return formatNumberBR(value, decimals);
}

// Valida entrada brasileira (aceita vírgula, ponto, e separadores de milhares)
export function isValidBRNumber(value: string): boolean {
  if (!value) return true;
  
  // Aceita padrões brasileiros: 1.234,56 ou 1234,56 ou 1234.56 ou 1234
  const brazilianNumberRegex = /^-?\d{1,3}(\.\d{3})*,?\d*$|^-?\d+,?\d*$/;
  return brazilianNumberRegex.test(value.replace(/\s/g, ""));
}

// Máscara para input numérico brasileiro
export function maskBRNumber(value: string): string {
  if (!value) return "";
  
  // Remove tudo que não é número, vírgula ou ponto
  let cleaned = value.replace(/[^\d.,]/g, "");
  
  // Lógica para separadores brasileiros
  const parts = cleaned.split(",");
  if (parts.length > 2) {
    // Múltiplas vírgulas - manter apenas a primeira
    cleaned = parts[0] + "," + parts.slice(1).join("");
  }
  
  return cleaned;
}