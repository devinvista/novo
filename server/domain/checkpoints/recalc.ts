import { storage } from "../../storage";
import { convertBRToDatabase } from "../../shared/formatters";
import { logger } from "../../infra/logger";

/**
 * Recalcula currentValue/progress de um Key Result a partir dos seus checkpoints.
 * Usa o checkpoint mais recente (por dueDate) com actualValue preenchido.
 * Em seguida propaga progresso para o objetivo pai e — em cascata — para os
 * ancestrais (até 16 níveis), suportando OKRs hierárquicos.
 *
 * IMPORTANTE: chamado SEM userId — controle de acesso já deve ter sido feito
 * no endpoint que invocou esta função.
 *
 * Erros são propagados ao chamador para que o handler central de erros possa
 * notificar o usuário. Anteriormente eram engolidos silenciosamente, fazendo
 * com que o usuário visse "sucesso" mesmo quando o recálculo falhava — o que
 * gerava progresso inconsistente sem aviso visível.
 */
export async function recalcKeyResultFromCheckpoints(keyResultId: number): Promise<void> {
  const allCheckpoints = await storage.getCheckpoints(keyResultId);

  // Apenas checkpoints já atualizados (status "completed") representam medições reais.
  // Checkpoints pendentes têm actualValue=0 por padrão e não devem zerar o progresso do KR.
  const withValue = allCheckpoints
    .filter((cp: any) => {
      const v = cp.actualValue;
      if (v === null || v === undefined || v === "") return false;
      return cp.status === "completed";
    })
    .sort(
      (a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );

  const currentKR = await storage.getKeyResult(keyResultId);
  if (!currentKR) return;

  const krTargetValue = convertBRToDatabase(currentKR.targetValue || "0");
  const latestValueRaw = withValue.length > 0 ? withValue[0].actualValue : "0";
  const currentValueNum = convertBRToDatabase(latestValueRaw || "0");
  const rawProgress =
    krTargetValue > 0 ? (currentValueNum / krTargetValue) * 100 : 0;
  const safeProgress = Number.isFinite(rawProgress) ? rawProgress : 0;
  const newKRProgress = Math.max(0, Math.min(safeProgress, 999.99));

  try {
    await storage.updateKeyResult(keyResultId, {
      currentValue: currentValueNum.toString(),
      progress: newKRProgress.toFixed(2),
    });

    if (currentKR.objectiveId) {
      await recalcObjectiveCascade(currentKR.objectiveId);
    }
  } catch (err) {
    logger.error(
      { err, keyResultId, objectiveId: currentKR.objectiveId },
      "Falha ao recalcular Key Result a partir dos checkpoints"
    );
    throw err;
  }
}

/**
 * Recalcula o progresso de um objetivo (média dos KRs) e propaga em cascata
 * para os ancestrais (cujo progresso é a média dos filhos diretos).
 */
export async function recalcObjectiveCascade(objectiveId: number): Promise<void> {
  await storage.objectives.recalcProgressFromKeyResults(objectiveId);
  const ancestors = await storage.objectives.getAncestorIds(objectiveId);
  for (const ancestorId of ancestors) {
    await storage.objectives.recalcProgressFromChildren(ancestorId);
  }
}
