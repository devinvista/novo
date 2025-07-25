// MySQL Performance Optimization with Caching Layer
import { LRUCache } from 'lru-cache';

export class MySQLPerformanceCache {
  private static instance: MySQLPerformanceCache;
  private userCache: LRUCache<number, any>;
  private referenceCache: LRUCache<string, any>;
  private queryCache: LRUCache<string, any>;

  constructor() {
    // User cache - 500 users max, 10 minute TTL
    this.userCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 10 // 10 minutes
    });

    // Reference data cache - longer TTL since it changes less
    this.referenceCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 30 // 30 minutes
    });

    // Query cache for complex queries - shorter TTL
    this.queryCache = new LRUCache({
      max: 200,
      ttl: 1000 * 60 * 5 // 5 minutes
    });
  }

  static getInstance(): MySQLPerformanceCache {
    if (!MySQLPerformanceCache.instance) {
      MySQLPerformanceCache.instance = new MySQLPerformanceCache();
    }
    return MySQLPerformanceCache.instance;
  }

  // User caching methods
  getCachedUser(id: number): any | undefined {
    return this.userCache.get(id);
  }

  setCachedUser(id: number, user: any): void {
    this.userCache.set(id, user);
  }

  invalidateUser(id: number): void {
    this.userCache.delete(id);
  }

  // Reference data caching
  getCachedReference(key: string): any | undefined {
    return this.referenceCache.get(key);
  }

  setCachedReference(key: string, data: any): void {
    this.referenceCache.set(key, data);
  }

  invalidateReference(key: string): void {
    this.referenceCache.delete(key);
  }

  // Query result caching
  getCachedQuery(query: string): any | undefined {
    return this.queryCache.get(query);
  }

  setCachedQuery(query: string, result: any): void {
    this.queryCache.set(query, result);
  }

  invalidateQuery(pattern: string): void {
    // Invalidate queries matching pattern
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Clear all caches
  clearAll(): void {
    this.userCache.clear();
    this.referenceCache.clear();
    this.queryCache.clear();
  }
}

// Performance monitoring utilities
export class MySQLPerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map();

  static startQuery(queryName: string): number {
    return Date.now();
  }

  static endQuery(queryName: string, startTime: number): void {
    const duration = Date.now() - startTime;
    
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }
    
    const times = this.queryTimes.get(queryName)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
  }

  static getQueryStats(queryName: string): { avg: number; min: number; max: number; count: number } | null {
    const times = this.queryTimes.get(queryName);
    if (!times || times.length === 0) return null;

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  }

  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      stats[queryName] = this.getQueryStats(queryName);
    }
    
    return stats;
  }
}

// Connection pool optimizer
export class MySQLConnectionOptimizer {
  private static activeQueries = 0;
  private static maxConcurrentQueries = 10;

  static async executeWithLimit<T>(operation: () => Promise<T>): Promise<T> {
    // Wait if too many concurrent queries
    while (this.activeQueries >= this.maxConcurrentQueries) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.activeQueries++;
    
    try {
      return await operation();
    } finally {
      this.activeQueries--;
    }
  }

  static getStats(): { activeQueries: number; maxConcurrentQueries: number } {
    return {
      activeQueries: this.activeQueries,
      maxConcurrentQueries: this.maxConcurrentQueries
    };
  }
}