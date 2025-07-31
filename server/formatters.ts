/**
 * Funções utilitárias para formatação de números no servidor - PADRÃO BRASILEIRO ABNT
 * Converte entre formato brasileiro (vírgula decimal, ponto separador milhares) e formato de banco (ponto decimal)
 */

// REMOVIDA: parseDecimalBR foi substituída por convertBRToDatabase para eliminar duplicidade

// FUNÇÃO CENTRAL: Formata números para padrão brasileiro
// Unifica toda a formatação em uma só função para evitar duplicidade
export function formatBrazilianNumber(value: number | string, decimals?: number): string {
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
  
  // Se decimais especificadas, usar o valor fornecido
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// ALIASES para manter compatibilidade (todas delegam para a função central)
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  return formatBrazilianNumber(value, decimals);
}

export function formatNumberBR(value: number | string, decimals: number = 2): string {
  return formatBrazilianNumber(value, decimals);
}

export function convertDatabaseToBR(value: number | string, decimals?: number): string {
  return formatBrazilianNumber(value, decimals);
}

// Converte valor brasileiro (vírgula, pontos) para valor de banco (apenas ponto decimal)
export function convertBRToDatabase(value: string | number): number {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (!value || value === "" || value === null || value === undefined) return 0;
  
  const stringValue = value.toString().trim();
  
  // Se é um número padrão do banco (apenas dígitos e ponto decimal), mas NÃO separador de milhares brasileiro
  // Rejeita padrões como "2.300" (exatamente 3 dígitos após ponto) que são separadores de milhares no Brasil
  if (/^\d+\.\d{3}$/.test(stringValue)) {
    // É separador de milhares brasileiro - não usar parseFloat, ir para lógica brasileira
  } else if (/^\d+\.?\d{0,2}$/.test(stringValue)) {
    // É número padrão do banco (0-2 dígitos após ponto) - usar parseFloat direto  
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
    
    // CORREÇÃO: Se tem exatamente 3 dígitos após ponto, é SEMPRE separador de milhares brasileiro
    if (afterDot.length === 3) {
      // Exatamente 3 dígitos = separador de milhares brasileiro (ex: 2.300 → 2300, 12.500 → 12500)
      cleanValue = stringValue.replace(/\./g, '');
    } else if (afterDot.length === 1 || afterDot.length === 2) {
      // 1-2 dígitos após ponto = decimal (ex: 2.5 → 2.5, 2.50 → 2.50)
      cleanValue = stringValue;
    } else {
      // Mais de 3 dígitos ou outros casos = separador de milhares
      cleanValue = stringValue.replace(/\./g, '');
    }
  } else {
    // Só dígitos
    cleanValue = stringValue.replace(/[^\d]/g, '');
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
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