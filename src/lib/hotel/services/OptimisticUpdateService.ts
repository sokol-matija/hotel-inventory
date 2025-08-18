/**
 * OptimisticUpdateService - Provides instant UI feedback with automatic rollback capability
 * 
 * This service enables smooth user experience by immediately updating the UI for user actions
 * while handling server failures gracefully with automatic rollback functionality.
 * 
 * Features:
 * - Instant UI feedback for reservation operations (create, update, move, delete)
 * - Automatic rollback on server failures to maintain UI consistency
 * - Operation tracking with status monitoring (pending, success, failed, rolled_back)
 * - Comprehensive error handling and recovery mechanisms
 * - Statistics and debugging capabilities for operation monitoring
 * 
 * Usage:
 * ```typescript
 * const optimisticService = OptimisticUpdateService.getInstance();
 * const result = await optimisticService.optimisticMoveReservation(
 *   reservationId, originalReservation, newRoomId, newCheckIn, newCheckOut,
 *   updateUICallback, serverUpdateCallback
 * );
 * if (!result.success) {
 *   // UI automatically rolled back, show error to user
 * }
 * ```
 * 
 * @author Hotel Management System v2.7
 * @since August 2025
 */

import { Reservation, Room, Guest } from '../types';

export interface OptimisticOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  entity: 'reservation' | 'guest' | 'room';
  originalData?: any;
  newData?: any;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
}

export interface RollbackResult {
  success: boolean;
  error?: string;
  operationsRolledBack: number;
}

export class OptimisticUpdateService {
  private static instance: OptimisticUpdateService;
  private pendingOperations: Map<string, OptimisticOperation> = new Map();
  private rollbackCallbacks: Map<string, () => void> = new Map();

  private constructor() {}

  public static getInstance(): OptimisticUpdateService {
    if (!OptimisticUpdateService.instance) {
      OptimisticUpdateService.instance = new OptimisticUpdateService();
    }
    return OptimisticUpdateService.instance;
  }

