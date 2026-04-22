import { objectives } from '@shared/pg-schema';
import { db } from '../pg-db';
import { getQuarterlyPeriods } from '../quarterly-periods';
import type { ObjectiveRepo } from './objective.repo';
import type { KeyResultRepo } from './key-result.repo';
import type { ActionRepo } from './action.repo';

export class DashboardRepo {
  constructor(
    private readonly objectiveRepo: ObjectiveRepo,
    private readonly keyResultRepo: KeyResultRepo,
    private readonly actionRepo: ActionRepo,
  ) {}

  async getAvailableQuarters(): Promise<any[]> {
    const allObjectives = await db.select({
      startDate: objectives.startDate,
      endDate: objectives.endDate,
    }).from(objectives);

    const fallback = [
      { id: '2025-T1', name: 'T1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
      { id: '2025-T2', name: 'T2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
      { id: '2025-T3', name: 'T3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
      { id: '2025-T4', name: 'T4 2025', startDate: '2025-10-01', endDate: '2025-12-31' },
    ];

    if (allObjectives.length === 0) return fallback;

    const dates = allObjectives.map(obj => [obj.startDate, obj.endDate]).flat();
    const earliestDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    const quarterPeriods = getQuarterlyPeriods(earliestDate, latestDate);

    const quarters = quarterPeriods.map(period => ({
      id: period.quarter,
      name: `T${period.quarterNumber} ${period.year}`,
      startDate: period.startDate.toISOString().split('T')[0],
      endDate: period.endDate.toISOString().split('T')[0],
    }));

    return quarters.length > 0 ? quarters : fallback;
  }

  async getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any): Promise<any> {
    if (!currentUserId) {
      return { objectives: [], keyResults: [], actions: [] };
    }

    const objectiveFilters = {
      currentUserId,
      regionId: filters?.regionId,
      subRegionId: filters?.subRegionId,
      serviceLineId: filters?.serviceLineId,
    };

    const userObjectives = await this.objectiveRepo.getObjectives(objectiveFilters);

    let quarterObjectives = userObjectives;
    if (quarter && quarter !== 'all') {
      const quarterMatch = quarter.match(/(\d{4})-T(\d)/);
      if (quarterMatch) {
        const year = parseInt(quarterMatch[1]);
        const quarterNum = parseInt(quarterMatch[2]);
        const quarterStartMonth = (quarterNum - 1) * 3;
        const quarterStartDate = new Date(year, quarterStartMonth, 1);
        const quarterEndDate = new Date(year, quarterStartMonth + 3, 0);

        quarterObjectives = userObjectives.filter(obj => {
          const objStart = new Date(obj.startDate);
          const objEnd = new Date(obj.endDate);
          return objStart <= quarterEndDate && objEnd >= quarterStartDate;
        });
      }
    }

    const objectiveIds = quarterObjectives.map(obj => obj.id);
    let quarterKeyResults: any[] = [];
    let quarterActions: any[] = [];

    if (objectiveIds.length > 0) {
      const userKeyResults = await this.keyResultRepo.getKeyResults({ currentUserId });
      quarterKeyResults = userKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));

      if (filters?.serviceLineId) {
        quarterKeyResults = quarterKeyResults.filter(kr => kr.serviceLineId === filters.serviceLineId);
      }

      const keyResultIds = quarterKeyResults.map(kr => kr.id);
      if (keyResultIds.length > 0) {
        const userActions = await this.actionRepo.getActions({ currentUserId });
        quarterActions = userActions.filter(action => keyResultIds.includes(action.keyResultId));
      }
    }

    return {
      objectives: quarterObjectives,
      keyResults: quarterKeyResults,
      actions: quarterActions,
    };
  }

  async getQuarterlyStats(): Promise<any[]> {
    const allObjectives = await db.select({
      startDate: objectives.startDate,
      endDate: objectives.endDate,
    }).from(objectives);

    const dates = allObjectives.map(obj => [obj.startDate, obj.endDate]).flat();
    if (dates.length === 0) return [];

    const earliestDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    const quarterPeriods = getQuarterlyPeriods(earliestDate, latestDate);

    const stats = [];
    for (const period of quarterPeriods) {
      const quarterData = await this.getQuarterlyData(period.quarter);
      stats.push({
        period: period.quarter,
        name: `T${period.quarterNumber} ${period.year}`,
        ...quarterData,
      });
    }

    return stats;
  }

  async getDashboardKPIs(currentUserId?: number, filters?: any): Promise<any> {
    let objectivesResult, keyResultsResult, actionsResult;

    if (filters?.quarter && filters.quarter !== 'all') {
      const allObjectives = await this.objectiveRepo.getObjectives({ currentUserId });
      objectivesResult = allObjectives.filter(obj => {
        const startDate = new Date(obj.startDate);
        const endDate = new Date(obj.endDate);
        const [year, quarter] = filters.quarter.split('-T');
        const quarterStart = new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
        const quarterEnd = new Date(parseInt(year), parseInt(quarter) * 3, 0);
        return startDate <= quarterEnd && endDate >= quarterStart;
      });

      const objectiveIds = objectivesResult.map(obj => obj.id);
      const allKeyResults = await this.keyResultRepo.getKeyResults({ currentUserId });
      const allActions = await this.actionRepo.getActions({ currentUserId });

      keyResultsResult = allKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));
      const keyResultIds = keyResultsResult.map(kr => kr.id);
      actionsResult = allActions.filter(action => keyResultIds.includes(action.keyResultId));
    } else {
      objectivesResult = await this.objectiveRepo.getObjectives({ currentUserId, ...filters });
      keyResultsResult = await this.keyResultRepo.getKeyResults({ currentUserId });
      actionsResult = await this.actionRepo.getActions({ currentUserId });
    }

    const completedObjectives = objectivesResult.filter(obj => obj.status === 'completed').length;
    const onTrackObjectives = objectivesResult.filter(obj => obj.status === 'active').length;
    const delayedObjectives = objectivesResult.filter(obj => obj.status === 'delayed').length;

    let totalProgress = 0;
    let validKRCount = 0;
    for (const kr of keyResultsResult) {
      const currentValue = parseFloat(kr.currentValue || '0');
      const targetValue = parseFloat(kr.targetValue || '1');
      if (!isNaN(currentValue) && !isNaN(targetValue) && targetValue > 0) {
        totalProgress += Math.min((currentValue / targetValue) * 100, 100);
        validKRCount++;
      }
    }

    const completionRate = validKRCount > 0 ? Math.round(totalProgress / validKRCount) : 0;

    return {
      objectives: objectivesResult.length,
      keyResults: keyResultsResult.length,
      actions: actionsResult.length,
      checkpoints: 0,
      completionRate,
      onTrackObjectives,
      delayedObjectives,
      activeUsers: 1,
      completedObjectives,
    };
  }
}
