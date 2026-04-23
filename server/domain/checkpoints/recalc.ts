import { storage } from "../../storage";
import { convertBRToDatabase } from "../../shared/formatters";

/**
 * Recalcula currentValue/progress de um Key Result a partir dos seus checkpoints.
 * Usa o checkpoint mais recente (por dueDate) com actualValue preenchido.
 * Em seguida propaga progresso para o objetivo pai e — em cascata — para os
 * ancestrais (até 16 níveis), suportando OKRs hierárquicos.
 *
 * IMPORTANTE: chamado SEM userId — controle de acesso já deve ter sido feito
 * no endpoint que invocou esta função.
 */
export async function recalcKeyResultFromCheckpoints(keyResultId: number): Promise<void> {
  try {
    const allCheckpoints = await storage.getCheckpoints(keyResultId);

    const withValue = allCheckpoints
      .filter((cp: any) => {
        const v = cp.actualValue;
        return v !== null && v !== undefined && v !== "";
      })
      .sort(
        (a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );

    const currentKR = await storage.getKeyResult(keyResultId);
    if (!currentKR) return;

    const krTargetValue = convertBRToDatabase(currentKR.targetValue || "0");
    const latestValueRaw = withValue.length > 0 ? withValue[0].actualValue : "0";
    const currentValueNum = convertBRToDatabase(latestValueRaw || "0");
    const newKRProgress =
      krTargetValue > 0 ? (currentValueNum / krTargetValue) * 100 : 0;

    await storage.updateKeyResult(keyResultId, {
      currentValue: currentValueNum.toString(),
      progress: newKRProgress.toString(),
    });

    if (currentKR.objectiveId) {
      await recalcObjectiveCascade(currentKR.objectiveId);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error recalculating Key Result from checkpoints:", err);
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
