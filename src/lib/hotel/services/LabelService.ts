/**
 * LabelService - Service for managing reservation labels/groups
 *
 * Handles CRUD operations for labels that group related reservations together
 * (e.g., "german-bikers" for a tour group across multiple rooms)
 *
 * Features:
 * - Search labels with autocomplete
 * - Create new labels with lowercase normalization
 * - Fetch labels by ID or hotel
 * - Singleton pattern for consistent instance
 * - Auto-assign random modern colors from curated palette
 */

import { supabase } from '../../supabase';
import { Label, LabelCreate, LabelUpdate } from '../types';

/**
 * Modern color palette for label backgrounds
 * Carefully selected colors that work well with white text
 */
const LABEL_COLOR_POOL = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
  { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
  { bg: '#F97316', text: '#FFFFFF' }, // Orange
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
];

export class LabelService {
  private static instance: LabelService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of LabelService
   */
  static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService();
    }
    return LabelService.instance;
  }

  /**
   * Search labels by partial name (for autocomplete)
   * @param hotelId - The hotel ID to search within
   * @param query - The search query (partial name)
   * @returns Array of matching labels
   */
  async searchLabels(hotelId: string, query: string): Promise<Label[]> {
    try {
      if (!query || !query.trim()) {
        return [];
      }

      const normalizedQuery = query.toLowerCase().trim();

      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('hotel_id', hotelId)
        .ilike('name', `%${normalizedQuery}%`)
        .order('name', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error searching labels:', error);
        throw new Error(`Failed to search labels: ${error.message}`);
      }

      return this.mapLabels(data || []);
    } catch (error) {
      console.error('LabelService.searchLabels error:', error);
      return [];
    }
  }

  /**
   * Get a random color from the color pool
   * @returns A random color object with bg and text properties
   */
  private getRandomColor() {
    const randomIndex = Math.floor(Math.random() * LABEL_COLOR_POOL.length);
    return LABEL_COLOR_POOL[randomIndex];
  }

  /**
   * Create a new label
   * @param labelData - The label data to create
   * @returns The created label
   */
  async createLabel(labelData: LabelCreate): Promise<Label> {
    try {
      // Normalize name: lowercase and replace spaces with hyphens
      const normalizedName = labelData.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''); // Remove special characters except hyphens

      if (!normalizedName) {
        throw new Error('Label name cannot be empty after normalization');
      }

      // Auto-assign random color if not provided
      const randomColor = this.getRandomColor();

      const insertData = {
        hotel_id: labelData.hotelId,
        name: normalizedName,
        color: labelData.color || randomColor.text,
        bg_color: labelData.bgColor || randomColor.bg
      };

      const { data, error } = await supabase
        .from('labels')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error(`Label "${normalizedName}" already exists for this hotel`);
        }
        console.error('Error creating label:', error);
        throw new Error(`Failed to create label: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from label creation');
      }

      return this.mapLabel(data);
    } catch (error) {
      console.error('LabelService.createLabel error:', error);
      throw error;
    }
  }

  /**
   * Get a label by ID
   * @param labelId - The label ID
   * @returns The label or null if not found
   */
  async getLabelById(labelId: string): Promise<Label | null> {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('id', labelId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Error fetching label:', error);
        throw new Error(`Failed to fetch label: ${error.message}`);
      }

      return data ? this.mapLabel(data) : null;
    } catch (error) {
      console.error('LabelService.getLabelById error:', error);
      return null;
    }
  }

  /**
   * List all labels for a hotel
   * @param hotelId - The hotel ID
   * @returns Array of labels
   */
  async listLabels(hotelId: string): Promise<Label[]> {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error listing labels:', error);
        throw new Error(`Failed to list labels: ${error.message}`);
      }

      return this.mapLabels(data || []);
    } catch (error) {
      console.error('LabelService.listLabels error:', error);
      return [];
    }
  }

  /**
   * Update a label
   * @param labelId - The label ID to update
   * @param updates - The updates to apply
   * @returns The updated label
   */
  async updateLabel(labelId: string, updates: LabelUpdate): Promise<Label> {
    try {
      const updateData: any = {};

      if (updates.name) {
        // Normalize name
        updateData.name = updates.name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }

      if (updates.color) {
        updateData.color = updates.color;
      }

      if (updates.bgColor) {
        updateData.bg_color = updates.bgColor;
      }

      const { data, error } = await supabase
        .from('labels')
        .update(updateData)
        .eq('id', labelId)
        .select()
        .single();

      if (error) {
        console.error('Error updating label:', error);
        throw new Error(`Failed to update label: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from label update');
      }

      return this.mapLabel(data);
    } catch (error) {
      console.error('LabelService.updateLabel error:', error);
      throw error;
    }
  }

  /**
   * Delete a label
   * @param labelId - The label ID to delete
   */
  async deleteLabel(labelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', labelId);

      if (error) {
        console.error('Error deleting label:', error);
        throw new Error(`Failed to delete label: ${error.message}`);
      }
    } catch (error) {
      console.error('LabelService.deleteLabel error:', error);
      throw error;
    }
  }

  /**
   * Map database label to Label type
   * @param data - Raw database data
   * @returns Label object
   */
  private mapLabel(data: any): Label {
    return {
      id: data.id,
      hotelId: data.hotel_id,
      name: data.name,
      color: data.color || '#000000',
      bgColor: data.bg_color || '#FFFFFF',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Map array of database labels to Label types
   * @param data - Array of raw database data
   * @returns Array of Label objects
   */
  private mapLabels(data: any[]): Label[] {
    return data.map(item => this.mapLabel(item));
  }
}

// Export singleton instance
export default LabelService.getInstance();
