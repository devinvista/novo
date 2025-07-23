/**
 * Funções utilitárias para formatação de números seguindo padrão brasileiro ABNT
 * Vírgula como separador decimal, ponto como separador de milhar
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