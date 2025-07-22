// Utility functions for quarterly period calculations

export interface QuarterlyPeriod {
  quarter: string; // e.g., "2025-Q1"
  year: number;
  quarterNumber: 1 | 2 | 3 | 4;
  startDate: Date;
  endDate: Date;
}

/**
 * Get quarterly periods for a date range
 */
export function getQuarterlyPeriods(startDate: string | Date, endDate: string | Date): QuarterlyPeriod[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: QuarterlyPeriod[] = [];
  
  // Start from the quarter of the start date
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11
    const quarterNumber = Math.floor(month / 3) + 1 as 1 | 2 | 3 | 4;
    
    // Calculate quarter start and end dates
    const quarterStartMonth = (quarterNumber - 1) * 3;
    const quarterStart = new Date(year, quarterStartMonth, 1);
    const quarterEnd = new Date(year, quarterStartMonth + 3, 0); // Last day of quarter
    
    const quarter = `${year}-Q${quarterNumber}`;
    
    // Check if this quarter overlaps with our date range
    const overlapStart = new Date(Math.max(start.getTime(), quarterStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), quarterEnd.getTime()));
    
    if (overlapStart <= overlapEnd) {
      periods.push({
        quarter,
        year,
        quarterNumber,
        startDate: quarterStart,
        endDate: quarterEnd
      });
    }
    
    // Move to next quarter
    currentDate = new Date(year, quarterStartMonth + 3, 1);
  }
  
  return periods;
}

/**
 * Get quarterly period for a single date
 */
export function getQuarterlyPeriod(date: string | Date): QuarterlyPeriod {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const quarterNumber = Math.floor(month / 3) + 1 as 1 | 2 | 3 | 4;
  
  const quarterStartMonth = (quarterNumber - 1) * 3;
  const quarterStart = new Date(year, quarterStartMonth, 1);
  const quarterEnd = new Date(year, quarterStartMonth + 3, 0);
  
  return {
    quarter: `${year}-Q${quarterNumber}`,
    year,
    quarterNumber,
    startDate: quarterStart,
    endDate: quarterEnd
  };
}

/**
 * Check if a date range spans multiple quarters
 */
export function spansMultipleQuarters(startDate: string | Date, endDate: string | Date): boolean {
  return getQuarterlyPeriods(startDate, endDate).length > 1;
}

/**
 * Get the current quarterly period
 */
export function getCurrentQuarter(): QuarterlyPeriod {
  return getQuarterlyPeriod(new Date());
}

/**
 * Get all quarters for a given year
 */
export function getQuartersForYear(year: number): QuarterlyPeriod[] {
  return [1, 2, 3, 4].map(quarterNumber => ({
    quarter: `${year}-Q${quarterNumber}`,
    year,
    quarterNumber: quarterNumber as 1 | 2 | 3 | 4,
    startDate: new Date(year, (quarterNumber - 1) * 3, 1),
    endDate: new Date(year, quarterNumber * 3, 0)
  }));
}

/**
 * Format quarterly period for display
 */
export function formatQuarter(quarter: string): string {
  const [year, q] = quarter.split('-Q');
  const quarterNames = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];
  return `${quarterNames[parseInt(q) - 1]} ${year}`;
}

/**
 * Get quarterly period statistics for objectives/KRs/actions
 */
export function getQuarterlyStats(items: any[], dateField: string): { [quarter: string]: number } {
  const stats: { [quarter: string]: number } = {};
  
  items.forEach(item => {
    if (item[dateField]) {
      const period = getQuarterlyPeriod(item[dateField]);
      stats[period.quarter] = (stats[period.quarter] || 0) + 1;
    }
  });
  
  return stats;
}