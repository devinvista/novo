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
  
  // Remove espaços, pontos (separadores de milhares) e substitui vírgula por ponto para parseFloat
  const cleanValue = value.toString()
    .trim()
    .replace(/\s/g, "")              // Remove espaços
    .replace(/\./g, "")              // Remove pontos (separadores de milhares)
    .replace(",", ".");              // Substitui vírgula por ponto (decimal)
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Converte float do banco para string brasileira (vírgula decimal)
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0,00";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  
  return num.toFixed(decimals).replace(".", ",");
}

// Formata número para exibição completa brasileira (vírgula decimal + ponto milhares)
export function formatNumberBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0,00";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  
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
export function convertDatabaseToBR(value: number | string, decimals: number = 2): string {
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