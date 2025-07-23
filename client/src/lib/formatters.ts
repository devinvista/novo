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
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString(BRAZIL_LOCALE, {
    timeZone: BRAZIL_TIMEZONE,
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
export function parseDecimalBR(value: string): number {
  if (!value || value === "") return 0;
  
  // Remove espaços e substitui vírgula por ponto para parseFloat
  const cleanValue = value.toString().replace(/\s/g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Formata número float para string com vírgula (padrão brasileiro)
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  return num.toFixed(decimals).replace(".", ",");
}

// Formata número para exibição com separador de milhares brasileiro
export function formatNumberBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0,00";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Converte valor brasileiro (com vírgula) para valor internacional (com ponto) para envio ao servidor
export function convertBRToUS(value: string): string {
  if (!value || value === "") return "0";
  return value.replace(",", ".");
}

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

// Máscara para input numérico brasileiro
export function maskBRNumber(value: string): string {
  if (!value) return "";
  
  // Remove tudo que não é número, vírgula ou ponto
  let cleaned = value.replace(/[^\d.,]/g, "");
  
  // Permite apenas uma vírgula ou ponto
  const parts = cleaned.split(/[.,]/);
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts[1];
  } else if (parts.length === 2) {
    cleaned = parts[0] + "," + parts[1];
  }
  
  return cleaned;
}