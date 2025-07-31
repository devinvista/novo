// Traduções de frequência para português brasileiro
export const frequencyTranslations: Record<string, string> = {
  'weekly': 'Semanal',
  'biweekly': 'Quinzenal', 
  'monthly': 'Mensal',
  'quarterly': 'Trimestral'
};

// Traduz frequência do inglês para português
export function translateFrequency(frequency: string): string {
  return frequencyTranslations[frequency] || frequency;
}

// Traduz frequência do português para inglês (para enviar ao backend)
export function translateFrequencyToEnglish(frequency: string): string {
  const reverseMap: Record<string, string> = {
    'Semanal': 'weekly',
    'Quinzenal': 'biweekly',
    'Mensal': 'monthly', 
    'Trimestral': 'quarterly'
  };
  return reverseMap[frequency] || frequency;
}