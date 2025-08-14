/**
 * Funções utilitárias para formatação de números e datas seguindo padrão brasileiro ABNT
 * Vírgula como separador decimal, ponto como separador de milhar
 * Formato de data: DD/MM/AAAA, timezone Brasil (UTC-3)
 */

// Configurações de timezone e formatação para Brasil
const BRAZIL_TIMEZONE = 'America/Sao_Paulo'; // UTC-3
const BRAZIL_LOCALE = 'pt-BR';

/**
 * FUNÇÕES DE DATA - PADRÃO BRASILEIRO
 */

// Formata data para exibição brasileira (DD/MM/AAAA)
export function formatDateBR(date: string | Date): string {
  if (!date) return '';
  
  let dateObj: Date;
  if (typeof date === 'string') {
    // Se é uma string ISO (YYYY-MM-DD), criar data sem conversão de timezone
    if (date.includes('-') && date.length === 10) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // month é 0-indexed
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString(BRAZIL_LOCALE, {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

// Formata data e hora para exibição brasileira (DD/MM/AAAA HH:mm)
export function formatDateTimeBR(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleString(BRAZIL_LOCALE, {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Converte data DD/MM/AAAA para formato ISO (AAAA-MM-DD) para backend
export function convertDateBRToISO(dateBR: string): string {
  if (!dateBR) return '';
  
  const parts = dateBR.split('/');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Converte data ISO (AAAA-MM-DD) para formato brasileiro (DD/MM/AAAA)
export function convertISOToDateBR(isoDate: string): string {
  if (!isoDate) return '';
  
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

// Obtém data atual no timezone do Brasil
export function getCurrentDateBR(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
}

// Valida formato de data brasileira (DD/MM/AAAA)
export function isValidDateBR(dateBR: string): boolean {
  if (!dateBR) return false;
  
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateBR.match(regex);
  
  if (!match) return false;
  
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return date.getDate() === parseInt(day) &&
         date.getMonth() === parseInt(month) - 1 &&
         date.getFullYear() === parseInt(year);
}

/**
 * FUNÇÕES DE NÚMERO - PADRÃO BRASILEIRO ABNT
 */

// Converte string com vírgula para float (padrão brasileiro para banco)
export function parseDecimalBR(value: string | number): number {
  if (!value || value === "") return 0;
  
  // Se já é número, retorna direto
  if (typeof value === "number") return value;
  
  // Parse inteligente similar ao formatBrazilianNumber
  let cleanValue = value.toString().trim();
  
  // Se tem ponto E vírgula, assume formato brasileiro: 1.234.567,89
  if (cleanValue.includes('.') && cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
  }
  // Se só tem vírgula, assume que é decimal brasileiro: 1234,56
  else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
    cleanValue = cleanValue.replace(",", ".");
  }
  // Se só tem ponto, pode ser milhar (1.000) ou decimal (1000.50)
  else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
    const parts = cleanValue.split('.');
    // Se a última parte tem 3 dígitos e não há outra parte decimal, assume separador de milhar
    if (parts.length === 2 && parts[1].length === 3 && !/\d{4,}/.test(parts[0])) {
      cleanValue = cleanValue.replace(".", "");
    }
    // Senão, mantém como decimal internacional
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// FUNÇÃO CENTRAL: Formata números para padrão brasileiro
// Unifica toda a formatação em uma só função para evitar duplicidade
export function formatBrazilianNumber(value: number | string, decimals?: number): string {
  if (value === null || value === undefined || value === "" || value === "0") return "0";
  
  let num: number;
  if (typeof value === "string") {
    // Parse inteligente: detecta se é formato brasileiro ou internacional
    let cleanValue = value.toString().trim();
    
    // Se tem ponto E vírgula, assume formato brasileiro: 1.234.567,89
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      // Remove pontos (separadores de milhar) e troca vírgula por ponto
      cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
    }
    // Se só tem vírgula, assume que é decimal brasileiro: 1234,56
    else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      cleanValue = cleanValue.replace(",", ".");
    }
    // Se só tem ponto, pode ser milhar (1.000) ou decimal (1000.50)
    else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
      const parts = cleanValue.split('.');
      // Se a última parte tem 3 dígitos e não há outra parte decimal, assume separador de milhar
      if (parts.length === 2 && parts[1].length === 3 && !/\d{4,}/.test(parts[0])) {
        cleanValue = cleanValue.replace(".", "");
      }
      // Senão, mantém como decimal internacional
    }
    
    num = parseFloat(cleanValue);
  } else {
    num = value;
  }
  
  if (isNaN(num)) return "0";
  
  // Se decimals não foi especificado, usar formatação inteligente
  if (decimals === undefined) {
    // Se o número é inteiro, não mostrar decimais
    if (num % 1 === 0) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    } else {
      // Para números decimais, detectar automaticamente casas necessárias
      const decimalPart = num.toString().split('.')[1] || '';
      const significantDecimals = decimalPart.replace(/0+$/, '').length; // Remove zeros à direita
      const maxDecimals = Math.max(2, Math.min(significantDecimals, 4)); // Entre 2 e 4 casas
      
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals,
      }).format(num);
    }
  }
  
  // Se decimals foi especificado, usar o valor fornecido
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// ALIASES para manter compatibilidade (todas delegam para a função central)
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  return formatBrazilianNumber(value, decimals);
}

export function formatNumberBR(value: number | string, decimals?: number): string {
  return formatBrazilianNumber(value, decimals);
}

// DEPRECATED: Use parseDecimalBR() instead
// Esta função está sendo removida - use parseDecimalBR() para conversões adequadas

// Converte valor internacional (com ponto) para valor brasileiro (com vírgula) para exibição
export function convertUSToBR(value: string | number): string {
  if (value === null || value === undefined || value === "") return "0,00";
  
  const strValue = value.toString();
  return strValue.replace(".", ",");
}

// Validação para campos numéricos brasileiros (aceita vírgula e ponto)
export function isValidBRNumber(value: string): boolean {
  if (!value) return true; // Campo vazio é válido
  
  // Aceita números com vírgula ou ponto como decimal
  const brazilianNumberRegex = /^-?\d+([,.]\d+)?$/;
  return brazilianNumberRegex.test(value.replace(/\s/g, ""));
}

// Máscara para input numérico brasileiro - permite digitação livre de números
export function maskBRNumber(value: string): string {
  if (!value) return "";
  
  // Remove tudo que não é número, vírgula ou ponto
  let cleaned = value.replace(/[^\d.,]/g, "");
  
  // Permite apenas uma vírgula ou ponto como separador decimal
  const decimalSeparators = cleaned.match(/[.,]/g);
  if (decimalSeparators && decimalSeparators.length > 1) {
    // Se há múltiplos separadores, manter apenas o primeiro
    const firstSeparatorIndex = cleaned.search(/[.,]/);
    const beforeSeparator = cleaned.substring(0, firstSeparatorIndex);
    const afterSeparator = cleaned.substring(firstSeparatorIndex + 1).replace(/[.,]/g, "");
    cleaned = beforeSeparator + "," + afterSeparator;
  } else if (decimalSeparators && decimalSeparators.length === 1) {
    // Normalizar separador para vírgula
    cleaned = cleaned.replace(".", ",");
  }
  
  return cleaned;
}