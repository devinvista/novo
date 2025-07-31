// Utilitários para checkpoints com padrão de cores: <85 vermelho; 85-99 amarelo; ≥100 verde

export function getProgressBadgeVariant(progress: number, dueDate?: string): "error" | "warning" | "success" | "secondary" {
  // Se tem data futura e progresso 0, ainda não é tempo de medir
  if (dueDate) {
    const today = new Date();
    const checkpointDate = new Date(dueDate);
    if (checkpointDate > today && progress === 0) {
      return "secondary";
    }
  }
  
  if (progress >= 100) return "success";
  if (progress >= 85) return "warning";
  return "error";
}

export function getProgressBadgeText(progress: number, dueDate?: string): string {
  // Se tem data futura e progresso 0, ainda não é tempo de medir
  if (dueDate) {
    const today = new Date();
    const checkpointDate = new Date(dueDate);
    if (checkpointDate > today && progress === 0) {
      return "Aguardando período";
    }
  }
  
  if (progress >= 100) return "Meta alcançada";
  if (progress >= 85) return "Quase lá";
  return "Precisa atenção";
}

export function getProgressColor(progress: number): string {
  if (progress >= 100) return "hsl(137, 62%, 42%)"; // Verde
  if (progress >= 85) return "hsl(45, 93%, 47%)"; // Amarelo
  return "hsl(0, 84%, 60%)"; // Vermelho
}

export function getProgressClassName(progress: number): string {
  if (progress >= 100) return "text-green-600 bg-green-50 border-green-200";
  if (progress >= 85) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}