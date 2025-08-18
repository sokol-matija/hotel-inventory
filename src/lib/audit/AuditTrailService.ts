// Audit Trail Service for Hotel Inventory Management System
// Tracks all sensitive operations for compliance and security

import { logger } from '../logging/LoggingService';
import { supabase } from '../supabase';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  metadata?: any;
}

export interface AuditFilter {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure' | 'partial';
  limit?: number;
}

export type AuditableAction = 
  | 'create' | 'update' | 'delete' | 'view' | 'export'
  | 'login' | 'logout' | 'password_change'
  | 'payment_processed' | 'invoice_generated' | 'fiscal_submitted'
  | 'backup_created' | 'data_imported' | 'settings_changed';

export type AuditableEntity = 
  | 'reservation' | 'guest' | 'room' | 'company' | 'pricing_tier'
  | 'invoice' | 'payment' | 'fiscal_record'
  | 'user' | 'system' | 'settings';

class AuditTrailService {
  private static instance: AuditTrailService;
  private localAuditBuffer: AuditEvent[] = [];
  private currentUserId?: string;
  private currentSessionId?: string;
  private readonly MAX_LOCAL_BUFFER = 1000;

  private constructor() {
    this.initializeAuditService();
  }

  public static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  private initializeAuditService(): void {
    // Set up periodic audit log sync to database
    setInterval(() => {
      this.syncAuditLogsToDatabase();
    }, 30000); // Sync every 30 seconds

    logger.info('AuditTrail', 'Audit trail service initialized');
  }

  public setCurrentUser(userId: string, sessionId: string): void {
    this.currentUserId = userId;
    this.currentSessionId = sessionId;
    
    this.logAuditEvent('login', 'user', userId, undefined, undefined, 'success');
  }

  public clearCurrentUser(): void {
    if (this.currentUserId) {
      this.logAuditEvent('logout', 'user', this.currentUserId, undefined, undefined, 'success');
    }
    this.currentUserId = undefined;
    this.currentSessionId = undefined;
  }

  // Core audit logging method
  public logAuditEvent(
    action: AuditableAction,
    entityType: AuditableEntity,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    result: 'success' | 'failure' | 'partial' = 'success',
    errorMessage?: string,
    metadata?: any
  ): void {
    const auditEvent: AuditEvent = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      changedFields: this.detectChangedFields(oldValues, newValues),
      ipAddress: this.getCurrentIPAddress(),
      userAgent: this.getCurrentUserAgent(),
      result,
      errorMessage,
      metadata
    };

    // Add to local buffer
    this.localAuditBuffer.push(auditEvent);
    this.enforceBufferLimit();

    // Log for immediate visibility
    logger.info('AuditTrail', `${action} ${entityType} ${entityId}`, {
      userId: this.currentUserId,
      result,
      changedFields: auditEvent.changedFields,
      errorMessage
    });

