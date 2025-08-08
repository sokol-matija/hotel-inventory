// LocationService - Business logic for location inventory management
// Handles data operations, filtering, sorting, and inventory management

import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';

export interface Location {
  id: string;
  name: string;
  type: 'refrigerated' | 'dry';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  description?: string;
  unit: string;
  minimum_stock: number;
  category: Category;
}

export interface Category {
  id: number;
  name: string;
  requires_expiration: boolean;
}

export interface InventoryItem {
  id: number;
  location_id: string;
  item_id: number;
  item: Item;
  quantity: number;
  expiration_date?: string;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryFilters {
  searchTerm: string;
  selectedCategory: string;
}

export interface DragOperation {
  fromIndex: number;
  toIndex: number;
  itemId: number;
}

export class LocationService {
  private static instance: LocationService;
  
  private constructor() {}
  
  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Fetch location details and inventory
   */
  async fetchLocationData(locationId: string): Promise<{
    location: Location;
    inventory: InventoryItem[];
  }> {
    try {
      // Fetch location details
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;

      // Fetch inventory for this location ordered by display_order
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          item:items(
            id,
            name,
            description,
            unit,
            minimum_stock,
            category:categories(id, name, requires_expiration)
          )
        `)
        .eq('location_id', locationId)
        .order('display_order', { ascending: true, nullsFirst: false });

      if (inventoryError) throw inventoryError;

      // Sort the inventory data by display_order to ensure correct ordering
      const sortedInventory = this.sortInventoryByDisplayOrder(inventoryData || []);

      return {
        location: locationData,
        inventory: sortedInventory
      };
    } catch (error) {
      console.error('Error fetching location data:', error);
      throw new Error('Failed to load location data');
    }
  }

  /**
   * Filter and sort inventory based on search and category filters
   */
  filterInventory(
    inventory: InventoryItem[], 
    filters: InventoryFilters
  ): InventoryItem[] {
    let filtered = inventory.filter(item =>
      item.item.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      item.item.category.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
    );
    
    if (filters.selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.item.category.name === filters.selectedCategory);
    }
    
    // Preserve the display_order sorting after filtering
    return this.sortInventoryByDisplayOrder(filtered);
  }

  /**
   * Sort inventory by display_order (null values at end)
   */
  private sortInventoryByDisplayOrder(inventory: InventoryItem[]): InventoryItem[] {
    return inventory.sort((a, b) => {
      // Handle null/undefined display_order values by putting them at the end
      if ((a.display_order === null || a.display_order === undefined) && 
          (b.display_order === null || b.display_order === undefined)) return 0;
      if (a.display_order === null || a.display_order === undefined) return 1;
      if (b.display_order === null || b.display_order === undefined) return -1;
      return a.display_order - b.display_order;
    });
  }

  /**
   * Get unique categories from inventory
   */
  getUniqueCategories(inventory: InventoryItem[]): Category[] {
    const categoryMap = new Map<number, Category>();
    
    inventory.forEach(item => {
      if (!categoryMap.has(item.item.category.id)) {
        categoryMap.set(item.item.category.id, item.item.category);
      }
    });
    
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update inventory item quantity
   */
  async updateQuantity(
    inventoryId: number, 
    newQuantity: number, 
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId);

      if (error) throw error;

      // Log the audit trail (simplified - would need to fetch old values and item/location names in real implementation)
      try {
        await auditLog.quantityUpdated(inventoryId, 'Item', 0, newQuantity, 'Location');
      } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw new Error('Failed to update quantity');
    }
  }

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(inventoryId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', inventoryId);

      if (error) throw error;

      // Log the audit trail (simplified - would need to fetch item data in real implementation)
      try {
        await auditLog.inventoryDeleted(inventoryId, {}, 'Item', 'Location');
      } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw new Error('Failed to delete inventory item');
    }
  }

  /**
   * Handle drag and drop reordering
   */
  async updateInventoryOrder(
    inventory: InventoryItem[],
    dragOperation: DragOperation,
    userId: string
  ): Promise<InventoryItem[]> {
    try {
      // Reorder the array
      const reorderedItems = [...inventory];
      const [movedItem] = reorderedItems.splice(dragOperation.fromIndex, 1);
      reorderedItems.splice(dragOperation.toIndex, 0, movedItem);

      // Update display_order in database for all affected items
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1
      }));

      // Batch update all items
      for (const update of updates) {
        const { error } = await supabase
          .from('inventory')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Log the reorder action (simplified)
      try {
        await auditLog.inventoryUpdated(
          dragOperation.itemId, 
          { display_order: dragOperation.fromIndex + 1 }, 
          { display_order: dragOperation.toIndex + 1 },
          'Item',
          'Location'
        );
      } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
      }

      return reorderedItems;
    } catch (error) {
      console.error('Error updating inventory order:', error);
      throw new Error('Failed to save item order');
    }
  }

  /**
   * Get expiration status for an item
   */
  getExpirationStatus(expirationDate?: string): {
    status: 'expired' | 'expiring' | 'good' | 'none';
    daysUntilExpiration?: number;
  } {
    if (!expirationDate) {
      return { status: 'none' };
    }

    const today = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', daysUntilExpiration: Math.abs(diffDays) };
    } else if (diffDays <= 7) {
      return { status: 'expiring', daysUntilExpiration: diffDays };
    } else {
      return { status: 'good', daysUntilExpiration: diffDays };
    }
  }

  /**
   * Check if item is low stock
   */
  isLowStock(item: InventoryItem): boolean {
    return item.quantity <= item.item.minimum_stock;
  }

  /**
   * Translate category names (Croatian mappings)
   */
  translateCategory(categoryName: string): string {
    const directMapping: Record<string, string> = {
      'Food & Beverage': 'Hrana i piće',
      'Food&Beverage': 'Hrana i piće', 
      'foodbeverage': 'Hrana i piće',
      'Cleaning': 'Čišćenje',
      'Supplies': 'Potrepštine',
      'Toiletries': 'Toaletni artikli',
      'Equipment': 'Oprema',
      'Office': 'Ured'
    };
    
    // Use direct mapping first to avoid i18next calls
    if (directMapping[categoryName]) {
      return directMapping[categoryName];
    }
    
    // For unknown categories, just return the original name
    return categoryName;
  }

  /**
   * Get location statistics
   */
  getLocationStats(inventory: InventoryItem[]): {
    totalItems: number;
    lowStockItems: number;
    expiredItems: number;
    expiringItems: number;
    totalValue: number;
  } {
    let lowStockItems = 0;
    let expiredItems = 0;
    let expiringItems = 0;
    let totalValue = 0;

    inventory.forEach(item => {
      if (this.isLowStock(item)) {
        lowStockItems++;
      }

      const expirationStatus = this.getExpirationStatus(item.expiration_date);
      if (expirationStatus.status === 'expired') {
        expiredItems++;
      } else if (expirationStatus.status === 'expiring') {
        expiringItems++;
      }

      // Note: Would need item price to calculate total value
      // totalValue += item.quantity * item.item.price;
    });

    return {
      totalItems: inventory.length,
      lowStockItems,
      expiredItems,
      expiringItems,
      totalValue // Would need pricing data
    };
  }
}