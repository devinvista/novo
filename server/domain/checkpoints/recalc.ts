import { storage } from "../../storage";
import { convertBRToDatabase } from "../../shared/formatters";

/**
 * Recalculates currentValue/progress of a Key Result based on its checkpoints.
 * Uses the most recent checkpoint (by dueDate) that has a populated actualValue,
 * regardless of status. Also updates the parent objective's progress.
 *
 * IMPORTANT: invoked WITHOUT userId — access control must already have been
 * verified in the calling endpoint (accessing storage directly bypasses the
 * region filter, required for operacional/gestor users without regionIds).
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
      const objectiveKRs = await storage.getKeyResults({
        objectiveId: currentKR.objectiveId,
      });
      if (objectiveKRs.length > 0) {
        const totalProgress = objectiveKRs.reduce((sum: number, kr: any) => {
          if (kr.id === keyResultId) {
            return sum + Math.min(newKRProgress, 100);
          }
          const current = parseFloat(kr.currentValue || "0");
          const target = parseFloat(kr.targetValue || "1");
          const p = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          return sum + p;
        }, 0);
        const avgProgress = totalProgress / objectiveKRs.length;
        await storage.updateObjective(currentKR.objectiveId, {
          progress: avgProgress.toFixed(2),
        } as any);
      }
    }
  } catch (err) {
    console.error("Error recalculating Key Result from checkpoints:", err);
  }
}
