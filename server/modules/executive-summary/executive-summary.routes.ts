import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { formatBrazilianNumber } from "../../shared/formatters";

export const executiveSummaryRouter: Router = Router();

executiveSummaryRouter.use(requireAuth);

executiveSummaryRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const currentUserId = req.user?.id;

    const objectives = await storage.getObjectives(currentUserId ? { currentUserId } : {});
    const keyResults = await storage.getKeyResults(currentUserId ? { currentUserId } : {});
    const actions = await storage.getActions(currentUserId ? { currentUserId } : {});
    const checkpoints = await storage.getCheckpoints(undefined, currentUserId);

    const totalObjectives = objectives.length;
    const totalKeyResults = keyResults.length;
    const totalActions = actions.length;
    const totalCheckpoints = checkpoints.length;

    const completedObjectives = objectives.filter((obj: any) => obj.status === "completed").length;
    const completedKeyResults = keyResults.filter((kr: any) => kr.progress >= 100).length;
    const completedActions = actions.filter((action: any) => action.status === "completed").length;
    const completedCheckpoints = checkpoints.filter((cp: any) => cp.status === "completed").length;

    const objectiveCompletionRate =
      totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
    const keyResultCompletionRate =
      totalKeyResults > 0 ? (completedKeyResults / totalKeyResults) * 100 : 0;
    const actionCompletionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
    const checkpointCompletionRate =
      totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

    const avgKeyResultProgress =
      keyResults.length > 0
        ? keyResults.reduce((sum: number, kr: any) => sum + (kr.progress || 0), 0) /
          keyResults.length
        : 0;

    const objectivesByRegion = objectives.reduce((acc: Record<number, number>, obj: any) => {
      acc[obj.regionId] = (acc[obj.regionId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const topKeyResults = keyResults
      .slice()
      .sort((a: any, b: any) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 5)
      .map((kr: any) => ({
        title: kr.title,
        progress: kr.progress || 0,
        currentValue: kr.currentValue ? formatBrazilianNumber(kr.currentValue) : "0",
        targetValue: kr.targetValue ? formatBrazilianNumber(kr.targetValue) : "0",
      }));

    const strategicIndicators = await storage.getStrategicIndicators();

    const currentDate = new Date();
    const overdueObjectives = objectives.filter(
      (obj: any) => new Date(obj.endDate) < currentDate && obj.status !== "completed"
    ).length;
    const overdueActions = actions.filter(
      (action: any) =>
        action.dueDate && new Date(action.dueDate) < currentDate && action.status !== "completed"
    ).length;

    const mainObjectives = objectives
      .slice()
      .sort((a: any, b: any) => (b.keyResults?.length || 0) - (a.keyResults?.length || 0))
      .slice(0, 3)
      .map((obj: any) => ({
        title: obj.title,
        description: obj.description,
        status: obj.status,
        progress:
          obj.keyResults && obj.keyResults.length > 0
            ? obj.keyResults.reduce((sum: number, kr: any) => sum + (kr.progress || 0), 0) /
              obj.keyResults.length
            : 0,
        keyResultsCount: obj.keyResults?.length || 0,
        actionsCount: obj.actions?.length || 0,
      }));

    const quarterStart = new Date(
      new Date().getFullYear(),
      Math.floor(new Date().getMonth() / 3) * 3,
      1
    );

    res.json({
      overview: {
        totalObjectives,
        totalKeyResults,
        totalActions,
        totalCheckpoints,
        objectiveCompletionRate: Math.round(objectiveCompletionRate),
        keyResultCompletionRate: Math.round(keyResultCompletionRate),
        actionCompletionRate: Math.round(actionCompletionRate),
        checkpointCompletionRate: Math.round(checkpointCompletionRate),
        avgKeyResultProgress: Math.round(avgKeyResultProgress),
      },
      mainObjectives,
      topKeyResults,
      performance: {
        objectivesOnTrack: objectives.filter((obj: any) => obj.status === "active").length,
        objectivesAtRisk: overdueObjectives,
        actionsOverdue: overdueActions,
        strategicIndicatorsCount: strategicIndicators.length,
      },
      distribution: {
        objectivesByRegion,
        activeQuarter: (() => {
          const now = new Date();
          const q = Math.floor(now.getMonth() / 3) + 1;
          return `${now.getFullYear()}-T${q}`;
        })(),
      },
      trends: {
        objectivesCreatedThisQuarter: objectives.filter(
          (obj: any) => new Date(obj.createdAt) >= quarterStart
        ).length,
        keyResultsWithHighProgress: keyResults.filter((kr: any) => (kr.progress || 0) >= 75).length,
        completedActionsThisQuarter: actions.filter((action: any) => {
          if (action.status !== "completed" || !action.updatedAt) return false;
          return new Date(action.updatedAt) >= quarterStart;
        }).length,
      },
    });
  })
);
