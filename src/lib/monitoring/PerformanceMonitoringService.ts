// Performance Monitoring Service for Hotel Inventory Management System
// Tracks application performance, database operations, and user interactions

import { logger } from '../logging/LoggingService';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: string;
  tags?: Record<string, string>;
}

export interface DatabasePerformanceMetric {
  operation: string;
  table: string;
  duration: number;
  recordCount?: number;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
}

export interface UserInteractionMetric {
  action: string;
  component: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  userId?: string;
  metadata?: any;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
  renderTime: number;
  errorRate: number;
  timestamp: Date;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabasePerformanceMetric[] = [];
  private userMetrics: UserInteractionMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private performanceObserver?: PerformanceObserver;
  private isMonitoring = false;
  
  private readonly MAX_METRICS_STORAGE = 10000;
  private readonly METRIC_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializePerformanceMonitoring();
    this.startMetricCleanup();
  }

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      logger.warn('PerformanceMonitoring', 'Performance Observer not available');
      return;
    }

    try {
      // Monitor navigation timing
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });

      // Observe different types of performance entries
      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
      this.isMonitoring = true;
      
      logger.info('PerformanceMonitoring', 'Performance monitoring initialized');
    } catch (error) {
      logger.error('PerformanceMonitoring', 'Failed to initialize performance monitoring', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
        break;
      case 'resource':
        this.recordResourceMetrics(entry as PerformanceResourceTiming);
        break;
      case 'paint':
        this.recordPaintMetrics(entry as PerformancePaintTiming);
        break;
      case 'measure':
        this.recordCustomMeasure(entry);
        break;
    }
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'dns_lookup', value: entry.domainLookupEnd - entry.domainLookupStart, unit: 'ms' },
      { name: 'tcp_connection', value: entry.connectEnd - entry.connectStart, unit: 'ms' },
      { name: 'request_response', value: entry.responseEnd - entry.requestStart, unit: 'ms' },
      { name: 'dom_parse', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart, unit: 'ms' },
      { name: 'page_load', value: entry.loadEventEnd - entry.loadEventStart, unit: 'ms' },
      { name: 'ttfb', value: entry.responseStart - entry.requestStart, unit: 'ms' }
    ];

    metrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, metric.unit, 'navigation');
    });
  }

  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    // Record metrics for critical resources only
    const criticalResources = ['.js', '.css', '.json'];
    const isCritical = criticalResources.some(ext => entry.name.includes(ext));
    
    if (isCritical) {
      this.recordMetric(
        'resource_load_time',
        entry.responseEnd - entry.startTime,
        'ms',
        'resource',
        { resource_type: this.getResourceType(entry.name) }
      );
    }
  }

  private recordPaintMetrics(entry: PerformancePaintTiming): void {
    this.recordMetric(entry.name, entry.startTime, 'ms', 'paint');
  }

  private recordCustomMeasure(entry: PerformanceEntry): void {
    this.recordMetric(entry.name, entry.duration, 'ms', 'custom');
  }

  // Public API for recording metrics
  public recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    category: string, 
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name,
      value,
      unit,
      timestamp: new Date(),
      category,
      tags
    };

    this.metrics.push(metric);
    this.enforceMetricLimits();
    
    logger.debug('PerformanceMetric', `${name}: ${value}${unit}`, { category, tags });
  }

  public recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT'
  ): void {
    const metric: DatabasePerformanceMetric = {
      operation,
      table,
      duration,
      recordCount,
      queryType,
      timestamp: new Date()
    };

    this.dbMetrics.push(metric);
    this.enforceMetricLimits();

    // Log slow queries
    if (duration > 1000) { // 1 second threshold
      logger.warn('SlowQuery', `Slow ${queryType} on ${table}`, {
        operation,
        duration,
        recordCount
      });
    }

    logger.debug('DatabasePerformance', `${operation} on ${table}`, {
      duration,
      recordCount,
      queryType
    });
  }

  public recordUserInteraction(
    action: string,
    component: string,
    duration: number,
    success: boolean,
    userId?: string,
    metadata?: any
  ): void {
    const metric: UserInteractionMetric = {
      action,
      component,
      duration,
      success,
      timestamp: new Date(),
      userId,
      metadata
    };

    this.userMetrics.push(metric);
    this.enforceMetricLimits();

    // Log slow user interactions
    if (duration > 2000) { // 2 second threshold
      logger.warn('SlowInteraction', `Slow ${action} in ${component}`, {
        duration,
        success,
        metadata
      });
    }

    logger.debug('UserInteraction', `${action} in ${component}`, {
      duration,
      success,
      userId,
      metadata
    });
  }

  public recordSystemMetrics(): void {
    const systemMetric: SystemMetrics = {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      networkLatency: this.getNetworkLatency(),
      renderTime: this.getRenderTime(),
      errorRate: this.getErrorRate(),
      timestamp: new Date()
    };

    this.systemMetrics.push(systemMetric);
    this.enforceMetricLimits();

    logger.debug('SystemMetrics', 'System performance snapshot', systemMetric);
  }

  // Performance measurement utilities
  public measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    category: string = 'async_operation'
  ): Promise<T> {
    const startTime = performance.now();
    
    return operation()
      .then(result => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, 'ms', category);
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.recordMetric(`${name}_error`, duration, 'ms', category);
        throw error;
      });
  }

  public measureSync<T>(
    name: string,
    operation: () => T,
    category: string = 'sync_operation'
  ): T {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', category);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}_error`, duration, 'ms', category);
      throw error;
    }
  }

  // Analytics and reporting
  public getPerformanceReport(timeRange?: { start: Date; end: Date }): {
    avgResponseTime: number;
    slowestOperations: Array<{ name: string; avgDuration: number; count: number }>;
    databasePerformance: {
      avgQueryTime: number;
      slowestQueries: Array<{ operation: string; table: string; avgDuration: number }>;
      queryCountByType: Record<string, number>;
    };
    userInteractionMetrics: {
      avgInteractionTime: number;
      successRate: number;
      slowestInteractions: Array<{ action: string; component: string; avgDuration: number }>;
    };
    systemHealth: {
      avgMemoryUsage: number;
      avgRenderTime: number;
      errorRate: number;
    };
  } {
    const filteredMetrics = this.filterMetricsByTimeRange(this.metrics, timeRange);
    const filteredDbMetrics = this.filterMetricsByTimeRange(this.dbMetrics, timeRange);
    const filteredUserMetrics = this.filterMetricsByTimeRange(this.userMetrics, timeRange);
    const filteredSystemMetrics = this.filterMetricsByTimeRange(this.systemMetrics, timeRange);

    return {
      avgResponseTime: this.calculateAverage(filteredMetrics.map(m => m.value)),
      slowestOperations: this.getSlowestOperations(filteredMetrics),
      databasePerformance: this.analyzeDatabasePerformance(filteredDbMetrics),
      userInteractionMetrics: this.analyzeUserInteractions(filteredUserMetrics),
      systemHealth: this.analyzeSystemHealth(filteredSystemMetrics)
    };
  }

  public getRealtimeMetrics(): {
    currentMemoryUsage: number;
    recentErrors: number;
    activeOperations: number;
    responseTimeP95: number;
  } {
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 60000 // Last minute
    );

    const responseTimes = recentMetrics.map(m => m.value).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);

    return {
      currentMemoryUsage: this.getMemoryUsage(),
      recentErrors: this.systemMetrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 60000
      ).reduce((sum, m) => sum + m.errorRate, 0),
      activeOperations: recentMetrics.length,
      responseTimeP95: responseTimes[p95Index] || 0
    };
  }

  // Helper methods
  private filterMetricsByTimeRange<T extends { timestamp: Date }>(
    metrics: T[], 
    timeRange?: { start: Date; end: Date }
  ): T[] {
    if (!timeRange) return metrics;
    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private getSlowestOperations(metrics: PerformanceMetric[]): Array<{ name: string; avgDuration: number; count: number }> {
    const operationMap = new Map<string, { total: number; count: number }>();
    
    metrics.forEach(metric => {
      const existing = operationMap.get(metric.name) || { total: 0, count: 0 };
      operationMap.set(metric.name, {
        total: existing.total + metric.value,
        count: existing.count + 1
      });
    });

    return Array.from(operationMap.entries())
      .map(([name, data]) => ({
        name,
        avgDuration: data.total / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);
  }

  private analyzeDatabasePerformance(metrics: DatabasePerformanceMetric[]) {
    const avgQueryTime = this.calculateAverage(metrics.map(m => m.duration));
    
    const queryMap = new Map<string, { total: number; count: number }>();
    const queryCountByType: Record<string, number> = {};

    metrics.forEach(metric => {
      const key = `${metric.operation}_${metric.table}`;
      const existing = queryMap.get(key) || { total: 0, count: 0 };
      queryMap.set(key, {
        total: existing.total + metric.duration,
        count: existing.count + 1
      });

      queryCountByType[metric.queryType] = (queryCountByType[metric.queryType] || 0) + 1;
    });

    const slowestQueries = Array.from(queryMap.entries())
      .map(([key, data]) => {
        const [operation, table] = key.split('_');
        return {
          operation,
          table,
          avgDuration: data.total / data.count
        };
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      avgQueryTime,
      slowestQueries,
      queryCountByType
    };
  }

  private analyzeUserInteractions(metrics: UserInteractionMetric[]) {
    const avgInteractionTime = this.calculateAverage(metrics.map(m => m.duration));
    const successRate = metrics.length > 0 ? 
      (metrics.filter(m => m.success).length / metrics.length) * 100 : 100;

    const interactionMap = new Map<string, { total: number; count: number }>();
    
    metrics.forEach(metric => {
      const key = `${metric.action}_${metric.component}`;
      const existing = interactionMap.get(key) || { total: 0, count: 0 };
      interactionMap.set(key, {
        total: existing.total + metric.duration,
        count: existing.count + 1
      });
    });

    const slowestInteractions = Array.from(interactionMap.entries())
      .map(([key, data]) => {
        const [action, component] = key.split('_');
        return {
          action,
          component,
          avgDuration: data.total / data.count
        };
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      avgInteractionTime,
      successRate,
      slowestInteractions
    };
  }

  private analyzeSystemHealth(metrics: SystemMetrics[]) {
    return {
      avgMemoryUsage: this.calculateAverage(metrics.map(m => m.memoryUsage)),
      avgRenderTime: this.calculateAverage(metrics.map(m => m.renderTime)),
      errorRate: this.calculateAverage(metrics.map(m => m.errorRate))
    };
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getCPUUsage(): number {
    // Browser doesn't provide CPU usage, return 0
    return 0;
  }

  private getNetworkLatency(): number {
    // Simplified network latency estimation
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.rtt || 0;
    }
    return 0;
  }

  private getRenderTime(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  private getErrorRate(): number {
    const recentLogs = logger.getLogs({
      startTime: new Date(Date.now() - 60000), // Last minute
      level: 2 // ERROR level and above
    });
    const totalRecentLogs = logger.getLogs({
      startTime: new Date(Date.now() - 60000)
    });
    
    return totalRecentLogs.length > 0 ? (recentLogs.length / totalRecentLogs.length) * 100 : 0;
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.json')) return 'json';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    return 'other';
  }

  private enforceMetricLimits(): void {
    if (this.metrics.length > this.MAX_METRICS_STORAGE) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_STORAGE);
    }
    if (this.dbMetrics.length > this.MAX_METRICS_STORAGE) {
      this.dbMetrics = this.dbMetrics.slice(-this.MAX_METRICS_STORAGE);
    }
    if (this.userMetrics.length > this.MAX_METRICS_STORAGE) {
      this.userMetrics = this.userMetrics.slice(-this.MAX_METRICS_STORAGE);
    }
    if (this.systemMetrics.length > this.MAX_METRICS_STORAGE) {
      this.systemMetrics = this.systemMetrics.slice(-this.MAX_METRICS_STORAGE);
    }
  }

  private startMetricCleanup(): void {
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
      this.dbMetrics = this.dbMetrics.filter(m => m.timestamp > cutoffTime);
      this.userMetrics = this.userMetrics.filter(m => m.timestamp > cutoffTime);
      this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoffTime);
      
      logger.debug('PerformanceMonitoring', 'Cleaned up old metrics');
    }, this.METRIC_CLEANUP_INTERVAL);
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.isMonitoring = false;
    logger.info('PerformanceMonitoring', 'Performance monitoring stopped');
  }
}

export const performanceMonitor = PerformanceMonitoringService.getInstance();