  /**
   * Execute an optimistic update
   */
  async executeOptimisticUpdate<T>(
    operationId: string,
    operation: {
      type: OptimisticOperation['type'];
      entity: OptimisticOperation['entity'];
      originalData?: any;
      newData?: any;
      optimisticUpdate: () => void;
      rollbackUpdate: () => void;
      serverUpdate: () => Promise<T>;
    }
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    // Record the operation
    const optimisticOp: OptimisticOperation = {
      id: operationId,
      type: operation.type,
      entity: operation.entity,
      originalData: operation.originalData,
      newData: operation.newData,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.pendingOperations.set(operationId, optimisticOp);
    this.rollbackCallbacks.set(operationId, operation.rollbackUpdate);

    // Apply optimistic update immediately
    try {
      operation.optimisticUpdate();
      
      // Attempt server update
      const result = await operation.serverUpdate();
      
      // Success - mark as completed
      optimisticOp.status = 'success';
      this.pendingOperations.delete(operationId);
      this.rollbackCallbacks.delete(operationId);
      
      return { success: true, data: result };
      
    } catch (error) {
      console.error(`Optimistic update failed for ${operationId}:`, error);
      
      // Rollback the optimistic update
      operation.rollbackUpdate();
      optimisticOp.status = 'rolled_back';
      
      // Keep in map for debugging/retry
      setTimeout(() => {
        this.pendingOperations.delete(operationId);
        this.rollbackCallbacks.delete(operationId);
      }, 5000); // Clean up after 5 seconds
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  }

  /**
   * Execute optimistic reservation move
   */
  async optimisticMoveReservation(
    reservationId: string,
    originalReservation: Reservation,
    newRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date,
    updateReservationInState: (id: string, updates: Partial<Reservation>) => void,
    serverUpdate: () => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    const operationId = `move-${reservationId}-${Date.now()}`;
    
    const newData = {
      roomId: newRoomId,
      checkIn: newCheckIn,
      checkOut: newCheckOut
    };

    return this.executeOptimisticUpdate(operationId, {
      type: 'move',
      entity: 'reservation',
      originalData: {
        roomId: originalReservation.roomId,
        checkIn: originalReservation.checkIn,
        checkOut: originalReservation.checkOut
      },
      newData,
      optimisticUpdate: () => {
        // Immediately update the UI
        updateReservationInState(reservationId, newData);
      },
      rollbackUpdate: () => {
        // Restore original values
        updateReservationInState(reservationId, {
          roomId: originalReservation.roomId,
          checkIn: originalReservation.checkIn,
          checkOut: originalReservation.checkOut
        });
      },
      serverUpdate: serverUpdate
    });
  }

  /**
   * Execute optimistic reservation update
   */
  async optimisticUpdateReservation(
    reservationId: string,
    originalReservation: Reservation,
    updates: Partial<Reservation>,
    updateReservationInState: (id: string, updates: Partial<Reservation>) => void,
    serverUpdate: () => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    const operationId = `update-${reservationId}-${Date.now()}`;
    
    return this.executeOptimisticUpdate(operationId, {
      type: 'update',
      entity: 'reservation',
      originalData: originalReservation,
      newData: updates,
      optimisticUpdate: () => {
        updateReservationInState(reservationId, updates);
      },
      rollbackUpdate: () => {
        // Restore original reservation
        updateReservationInState(reservationId, originalReservation);
      },
      serverUpdate: serverUpdate
    });
  }

  /**
   * Execute optimistic reservation creation
   */
  async optimisticCreateReservation(
    tempReservation: Reservation,
    addReservationToState: (reservation: Reservation) => void,
    removeReservationFromState: (id: string) => void,
    serverCreate: () => Promise<Reservation>
  ): Promise<{ success: boolean; data?: Reservation; error?: string }> {
    const operationId = `create-${tempReservation.id}-${Date.now()}`;
    
    return this.executeOptimisticUpdate(operationId, {
      type: 'create',
      entity: 'reservation',
      newData: tempReservation,
      optimisticUpdate: () => {
        addReservationToState(tempReservation);
      },
      rollbackUpdate: () => {
        removeReservationFromState(tempReservation.id);
      },
      serverUpdate: serverCreate
    });
  }

  /**
   * Execute optimistic reservation deletion
   */
  async optimisticDeleteReservation(
    reservation: Reservation,
    removeReservationFromState: (id: string) => void,
    addReservationToState: (reservation: Reservation) => void,
    serverDelete: () => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    const operationId = `delete-${reservation.id}-${Date.now()}`;
    
    return this.executeOptimisticUpdate(operationId, {
      type: 'delete',
      entity: 'reservation',
      originalData: reservation,
      optimisticUpdate: () => {
        removeReservationFromState(reservation.id);
      },
      rollbackUpdate: () => {
        addReservationToState(reservation);
      },
      serverUpdate: serverDelete
    });
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): OptimisticOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status: OptimisticOperation['status']): OptimisticOperation[] {
    return this.getPendingOperations().filter(op => op.status === status);
  }

  /**
   * Force rollback of specific operation
   */
  forceRollback(operationId: string): boolean {
    const operation = this.pendingOperations.get(operationId);
    const rollbackCallback = this.rollbackCallbacks.get(operationId);
    
    if (operation && rollbackCallback && operation.status === 'pending') {
      try {
        rollbackCallback();
        operation.status = 'rolled_back';
        this.pendingOperations.delete(operationId);
        this.rollbackCallbacks.delete(operationId);
        return true;
      } catch (error) {
        console.error('Error during forced rollback:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Rollback all pending operations
   */
  rollbackAllPending(): RollbackResult {
    const pendingOps = this.getOperationsByStatus('pending');
    let rolledBack = 0;
    let lastError: string | undefined;

    for (const operation of pendingOps) {
      if (this.forceRollback(operation.id)) {
        rolledBack++;
      } else {
        lastError = `Failed to rollback operation ${operation.id}`;
      }
    }

    return {
      success: rolledBack === pendingOps.length,
      error: lastError,
      operationsRolledBack: rolledBack
    };
  }

  /**
   * Clear completed operations (cleanup)
   */
  clearCompletedOperations(): number {
    const completed = this.getOperationsByStatus('success')
      .concat(this.getOperationsByStatus('rolled_back'));
    
    completed.forEach(op => {
      this.pendingOperations.delete(op.id);
      this.rollbackCallbacks.delete(op.id);
    });

    return completed.length;
  }

  /**
   * Get operation statistics
   */
  getStatistics() {
    const operations = this.getPendingOperations();
    const stats = {
      total: operations.length,
      pending: 0,
      success: 0,
      failed: 0,
      rolledBack: 0,
      oldestOperation: 0
    };

    operations.forEach(op => {
      if (op.status === 'rolled_back') {
        stats.rolledBack++;
      } else if (op.status in stats) {
        (stats as any)[op.status]++;
      }
      if (op.timestamp < stats.oldestOperation || stats.oldestOperation === 0) {
        stats.oldestOperation = op.timestamp;
      }
    });

    return stats;
  }
}