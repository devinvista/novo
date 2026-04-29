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

// REMOVIDA: convertDatabaseToBR era duplicata de formatBrazilianNumber
// Use formatBrazilianNumber diretamente

/**
 * Implementação interna do parser BR → number. Retorna `null` quando o valor
 * de entrada é não-vazio mas não pode ser interpretado como um número
 * brasileiro válido (ex.: "abc,xyz", "10..5", "1,2,3"). Vazio/null/undefined
 * retornam 0.
 *
 * As funções públicas decidem se devolvem 0 (legacy) ou lançam erro (strict).
 */
function tryParseBRNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined) return 0;
  const stringValue = value.toString().trim();
  if (stringValue === "") return 0;

  // Apenas caracteres permitidos: dígitos, vírgula, ponto e sinal de menos no início.
  if (!/^-?[\d.,]+$/.test(stringValue)) return null;

  // Sinal opcional. Trabalhamos com a magnitude e reaplicamos no final.
  const negative = stringValue.startsWith('-');
  const magnitude = negative ? stringValue.slice(1) : stringValue;
  if (magnitude === "" || /^[.,]/.test(magnitude) || /[.,]$/.test(magnitude)) return null;
  if (/[.,]{2,}/.test(magnitude)) return null;

  // Caso: número de banco "padrão" (apenas dígitos e até 2 casas após o ponto)
  // que NÃO seja "X.YYY" exato (separador de milhares BR).
  if (/^\d+\.\d{1,2}$/.test(magnitude)) {
    const parsed = parseFloat(magnitude);
    return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
  }

  const hasComma = magnitude.includes(',');
  const hasDot = magnitude.includes('.');
  let cleanValue: string;

  if (hasComma && hasDot) {
    // Formato: 1.234.567,89 — vírgula é decimal, pontos são milhares.
    if ((magnitude.match(/,/g) || []).length > 1) return null;
    const parts = magnitude.split(',');
    const wholePart = parts[0].replace(/\./g, '');
    const decimalPart = parts[1];
    if (!/^\d+$/.test(wholePart) || !/^\d+$/.test(decimalPart)) return null;
    cleanValue = `${wholePart}.${decimalPart}`;
  } else if (hasComma && !hasDot) {
    if ((magnitude.match(/,/g) || []).length > 1) return null;
    const [whole, frac = ""] = magnitude.split(',');
    if (!/^\d+$/.test(whole) || !/^\d*$/.test(frac)) return null;
    if (frac.length <= 2) {
      cleanValue = `${whole}.${frac || '0'}`;
    } else {
      // 3+ dígitos após vírgula tratamos como separador de milhares (ex.: "2,500" → 2500)
      cleanValue = `${whole}${frac}`;
    }
  } else if (hasDot && !hasComma) {
    const parts = magnitude.split('.');
    // Se há múltiplos pontos OU exatamente 3 dígitos no último grupo, é separador de milhares.
    const lastGroup = parts[parts.length - 1];
    if (parts.length > 2 || (parts.length === 2 && lastGroup.length === 3)) {
      if (parts.some((p, i) => (i === 0 ? !/^\d{1,3}$/.test(p) : !/^\d{3}$/.test(p)))) return null;
      cleanValue = parts.join('');
    } else {
      cleanValue = magnitude;
    }
  } else {
    cleanValue = magnitude;
  }

  const parsed = parseFloat(cleanValue);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

/**
 * Converte valor brasileiro (vírgula, pontos) para número.
 *
 * COMPATIBILIDADE: para entradas inválidas devolve 0 e emite um WARN no
 * console — isso preserva o comportamento histórico de muitos pontos do
 * código que esperavam fallback silencioso. Para validação rigorosa em
 * fronteiras (rotas/serviços que recebem input do usuário), use
 * `convertBRToDatabaseStrict`, que lança `Error` em entrada inválida.
 */
export function convertBRToDatabase(value: string | number): number {
  const result = tryParseBRNumber(value);
  if (result === null) {
    // Antes esse caminho retornava 0 silenciosamente, escondendo erros de
    // digitação que viravam metas zeradas.
    console.warn(
      `[formatters] convertBRToDatabase recebeu valor não numérico (${JSON.stringify(value)}); ` +
      `aplicando fallback 0. Use convertBRToDatabaseStrict para validar a entrada.`
    );
    return 0;
  }
  return result;
}

/**
 * Versão estrita: lança `Error` para entradas não numéricas. Use sempre que
 * o valor venha de input do usuário e precisar ser validado antes de gravar.
 */
export function convertBRToDatabaseStrict(value: string | number): number {
  const result = tryParseBRNumber(value);
  if (result === null) {
    throw new Error(
      `Valor numérico inválido: ${JSON.stringify(value)}. ` +
      `Use formato brasileiro (ex.: 1.234,56) ou padrão (1234.56).`
    );
  }
  return result;
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