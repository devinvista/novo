// Performance monitoring dashboard for MySQL OKR system
import { MySQLPerformanceMonitor, MySQLConnectionOptimizer, MySQLPerformanceCache } from './mysql-performance-cache';

export interface PerformanceStats {
  queryStats: Record<string, any>;
  connectionStats: { activeQueries: number; maxConcurrentQueries: number };
  cacheStats: { 
    userCacheSize: number; 
    referenceCacheSize: number; 
    queryCacheSize: number;
  };
  systemHealth: {
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    uptime: number;
  };
}

export class PerformanceDashboard {
  private static startTime = Date.now();

  static getPerformanceStats(): PerformanceStats {
    const queryStats = MySQLPerformanceMonitor.getAllStats();
    const connectionStats = MySQLConnectionOptimizer.getStats();
    const cache = MySQLPerformanceCache.getInstance();

    // Calculate system health metrics
    let totalQueries = 0;
    let totalTime = 0;
    let slowQueries = 0;

    Object.values(queryStats).forEach((stat: any) => {
      if (stat) {
        totalQueries += stat.count;
        totalTime += stat.avg * stat.count;
        if (stat.max > 1000) slowQueries++;
      }
    });

    const averageQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;
    const uptime = Date.now() - this.startTime;

    return {
      queryStats,
      connectionStats,
      cacheStats: {
        userCacheSize: 0, // Would need to expose cache size from LRU
        referenceCacheSize: 0,
        queryCacheSize: 0
      },
      systemHealth: {
        averageQueryTime,
        slowQueries,
        totalQueries,
        uptime
      }
    };
  }

  static generateHealthReport(): string {
    const stats = this.getPerformanceStats();
    
    return `
=== MySQL OKR System Performance Report ===
Uptime: ${Math.round(stats.systemHealth.uptime / 1000 / 60)} minutes
Total Queries: ${stats.systemHealth.totalQueries}
Average Query Time: ${stats.systemHealth.averageQueryTime.toFixed(2)}ms
Slow Queries (>1s): ${stats.systemHealth.slowQueries}
Active Connections: ${stats.connectionStats.activeQueries}/${stats.connectionStats.maxConcurrentQueries}

=== Query Performance ===
${Object.entries(stats.queryStats)
  .map(([name, stat]: [string, any]) => 
    `${name}: avg ${stat?.avg.toFixed(2)}ms, min ${stat?.min}ms, max ${stat?.max}ms (${stat?.count} calls)`
  )
  .join('\n')}

=== Recommendations ===
${stats.systemHealth.averageQueryTime > 500 ? '⚠️  Average query time is high. Consider optimizing slow queries.' : '✅ Query performance is good.'}
${stats.systemHealth.slowQueries > 5 ? '⚠️  Multiple slow queries detected. Review query optimization.' : '✅ No significant slow queries.'}
${stats.connectionStats.activeQueries / stats.connectionStats.maxConcurrentQueries > 0.8 ? '⚠️  High connection usage. Consider increasing pool size.' : '✅ Connection usage is healthy.'}
`;
  }

  static logPerformanceReport(): void {
    console.log(this.generateHealthReport());
  }
}

// Performance optimization recommendations
export class PerformanceOptimizer {
  static optimizeQueryPerformance(queryName: string): void {
    const stats = MySQLPerformanceMonitor.getQueryStats(queryName);
    
    if (!stats) {
      console.log(`No performance data available for query: ${queryName}`);
      return;
    }

    console.log(`\n=== Optimization Suggestions for ${queryName} ===`);
    
    if (stats.avg > 1000) {
      console.log('🔴 CRITICAL: Average query time > 1s');
      console.log('Suggestions:');
      console.log('- Add database indexes on frequently queried columns');
      console.log('- Optimize WHERE clauses and JOINs');
      console.log('- Consider query result caching');
      console.log('- Review table structure for normalization');
    } else if (stats.avg > 500) {
      console.log('🟡 WARNING: Average query time > 500ms');
      console.log('Suggestions:');
      console.log('- Consider adding indexes');
      console.log('- Implement result caching for this query');
    } else {
      console.log('✅ Query performance is acceptable');
    }

    if (stats.max > stats.avg * 3) {
      console.log('⚠️  High query time variance detected');
      console.log('- Inconsistent performance may indicate resource contention');
      console.log('- Consider connection pooling optimization');
    }

    console.log(`Stats: avg ${stats.avg.toFixed(2)}ms, max ${stats.max}ms, count ${stats.count}`);
  }

  static enableQueryMonitoring(): void {
    console.log('🚀 Enhanced MySQL Performance Monitoring Enabled');
    console.log('Features activated:');
    console.log('- Query execution time tracking');
    console.log('- Connection pool monitoring');
    console.log('- LRU cache for frequently accessed data');
    console.log('- Automatic slow query detection');
    console.log('- Performance recommendations');
    
    // Log performance report every 5 minutes
    setInterval(() => {
      PerformanceDashboard.logPerformanceReport();
    }, 5 * 60 * 1000);
  }
}

// Auto-start performance monitoring
PerformanceOptimizer.enableQueryMonitoring();