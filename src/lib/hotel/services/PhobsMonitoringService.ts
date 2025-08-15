// PhobsMonitoringService - Logging and monitoring for channel manager operations
// Comprehensive tracking of performance, operations, and health metrics

import { OTAChannel, SyncOperation } from './phobsTypes';
import { PhobsError, PhobsErrorType } from './PhobsErrorHandlingService';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  operation: string;
  channel?: OTAChannel;
  message: string;
  data?: any;
  duration?: number;
  error?: PhobsError;
  correlationId?: string;
  userId?: string;
  hotelId?: string;
}

export interface OperationMetrics {
  operationName: string;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastInvocation: Date | null;
  successRate: number;
  errorsByType: { [key in PhobsErrorType]?: number };
}

export interface ChannelMetrics {
  channel: OTAChannel;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  lastSyncTime: Date | null;
  averageResponseTime: number;
  errorRate: number;
  reservationsSynced: number;
  conflictsDetected: number;
  dataTransferred: number; // in bytes
}

export interface SystemHealthMetrics {
  uptime: number;
  totalOperations: number;
  operationsPerMinute: number;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  activeConnections: number;
  queueLength: number;
  lastHealthCheck: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'error_rate' | 'response_time' | 'queue_length' | 'success_rate' | 'operation_failure';
  threshold: number;
  duration: number; // in minutes
  channels?: OTAChannel[];
  operations?: string[];
  isEnabled: boolean;
  lastTriggered?: Date;
  notificationMethods: ('email' | 'webhook' | 'notification')[];
}

export interface PerformanceTrace {
  traceId: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  steps: Array<{
    name: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    metadata?: any;
  }>;
  success?: boolean;
  error?: PhobsError;
}

export class PhobsMonitoringService {
  private static instance: PhobsMonitoringService;
  private logs: LogEntry[] = [];
  private operationMetrics: Map<string, OperationMetrics> = new Map();
  private channelMetrics: Map<OTAChannel, ChannelMetrics> = new Map();
  private alertRules: AlertRule[] = [];
  private activeTraces: Map<string, PerformanceTrace> = new Map();
  private systemStartTime: Date = new Date();
  
