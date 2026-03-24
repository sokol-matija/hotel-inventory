import { supabase } from './supabase';

export interface AuditLogEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'QUANTITY_UPDATE';
  tableName: string;
  recordId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user for audit log');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId?.toString(),
      old_values: entry.oldValues as import('./supabase').Json,
      new_values: entry.newValues as import('./supabase').Json,
      description: entry.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Helper functions for common audit operations
export const auditLog = {
  // Item management
  itemCreated: (itemId: number, itemData: Record<string, unknown>) =>
    logAuditEvent({
      action: 'CREATE',
      tableName: 'items',
      recordId: itemId,
      newValues: itemData,
      description: `Created item: ${itemData.name}`,
    }),

  itemUpdated: (
    itemId: number,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) =>
    logAuditEvent({
      action: 'UPDATE',
      tableName: 'items',
      recordId: itemId,
      oldValues: oldData,
      newValues: newData,
      description: `Updated item: ${newData.name || oldData.name}`,
    }),

  itemDeleted: (itemId: number, itemData: Record<string, unknown>) =>
    logAuditEvent({
      action: 'DELETE',
      tableName: 'items',
      recordId: itemId,
      oldValues: itemData,
      description: `Deleted item: ${itemData.name}`,
    }),

  // Inventory quantity updates
  quantityUpdated: (
    inventoryId: number,
    itemName: string,
    oldQuantity: number,
    newQuantity: number,
    locationName: string
  ) =>
    logAuditEvent({
      action: 'QUANTITY_UPDATE',
      tableName: 'inventory',
      recordId: inventoryId,
      oldValues: { quantity: oldQuantity },
      newValues: { quantity: newQuantity },
      description: `Updated quantity of ${itemName} in ${locationName}: ${oldQuantity} → ${newQuantity}`,
    }),

  // Inventory management
  inventoryCreated: (
    inventoryId: number,
    inventoryData: Record<string, unknown>,
    itemName: string,
    locationName: string
  ) =>
    logAuditEvent({
      action: 'CREATE',
      tableName: 'inventory',
      recordId: inventoryId,
      newValues: inventoryData,
      description: `Added inventory: ${itemName} to ${locationName} (Qty: ${inventoryData.quantity})`,
    }),

  inventoryUpdated: (
    inventoryId: number,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    itemName: string,
    locationName: string
  ) =>
    logAuditEvent({
      action: 'UPDATE',
      tableName: 'inventory',
      recordId: inventoryId,
      oldValues: oldData,
      newValues: newData,
      description: `Updated inventory: ${itemName} in ${locationName}`,
    }),

  inventoryDeleted: (
    inventoryId: number,
    inventoryData: Record<string, unknown>,
    itemName: string,
    locationName: string
  ) =>
    logAuditEvent({
      action: 'DELETE',
      tableName: 'inventory',
      recordId: inventoryId,
      oldValues: inventoryData,
      description: `Removed inventory: ${itemName} from ${locationName}`,
    }),

  // Location management
  locationCreated: (locationId: number, locationData: Record<string, unknown>) =>
    logAuditEvent({
      action: 'CREATE',
      tableName: 'locations',
      recordId: locationId,
      newValues: locationData,
      description: `Created location: ${locationData.name}`,
    }),

  locationUpdated: (
    locationId: number,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) =>
    logAuditEvent({
      action: 'UPDATE',
      tableName: 'locations',
      recordId: locationId,
      oldValues: oldData,
      newValues: newData,
      description: `Updated location: ${newData.name || oldData.name}`,
    }),

  locationDeleted: (locationId: number, locationData: Record<string, unknown>) =>
    logAuditEvent({
      action: 'DELETE',
      tableName: 'locations',
      recordId: locationId,
      oldValues: locationData,
      description: `Deleted location: ${locationData.name}`,
    }),
};
