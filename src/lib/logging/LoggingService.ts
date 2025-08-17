// Centralized Logging Service for Hotel Inventory Management System
// Provides structured logging with multiple levels and destinations

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
  performance?: {
    duration?: number;
    memoryUsage?: number;
    dbQueries?: number;
  };
}

export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  includeStackTrace: boolean;
  enablePerformanceMetrics: boolean;
}

class LoggingService {
  private static instance: LoggingService;
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: true,
      enableRemote: process.env.NODE_ENV === 'production',
      maxStorageEntries: 1000,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      enablePerformanceMetrics: true
    };
    
    this.initializeLogging();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private initializeLogging(): void {
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Global Error', `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`, {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', `Promise rejection: ${event.reason}`, {
          reason: event.reason,
          promise: event.promise
        });
      });
    }

    // Log service initialization
    this.info('LoggingService', 'Logging service initialized', {
      sessionId: this.sessionId,
      config: this.config,
      environment: process.env.NODE_ENV
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    this.info('LoggingService', 'User ID set', { userId });
  }

  public updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('LoggingService', 'Configuration updated', { config: this.config });
  }

  // Core logging methods
  public debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  public info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  public warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  public error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  public critical(category: string, message: string, data?: any): void {
    this.log(LogLevel.CRITICAL, category, message, data);
  }

  // Performance logging
  public performanceStart(operation: string): string {
    const startTime = performance.now();
    const operationId = this.generateOperationId();
    
    this.debug('Performance', `Started: ${operation}`, {
      operationId,
      startTime,
      operation
    });
    
    return operationId;
  }

  public performanceEnd(operationId: string, operation: string, additionalData?: any): void {
    const endTime = performance.now();
    const duration = endTime - (performance.getEntriesByName(`perf-${operationId}`)[0]?.startTime || endTime);
    
    this.info('Performance', `Completed: ${operation}`, {
      operationId,
      operation,
      duration: Math.round(duration * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      ...additionalData
    });
  }

  // Database operation logging
  public logDatabaseOperation(operation: string, table: string, duration: number, data?: any): void {
    this.debug('Database', `${operation} on ${table}`, {
      operation,
      table,
      duration,
      data
    });
  }

  // User activity logging
  public logUserActivity(action: string, details?: any): void {
    this.info('UserActivity', action, {
      userId: this.userId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...details
    });
  }

  // Business operation logging
  public logBusinessOperation(operation: string, entityType: string, entityId: string, data?: any): void {
    this.info('Business', `${operation} ${entityType}`, {
      operation,
      entityType,
      entityId,
      userId: this.userId,
      data
    });
  }

  // Error tracking with context
  public trackError(error: Error, context?: any): void {
    this.error('ErrorTracking', error.message, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  // Core logging implementation
  private log(level: LogLevel, category: string, message: string, data?: any): void {
    if (level < this.config.level) {
      return; // Skip logs below configured level
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Add stack trace for errors in development
    if (this.config.includeStackTrace && level >= LogLevel.ERROR) {
      logEntry.stack = new Error().stack;
    }

    // Add performance metrics if enabled
    if (this.config.enablePerformanceMetrics) {
      logEntry.performance = {
        memoryUsage: this.getMemoryUsage()
      };
    }

    // Output to different destinations
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    if (this.config.enableStorage) {
      this.outputToStorage(logEntry);
    }

    if (this.config.enableRemote) {
      this.outputToRemote(logEntry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message, entry.data);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private outputToStorage(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.config.maxStorageEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxStorageEntries);
    }

    // Store in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      try {
        const recentLogs = this.logBuffer.slice(-100); // Store last 100 entries
        localStorage.setItem('hotel-inventory-logs', JSON.stringify(recentLogs));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  private async outputToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Fail silently for remote logging errors
      console.warn('Remote logging failed:', error);
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  // Log retrieval methods
  public getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter(log => log.level >= filter.level!);
      }
      if (filter.category) {
        logs = logs.filter(log => log.category.includes(filter.category!));
      }
      if (filter.startTime) {
        logs = logs.filter(log => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        logs = logs.filter(log => log.timestamp <= filter.endTime!);
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  }

  public exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  public clearLogs(): void {
    this.logBuffer = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hotel-inventory-logs');
    }
    this.info('LoggingService', 'Logs cleared');
  }

  // Analytics and reporting
  public getLogStatistics(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByCategory: Record<string, number>;
    errorRate: number;
    averageLogsPerHour: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentLogs = this.logBuffer.filter(log => log.timestamp >= oneHourAgo);

    const logsByLevel: Record<string, number> = {};
    const logsByCategory: Record<string, number> = {};
    let errorCount = 0;

    this.logBuffer.forEach(log => {
      const levelName = LogLevel[log.level];
      logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
      
      if (log.level >= LogLevel.ERROR) {
        errorCount++;
      }
    });

    return {
      totalLogs: this.logBuffer.length,
      logsByLevel,
      logsByCategory,
      errorRate: this.logBuffer.length > 0 ? (errorCount / this.logBuffer.length) * 100 : 0,
      averageLogsPerHour: recentLogs.length
    };
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();

// Convenience functions for common use cases
export const logPerformance = {
  start: (operation: string) => logger.performanceStart(operation),
  end: (operationId: string, operation: string, data?: any) => logger.performanceEnd(operationId, operation, data)
};

export const logDatabase = (operation: string, table: string, duration: number, data?: any) => 
  logger.logDatabaseOperation(operation, table, duration, data);

export const logUserActivity = (action: string, details?: any) => 
  logger.logUserActivity(action, details);

export const logBusinessOperation = (operation: string, entityType: string, entityId: string, data?: any) => 
  logger.logBusinessOperation(operation, entityType, entityId, data);

export const trackError = (error: Error, context?: any) => 
  logger.trackError(error, context);