    // For critical operations, immediately sync to database
    if (this.isCriticalOperation(action, entityType)) {
      this.syncAuditLogsToDatabase();
    }
  }

  // Specific audit methods for common operations
  public logReservationCreate(reservationId: string, reservationData: any): void {
    this.logAuditEvent('create', 'reservation', reservationId, undefined, reservationData, 'success');
  }

  public logReservationUpdate(reservationId: string, oldData: any, newData: any): void {
    this.logAuditEvent('update', 'reservation', reservationId, oldData, newData, 'success');
  }

  public logReservationDelete(reservationId: string, reservationData: any): void {
    this.logAuditEvent('delete', 'reservation', reservationId, reservationData, undefined, 'success');
  }

  public logPaymentProcessed(paymentId: string, paymentData: any, result: 'success' | 'failure' = 'success', errorMessage?: string): void {
    this.logAuditEvent('payment_processed', 'payment', paymentId, undefined, paymentData, result, errorMessage);
  }

  public logInvoiceGenerated(invoiceId: string, invoiceData: any): void {
    this.logAuditEvent('invoice_generated', 'invoice', invoiceId, undefined, invoiceData, 'success');
  }

  public logFiscalSubmission(fiscalRecordId: string, fiscalData: any, result: 'success' | 'failure' = 'success', errorMessage?: string): void {
    this.logAuditEvent('fiscal_submitted', 'fiscal_record', fiscalRecordId, undefined, fiscalData, result, errorMessage);
  }

  public logDataExport(entityType: AuditableEntity, criteria: any): void {
    this.logAuditEvent('export', entityType, 'bulk', undefined, undefined, 'success', undefined, { criteria });
  }

  public logDataImport(entityType: AuditableEntity, importedCount: number, result: 'success' | 'failure' | 'partial' = 'success', errorMessage?: string): void {
    this.logAuditEvent('data_imported', entityType, 'bulk', undefined, undefined, result, errorMessage, { importedCount });
  }

  public logSettingsChange(settingKey: string, oldValue: any, newValue: any): void {
    this.logAuditEvent('settings_changed', 'settings', settingKey, { [settingKey]: oldValue }, { [settingKey]: newValue }, 'success');
  }

  public logSystemBackup(backupId: string, backupMetadata: any): void {
    this.logAuditEvent('backup_created', 'system', backupId, undefined, undefined, 'success', undefined, backupMetadata);
  }

  // Query audit trail
  public async getAuditTrail(filter: AuditFilter = {}): Promise<AuditEvent[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.entityType) {
        query = query.eq('entity_type', filter.entityType);
      }
      if (filter.entityId) {
        query = query.eq('entity_id', filter.entityId);
      }
      if (filter.action) {
        query = query.eq('action', filter.action);
      }
      if (filter.result) {
        query = query.eq('result', filter.result);
      }
      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate.toISOString());
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('AuditTrail', 'Failed to fetch audit trail', error);
        // Fallback to local buffer
        return this.filterLocalAuditEvents(filter);
      }

      return data?.map(this.mapAuditEventFromDB) || [];
    } catch (error) {
      logger.error('AuditTrail', 'Error fetching audit trail', error);
      return this.filterLocalAuditEvents(filter);
    }
  }

  public async getAuditStatistics(timeRange: { start: Date; end: Date }): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByEntity: Record<string, number>;
    eventsByUser: Record<string, number>;
    successRate: number;
    criticalEvents: number;
  }> {
    const auditEvents = await this.getAuditTrail({
      startDate: timeRange.start,
      endDate: timeRange.end
    });

    const eventsByAction: Record<string, number> = {};
    const eventsByEntity: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    let successfulEvents = 0;
    let criticalEvents = 0;

    auditEvents.forEach(event => {
      eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
      eventsByEntity[event.entityType] = (eventsByEntity[event.entityType] || 0) + 1;
      
      if (event.userId) {
        eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
      }

      if (event.result === 'success') {
        successfulEvents++;
      }

      if (this.isCriticalOperation(event.action as AuditableAction, event.entityType as AuditableEntity)) {
        criticalEvents++;
      }
    });

    return {
      totalEvents: auditEvents.length,
      eventsByAction,
      eventsByEntity,
      eventsByUser,
      successRate: auditEvents.length > 0 ? (successfulEvents / auditEvents.length) * 100 : 100,
      criticalEvents
    };
  }

  // Compliance and security methods
  public async generateComplianceReport(period: { start: Date; end: Date }): Promise<{
    auditCoverage: number;
    securityEvents: AuditEvent[];
    dataChanges: AuditEvent[];
    failedOperations: AuditEvent[];
    userActivities: Record<string, number>;
    recommendations: string[];
  }> {
    const auditEvents = await this.getAuditTrail({
      startDate: period.start,
      endDate: period.end
    });

    const securityEvents = auditEvents.filter(event => 
      ['login', 'logout', 'password_change', 'settings_changed'].includes(event.action)
    );

    const dataChanges = auditEvents.filter(event => 
      ['create', 'update', 'delete'].includes(event.action)
    );

    const failedOperations = auditEvents.filter(event => 
      event.result === 'failure'
    );

    const userActivities: Record<string, number> = {};
    auditEvents.forEach(event => {
      if (event.userId) {
        userActivities[event.userId] = (userActivities[event.userId] || 0) + 1;
      }
    });

    const recommendations = this.generateSecurityRecommendations(auditEvents);

    return {
      auditCoverage: this.calculateAuditCoverage(auditEvents),
      securityEvents,
      dataChanges,
      failedOperations,
      userActivities,
      recommendations
    };
  }

  public async detectSuspiciousActivity(): Promise<{
    suspiciousEvents: AuditEvent[];
    patterns: Array<{
      type: string;
      description: string;
      events: AuditEvent[];
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  }> {
    const recentEvents = await this.getAuditTrail({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 1000
    });

    const suspiciousEvents = recentEvents.filter(event => 
      this.isSuspiciousActivity(event, recentEvents)
    );

    const patterns = this.detectSuspiciousPatterns(recentEvents);

    return {
      suspiciousEvents,
      patterns
    };
  }

  // Private helper methods
  private async syncAuditLogsToDatabase(): Promise<void> {
    if (this.localAuditBuffer.length === 0) return;

    try {
      const logsToSync = [...this.localAuditBuffer];
      this.localAuditBuffer = [];

      // First try with the full schema including changed_fields
      const dbLogsWithChangedFields = logsToSync.map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        user_id: event.userId,
        session_id: event.sessionId,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId,
        old_values: event.oldValues ? JSON.stringify(event.oldValues) : null,
        new_values: event.newValues ? JSON.stringify(event.newValues) : null,
        changed_fields: event.changedFields,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        result: event.result,
        error_message: event.errorMessage,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null
      }));

      let { error } = await supabase
        .from('audit_logs')
        .insert(dbLogsWithChangedFields);

      // If that fails due to schema mismatch, try without changed_fields
      if (error && error.message.includes('changed_fields')) {
        logger.debug('AuditTrail', 'Retrying audit log sync without changed_fields column');
        
        const dbLogsWithoutChangedFields = logsToSync.map(event => ({
          id: event.id,
          timestamp: event.timestamp.toISOString(),
          user_id: event.userId,
          session_id: event.sessionId,
          action: event.action,
          entity_type: event.entityType,
          entity_id: event.entityId,
          old_values: event.oldValues ? JSON.stringify(event.oldValues) : null,
          new_values: event.newValues ? JSON.stringify(event.newValues) : null,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          result: event.result,
          error_message: event.errorMessage,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null
        }));

        const { error: retryError } = await supabase
          .from('audit_logs')
          .insert(dbLogsWithoutChangedFields);

        if (retryError) {
          // Restore logs to buffer if sync failed
          this.localAuditBuffer.unshift(...logsToSync);
          logger.error('AuditTrail', 'Failed to sync audit logs to database (retry)', retryError);
        } else {
          logger.debug('AuditTrail', `Synced ${logsToSync.length} audit logs to database (without changed_fields)`);
        }
      } else if (error) {
        // Restore logs to buffer if sync failed
        this.localAuditBuffer.unshift(...logsToSync);
        logger.error('AuditTrail', 'Failed to sync audit logs to database', error);
      } else {
        logger.debug('AuditTrail', `Synced ${logsToSync.length} audit logs to database`);
      }
    } catch (error) {
      logger.error('AuditTrail', 'Error syncing audit logs', error);
    }
  }

  private detectChangedFields(oldValues: any, newValues: any): string[] {
    if (!oldValues || !newValues) return [];

    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  private isCriticalOperation(action: AuditableAction, entityType: AuditableEntity): boolean {
    const criticalActions: AuditableAction[] = [
      'delete', 'payment_processed', 'fiscal_submitted', 'settings_changed', 'data_imported'
    ];
    
    const criticalEntities: AuditableEntity[] = [
      'payment', 'fiscal_record', 'settings', 'user'
    ];

    return criticalActions.includes(action) || criticalEntities.includes(entityType);
  }

  private filterLocalAuditEvents(filter: AuditFilter): AuditEvent[] {
    return this.localAuditBuffer.filter(event => {
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.entityType && event.entityType !== filter.entityType) return false;
      if (filter.entityId && event.entityId !== filter.entityId) return false;
      if (filter.action && event.action !== filter.action) return false;
      if (filter.result && event.result !== filter.result) return false;
      if (filter.startDate && event.timestamp < filter.startDate) return false;
      if (filter.endDate && event.timestamp > filter.endDate) return false;
      return true;
    }).slice(0, filter.limit || 100);
  }

  private mapAuditEventFromDB(dbEvent: any): AuditEvent {
    return {
      id: dbEvent.id,
      timestamp: new Date(dbEvent.timestamp),
      userId: dbEvent.user_id,
      sessionId: dbEvent.session_id,
      action: dbEvent.action,
      entityType: dbEvent.entity_type,
      entityId: dbEvent.entity_id,
      oldValues: dbEvent.old_values ? JSON.parse(dbEvent.old_values) : undefined,
      newValues: dbEvent.new_values ? JSON.parse(dbEvent.new_values) : undefined,
      changedFields: dbEvent.changed_fields,
      ipAddress: dbEvent.ip_address,
      userAgent: dbEvent.user_agent,
      result: dbEvent.result,
      errorMessage: dbEvent.error_message,
      metadata: dbEvent.metadata ? JSON.parse(dbEvent.metadata) : undefined
    };
  }

  private calculateAuditCoverage(events: AuditEvent[]): number {
    // Simple audit coverage calculation based on critical operations
    const criticalOperations = events.filter(event => 
      this.isCriticalOperation(event.action as AuditableAction, event.entityType as AuditableEntity)
    );
    
    return events.length > 0 ? (criticalOperations.length / events.length) * 100 : 0;
  }

  private generateSecurityRecommendations(events: AuditEvent[]): string[] {
    const recommendations: string[] = [];
    
    const failureRate = events.filter(e => e.result === 'failure').length / events.length;
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Review system stability and user training.');
    }

    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    if (uniqueUsers < 2) {
      recommendations.push('Consider implementing multi-user access controls for better security.');
    }

    const criticalEvents = events.filter(e => 
      this.isCriticalOperation(e.action as AuditableAction, e.entityType as AuditableEntity)
    );
    if (criticalEvents.length === 0) {
      recommendations.push('No critical operations logged. Ensure audit coverage is comprehensive.');
    }

    return recommendations;
  }

  private isSuspiciousActivity(event: AuditEvent, allEvents: AuditEvent[]): boolean {
    // Simple suspicious activity detection
    const userEvents = allEvents.filter(e => e.userId === event.userId);
    
    // Too many failed operations
    const recentFailures = userEvents.filter(e => 
      e.result === 'failure' && 
      Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );
    
    if (recentFailures.length > 5) return true;

    // Multiple delete operations in short time
    if (event.action === 'delete') {
      const recentDeletes = userEvents.filter(e => 
        e.action === 'delete' && 
        Date.now() - e.timestamp.getTime() < 10 * 60 * 1000 // Last 10 minutes
      );
      if (recentDeletes.length > 3) return true;
    }

    return false;
  }

  private detectSuspiciousPatterns(events: AuditEvent[]): Array<{
    type: string;
    description: string;
    events: AuditEvent[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const patterns = [];

    // Detect bulk data access
    const bulkAccess = events.filter(e => e.action === 'view' && e.entityType === 'guest');
    if (bulkAccess.length > 100) {
      patterns.push({
        type: 'bulk_data_access',
        description: 'Unusual bulk data access detected',
        events: bulkAccess,
        riskLevel: 'medium' as const
      });
    }

    // Detect after-hours activity
    const afterHours = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour < 6 || hour > 22; // Before 6 AM or after 10 PM
    });
    if (afterHours.length > 10) {
      patterns.push({
        type: 'after_hours_activity',
        description: 'Significant after-hours activity detected',
        events: afterHours,
        riskLevel: 'low' as const
      });
    }

    return patterns;
  }

  private getCurrentIPAddress(): string {
    // In a browser environment, we can't easily get the real IP address
    // This would typically be handled by the server
    return 'client-side';
  }

  private getCurrentUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  }

  private enforceBufferLimit(): void {
    if (this.localAuditBuffer.length > this.MAX_LOCAL_BUFFER) {
      this.localAuditBuffer = this.localAuditBuffer.slice(-this.MAX_LOCAL_BUFFER);
    }
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const auditTrail = AuditTrailService.getInstance();