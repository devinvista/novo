import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { formatBrazilianNumber } from "../../shared/formatters";

export const executiveSummaryRouter: Router = Router();

executiveSummaryRouter.use(requireAuth);

type ObjectiveSummary = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  regionId?: number | null;
  endDate?: string | null;
  createdAt?: string | Date;
  keyResults?: Array<{ progress?: number | null }>;
  actions?: Array<unknown>;
};

type KeyResultSummary = {
  title: string;
  progress?: number | null;
  currentValue?: string | null;
  targetValue?: string | null;
};

type ActionSummary = {
  status: string;
  dueDate?: string | null;
  updatedAt?: string | Date | null;
};

type CheckpointSummary = {
  status: string;
};

executiveSummaryRouter.get(
  "/",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const currentUserId = req.user.id;

    const objectives = (await storage.getObjectives({ currentUserId })) as ObjectiveSummary[];
    const keyResults = (await storage.getKeyResults({ currentUserId })) as KeyResultSummary[];
    const actions = (await storage.getActions({ currentUserId })) as ActionSummary[];
    const checkpoints = (await storage.getCheckpoints(undefined, currentUserId)) as CheckpointSummary[];

    const totalObjectives = objectives.length;
    const totalKeyResults = keyResults.length;
    const totalActions = actions.length;
    const totalCheckpoints = checkpoints.length;

    const completedObjectives = objectives.filter((obj) => obj.status === "completed").length;
    const completedKeyResults = keyResults.filter((kr) => (kr.progress ?? 0) >= 100).length;
    const completedActions = actions.filter((action) => action.status === "completed").length;
    const completedCheckpoints = checkpoints.filter((cp) => cp.status === "completed").length;

    const objectiveCompletionRate =
      totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
    const keyResultCompletionRate =
      totalKeyResults > 0 ? (completedKeyResults / totalKeyResults) * 100 : 0;
    const actionCompletionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
    const checkpointCompletionRate =
      totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

    const avgKeyResultProgress =
      keyResults.length > 0
        ? keyResults.reduce((sum, kr) => sum + (kr.progress ?? 0), 0) / keyResults.length
        : 0;

    const objectivesByRegion = objectives.reduce<Record<number, number>>((acc, obj) => {
      if (obj.regionId != null) acc[obj.regionId] = (acc[obj.regionId] || 0) + 1;
      return acc;
    }, {});

    const topKeyResults = keyResults
      .slice()
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 5)
      .map((kr) => ({
        title: kr.title,
        progress: kr.progress ?? 0,
        currentValue: kr.currentValue ? formatBrazilianNumber(kr.currentValue) : "0",
        targetValue: kr.targetValue ? formatBrazilianNumber(kr.targetValue) : "0",
      }));

    const strategicIndicators = await storage.getStrategicIndicators();

    const currentDate = new Date();
    const overdueObjectives = objectives.filter(
      (obj) => obj.endDate && new Date(obj.endDate) < currentDate && obj.status !== "completed"
    ).length;
    const overdueActions = actions.filter(
      (action) =>
        action.dueDate && new Date(action.dueDate) < currentDate && action.status !== "completed"
    ).length;

    const mainObjectives = objectives
      .slice()
      .sort((a, b) => (b.keyResults?.length || 0) - (a.keyResults?.length || 0))
      .slice(0, 3)
      .map((obj) => ({
        title: obj.title,
        description: obj.description,
        status: obj.status,
        progress:
          obj.keyResults && obj.keyResults.length > 0
            ? obj.keyResults.reduce((sum, kr) => sum + (kr.progress ?? 0), 0) /
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
        objectivesOnTrack: objectives.filter((obj) => obj.status === "active").length,
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
          (obj) => obj.createdAt && new Date(obj.createdAt) >= quarterStart
        ).length,
        keyResultsWithHighProgress: keyResults.filter((kr) => (kr.progress ?? 0) >= 75).length,
        completedActionsThisQuarter: actions.filter((action) => {
          if (action.status !== "completed" || !action.updatedAt) return false;
          return new Date(action.updatedAt) >= quarterStart;
        }).length,
      },
    });
  })
);