  private readonly MAX_LOG_ENTRIES = 10000;
  private readonly LOG_RETENTION_DAYS = 7;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.startHealthMonitoring();
    this.initializeDefaultAlerts();
  }

  public static getInstance(): PhobsMonitoringService {
    if (!PhobsMonitoringService.instance) {
      PhobsMonitoringService.instance = new PhobsMonitoringService();
    }
    return PhobsMonitoringService.instance;
  }

  // ===========================
  // LOGGING OPERATIONS
  // ===========================

  /**
   * Log an operation or event
   */
  log(
    level: LogLevel,
    operation: string,
    message: string,
    data?: any,
    channel?: OTAChannel,
    duration?: number,
    error?: PhobsError
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      operation,
      channel,
      message,
      data,
      duration,
      error,
      correlationId: this.generateCorrelationId(),
      hotelId: this.getCurrentHotelId(),
      userId: this.getCurrentUserId()
    };

    this.logs.push(logEntry);
    this.enforceLogRetention();

    // Send to console with appropriate level
    this.logToConsole(logEntry);

    // Check alert conditions
    this.checkAlertConditions(logEntry);

    // Update metrics
    if (duration !== undefined) {
      this.updateOperationMetrics(operation, duration, !error, error?.type);
    }

    if (channel) {
      this.updateChannelMetrics(channel, !error, duration);
    }
  }

  /**
   * Debug level logging
   */
  debug(operation: string, message: string, data?: any, channel?: OTAChannel): void {
    this.log(LogLevel.DEBUG, operation, message, data, channel);
  }

  /**
   * Info level logging
   */
  info(operation: string, message: string, data?: any, channel?: OTAChannel, duration?: number): void {
    this.log(LogLevel.INFO, operation, message, data, channel, duration);
  }

  /**
   * Warning level logging
   */
  warn(operation: string, message: string, data?: any, channel?: OTAChannel, error?: PhobsError): void {
    this.log(LogLevel.WARN, operation, message, data, channel, undefined, error);
  }

  /**
   * Error level logging
   */
  error(operation: string, message: string, error?: PhobsError, data?: any, channel?: OTAChannel): void {
    this.log(LogLevel.ERROR, operation, message, data, channel, undefined, error);
  }

  /**
   * Fatal level logging
   */
  fatal(operation: string, message: string, error?: PhobsError, data?: any): void {
    this.log(LogLevel.FATAL, operation, message, data, undefined, undefined, error);
  }

  // ===========================
  // PERFORMANCE TRACKING
  // ===========================

  /**
   * Start performance trace
   */
  startTrace(operationName: string, metadata?: any): string {
    const traceId = this.generateTraceId();
    const trace: PerformanceTrace = {
      traceId,
      operationName,
      startTime: new Date(),
      steps: []
    };

    this.activeTraces.set(traceId, trace);
    this.debug('performance_trace', `Started trace for ${operationName}`, { traceId, metadata });

    return traceId;
  }

  /**
   * Add step to performance trace
   */
  addTraceStep(traceId: string, stepName: string, metadata?: any): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    trace.steps.push({
      name: stepName,
      startTime: new Date(),
      metadata
    });
  }

  /**
   * Complete a trace step
   */
  completeTraceStep(traceId: string, stepName: string): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    const step = trace.steps.find(s => s.name === stepName && !s.endTime);
    if (step) {
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
    }
  }

  /**
   * End performance trace
   */
  endTrace(traceId: string, success: boolean = true, error?: PhobsError): PerformanceTrace | null {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.success = success;
    trace.error = error;

    // Complete any open steps
    trace.steps.forEach(step => {
      if (!step.endTime) {
        step.endTime = trace.endTime!;
        step.duration = step.endTime.getTime() - step.startTime.getTime();
      }
    });

    this.activeTraces.delete(traceId);

    this.info(
      'performance_trace',
      `Completed trace for ${trace.operationName}`,
      {
        traceId,
        duration: trace.duration,
        success,
        stepCount: trace.steps.length,
        steps: trace.steps.map(s => ({ name: s.name, duration: s.duration }))
      },
      undefined,
      trace.duration
    );

    return trace;
  }

  // ===========================
  // METRICS AND MONITORING
  // ===========================

  /**
   * Get operation metrics
   */
  getOperationMetrics(operationName?: string): OperationMetrics[] {
    if (operationName) {
      const metrics = this.operationMetrics.get(operationName);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.operationMetrics.values());
  }

  /**
   * Get channel metrics
   */
  getChannelMetrics(channel?: OTAChannel): ChannelMetrics[] {
    if (channel) {
      const metrics = this.channelMetrics.get(channel);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.channelMetrics.values());
  }

  /**
   * Get system health metrics
   */
  getSystemHealthMetrics(): SystemHealthMetrics {
    const now = new Date();
    const uptime = now.getTime() - this.systemStartTime.getTime();
    
    const totalOps = Array.from(this.operationMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalInvocations, 0);
    
    const totalErrors = Array.from(this.operationMetrics.values())
      .reduce((sum, metrics) => sum + metrics.failedInvocations, 0);
    
    const avgResponseTime = Array.from(this.operationMetrics.values())
      .reduce((sum, metrics, _, arr) => sum + metrics.averageDuration / arr.length, 0);

    return {
      uptime: uptime,
      totalOperations: totalOps,
      operationsPerMinute: this.calculateOperationsPerMinute(),
      errorRate: totalOps > 0 ? (totalErrors / totalOps) * 100 : 0,
      averageResponseTime: avgResponseTime,
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.getActiveConnections(),
      queueLength: this.getQueueLength(),
      lastHealthCheck: now
    };
  }

  /**
   * Get recent logs with optional filtering
   */
  getRecentLogs(
    limit: number = 100,
    level?: LogLevel,
    operation?: string,
    channel?: OTAChannel
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === operation);
    }

    if (channel) {
      filteredLogs = filteredLogs.filter(log => log.channel === channel);
    }

    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // ===========================
  // ALERTING
  // ===========================

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.info('alert_management', `Added alert rule: ${rule.name}`, rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      const removedRule = this.alertRules.splice(index, 1)[0];
      this.info('alert_management', `Removed alert rule: ${removedRule.name}`, { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get active alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  private updateOperationMetrics(
    operation: string,
    duration: number,
    success: boolean,
    errorType?: PhobsErrorType
  ): void {
    let metrics = this.operationMetrics.get(operation);
    
    if (!metrics) {
      metrics = {
        operationName: operation,
        totalInvocations: 0,
        successfulInvocations: 0,
        failedInvocations: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastInvocation: null,
        successRate: 0,
        errorsByType: {}
      };
      this.operationMetrics.set(operation, metrics);
    }

    metrics.totalInvocations++;
    metrics.lastInvocation = new Date();

    if (success) {
      metrics.successfulInvocations++;
    } else {
      metrics.failedInvocations++;
      if (errorType) {
        metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;
      }
    }

    // Update duration metrics
    metrics.averageDuration = 
      ((metrics.averageDuration * (metrics.totalInvocations - 1)) + duration) / metrics.totalInvocations;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    
    // Update success rate
    metrics.successRate = (metrics.successfulInvocations / metrics.totalInvocations) * 100;
  }

  private updateChannelMetrics(channel: OTAChannel, success: boolean, duration?: number): void {
    let metrics = this.channelMetrics.get(channel);
    
    if (!metrics) {
      metrics = {
        channel,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        lastSyncTime: null,
        averageResponseTime: 0,
        errorRate: 0,
        reservationsSynced: 0,
        conflictsDetected: 0,
        dataTransferred: 0
      };
      this.channelMetrics.set(channel, metrics);
    }

    metrics.totalOperations++;
    metrics.lastSyncTime = new Date();

    if (success) {
      metrics.successfulOperations++;
    } else {
      metrics.failedOperations++;
    }

    if (duration !== undefined) {
      metrics.averageResponseTime = 
        ((metrics.averageResponseTime * (metrics.totalOperations - 1)) + duration) / metrics.totalOperations;
    }

    metrics.errorRate = (metrics.failedOperations / metrics.totalOperations) * 100;
  }

  private checkAlertConditions(logEntry: LogEntry): void {
    // Check alert rules against current metrics and log entry
    this.alertRules.forEach(rule => {
      if (!rule.isEnabled) return;

      let shouldTrigger = false;

      switch (rule.condition) {
        case 'error_rate':
          const metrics = this.getSystemHealthMetrics();
          shouldTrigger = metrics.errorRate > rule.threshold;
          break;
        
        case 'response_time':
          if (logEntry.duration && logEntry.duration > rule.threshold) {
            shouldTrigger = true;
          }
          break;
        
        case 'operation_failure':
          if (logEntry.level >= LogLevel.ERROR) {
            shouldTrigger = true;
          }
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, logEntry);
      }
    });
  }

  private triggerAlert(rule: AlertRule, logEntry: LogEntry): void {
    // Prevent alert spam - only trigger once per duration
    const now = new Date();
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < rule.duration * 60 * 1000) {
        return;
      }
    }

    rule.lastTriggered = now;

    this.warn(
      'alert_triggered',
      `Alert triggered: ${rule.name}`,
      {
        rule: rule.name,
        condition: rule.condition,
        threshold: rule.threshold,
        triggerEvent: {
          operation: logEntry.operation,
          message: logEntry.message,
          level: LogLevel[logEntry.level],
          timestamp: logEntry.timestamp
        }
      }
    );

    // Here you would implement actual notification sending
    // e.g., email, webhook, push notification
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      const health = this.getSystemHealthMetrics();
      this.debug('health_check', 'System health check completed', health);
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'error_rate',
        threshold: 10, // 10% error rate
        duration: 5, // 5 minutes
        isEnabled: true,
        notificationMethods: ['notification']
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        condition: 'response_time',
        threshold: 30000, // 30 seconds
        duration: 1, // 1 minute
        isEnabled: true,
        notificationMethods: ['notification']
      }
    ];

    defaultAlerts.forEach(alert => this.addAlertRule(alert));
  }

  private enforceLogRetention(): void {
    // Remove old logs
    const cutoffDate = new Date(Date.now() - this.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);

    // Limit total entries
    if (this.logs.length > this.MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-this.MAX_LOG_ENTRIES);
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    const message = `[${LogLevel[logEntry.level]}] ${logEntry.operation}: ${logEntry.message}`;
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.data);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, logEntry.error || logEntry.data);
        break;
    }
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getCurrentHotelId(): string | undefined {
    // TODO: Get from configuration or context
    return undefined;
  }

  private getCurrentUserId(): string | undefined {
    // TODO: Get from auth context
    return undefined;
  }

  private calculateOperationsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > oneMinuteAgo);
    return recentLogs.length;
  }

  private getMemoryUsage(): number {
    // Return estimated memory usage (simplified)
    return this.logs.length * 1024; // Rough estimate in bytes
  }

  private getActiveConnections(): number {
    // TODO: Implement actual connection tracking
    return this.activeTraces.size;
  }

  private getQueueLength(): number {
    // TODO: Get from sync services
    return 0;
  }
}