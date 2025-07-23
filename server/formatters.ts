/**
 * Funções utilitárias para formatação de números no servidor
 * Converte entre formato brasileiro (vírgula) e formato de banco (ponto)
 */

// Converte string brasileira (vírgula) para float do banco de dados
export function parseDecimalBR(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value || value === "") return 0;
  
  // Remove espaços e substitui vírgula por ponto para parseFloat
  const cleanValue = value.toString().replace(/\s/g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Converte float do banco para string brasileira (vírgula)
export function formatDecimalBR(value: number | string, decimals: number = 2): string {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  return num.toFixed(decimals).replace(".", ",");
}

// Valida entrada brasileira
export function isValidBRNumber(value: string): boolean {
  if (!value) return true;
  const brazilianNumberRegex = /^-?\d+([,.]\d+)?$/;
  return brazilianNumberRegex.test(value.replace(/\s/g, ""));
}