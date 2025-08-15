// PhobsConfigurationService - Configuration management for Phobs integration
// Handles API credentials, channel settings, and sync preferences

import { OTAChannel } from './phobsTypes';

export interface PhobsApiCredentials {
  apiKey: string;
  apiSecret: string;
  hotelId: string;
  baseUrl: string;
  webhookSecret: string;
  webhookUrl: string;
}

export interface PhobsChannelConfig {
  channel: OTAChannel;
  isEnabled: boolean;
  commissionRate: number;
  rateAdjustment: number; // Percentage adjustment (+/- from base rate)
  minimumStay: number;
  maximumStay: number;
  stopSale: boolean;
  closeToArrival: boolean;
  closeToDeparture: boolean;
}

export interface PhobsSyncSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  maxRetryAttempts: number;
  batchSize: number;
  throttleDelayMs: number;
  conflictResolutionStrategy: 'favor_internal' | 'favor_phobs' | 'manual_review';
  notifyOnConflicts: boolean;
  notifyOnFailures: boolean;
}

export interface PhobsConfiguration {
  credentials: PhobsApiCredentials;
  channels: PhobsChannelConfig[];
  syncSettings: PhobsSyncSettings;
  isConfigured: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

export class PhobsConfigurationService {
  private static instance: PhobsConfigurationService;
  private config: PhobsConfiguration | null = null;
  private readonly STORAGE_KEY = 'phobs_configuration';

  private constructor() {
    this.loadConfiguration();
  }

  public static getInstance(): PhobsConfigurationService {
    if (!PhobsConfigurationService.instance) {
      PhobsConfigurationService.instance = new PhobsConfigurationService();
    }
    return PhobsConfigurationService.instance;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PhobsConfiguration | null {
    return this.config;
  }

  /**
   * Check if Phobs is properly configured
   */
  isConfigured(): boolean {
    return this.config?.isConfigured || false;
  }

  /**
   * Get API credentials
   */
  getCredentials(): PhobsApiCredentials | null {
    return this.config?.credentials || null;
  }

  /**
   * Update API credentials
   */
  async updateCredentials(credentials: Partial<PhobsApiCredentials>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        this.config = this.createDefaultConfiguration();
      }

      this.config.credentials = {
        ...this.config.credentials,
        ...credentials
      };

      // Validate credentials
      const validation = this.validateCredentials(this.config.credentials);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      this.config.isConfigured = true;
      this.config.lastUpdated = new Date();

      await this.saveConfiguration();
      return { success: true };

    } catch (error) {
      console.error('Error updating credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get channel configurations
   */
  getChannelConfigurations(): PhobsChannelConfig[] {
    return this.config?.channels || this.getDefaultChannelConfigurations();
  }

  /**
   * Update channel configuration
   */
  async updateChannelConfiguration(
    channel: OTAChannel, 
    config: Partial<PhobsChannelConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        this.config = this.createDefaultConfiguration();
      }

      const channelIndex = this.config.channels.findIndex(c => c.channel === channel);
      if (channelIndex === -1) {
        // Add new channel config
        this.config.channels.push({
          channel,
          ...this.getDefaultChannelConfig(),
          ...config
        });
      } else {
        // Update existing channel config
        this.config.channels[channelIndex] = {
          ...this.config.channels[channelIndex],
          ...config
        };
      }

      this.config.lastUpdated = new Date();
      await this.saveConfiguration();
      return { success: true };

    } catch (error) {
      console.error('Error updating channel configuration:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get sync settings
   */
  getSyncSettings(): PhobsSyncSettings {
    return this.config?.syncSettings || this.getDefaultSyncSettings();
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(settings: Partial<PhobsSyncSettings>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        this.config = this.createDefaultConfiguration();
      }

      this.config.syncSettings = {
        ...this.config.syncSettings,
        ...settings
      };

      this.config.lastUpdated = new Date();
      await this.saveConfiguration();
      return { success: true };

    } catch (error) {
      console.error('Error updating sync settings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test API connection with current credentials
   */
  async testConnection(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const credentials = this.getCredentials();
    if (!credentials) {
      return { success: false, error: 'No credentials configured' };
    }

    const startTime = Date.now();

    try {
      // TODO: Implement actual API test call to Phobs
      // For now, simulate a test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const responseTime = Date.now() - startTime;
      return { success: true, responseTime };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(): Promise<void> {
    this.config = this.createDefaultConfiguration();
    await this.saveConfiguration();
  }

  /**
   * Export configuration for backup
   */
  exportConfiguration(): string {
    if (!this.config) {
      throw new Error('No configuration to export');
    }

    // Remove sensitive data from export
    const exportConfig = {
      ...this.config,
      credentials: {
        ...this.config.credentials,
        apiKey: '***',
        apiSecret: '***',
        webhookSecret: '***'
      }
    };

    return JSON.stringify(exportConfig, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configJson: string): Promise<{ success: boolean; error?: string }> {
    try {
      const importedConfig = JSON.parse(configJson) as PhobsConfiguration;
      
      // Validate imported configuration
      const validation = this.validateConfiguration(importedConfig);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      this.config = importedConfig;
      this.config.lastUpdated = new Date();
      
      await this.saveConfiguration();
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid configuration format' 
      };
    }
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  private loadConfiguration(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (this.config) {
          this.config.lastUpdated = new Date(this.config.lastUpdated);
          this.config.createdAt = new Date(this.config.createdAt);
        }
      }
    } catch (error) {
      console.error('Error loading Phobs configuration:', error);
      this.config = null;
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      if (this.config) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('Error saving Phobs configuration:', error);
      throw error;
    }
  }

  private createDefaultConfiguration(): PhobsConfiguration {
    return {
      credentials: {
        apiKey: '',
        apiSecret: '',
        hotelId: '',
        baseUrl: 'https://api.phobs.net/v1',
        webhookSecret: '',
        webhookUrl: ''
      },
      channels: this.getDefaultChannelConfigurations(),
      syncSettings: this.getDefaultSyncSettings(),
      isConfigured: false,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
  }

  private getDefaultChannelConfigurations(): PhobsChannelConfig[] {
    const defaultChannels: OTAChannel[] = [
      'booking.com', 'expedia', 'airbnb', 'agoda', 'hotels.com'
    ];

    return defaultChannels.map(channel => ({
      ...this.getDefaultChannelConfig(),
      channel
    }));
  }

  private getDefaultChannelConfig(): Omit<PhobsChannelConfig, 'channel'> {
    return {
      isEnabled: true,
      commissionRate: 0.15, // 15% default commission
      rateAdjustment: 0, // No adjustment by default
      minimumStay: 1,
      maximumStay: 30,
      stopSale: false,
      closeToArrival: false,
      closeToDeparture: false
    };
  }

  private getDefaultSyncSettings(): PhobsSyncSettings {
    return {
      autoSync: true,
      syncIntervalMinutes: 30,
      maxRetryAttempts: 3,
      batchSize: 100,
      throttleDelayMs: 1000,
      conflictResolutionStrategy: 'manual_review',
      notifyOnConflicts: true,
      notifyOnFailures: true
    };
  }

  private validateCredentials(credentials: PhobsApiCredentials): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials.apiKey) errors.push('API Key is required');
    if (!credentials.apiSecret) errors.push('API Secret is required');
    if (!credentials.hotelId) errors.push('Hotel ID is required');
    if (!credentials.baseUrl) errors.push('Base URL is required');

    // Validate URL format
    if (credentials.baseUrl && !this.isValidUrl(credentials.baseUrl)) {
      errors.push('Base URL must be a valid URL');
    }

    if (credentials.webhookUrl && !this.isValidUrl(credentials.webhookUrl)) {
      errors.push('Webhook URL must be a valid URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateConfiguration(config: PhobsConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate credentials
    const credentialsValidation = this.validateCredentials(config.credentials);
    errors.push(...credentialsValidation.errors);

    // Validate channels
    if (!config.channels || config.channels.length === 0) {
      errors.push('At least one channel configuration is required');
    }

    // Validate sync settings
    if (config.syncSettings.syncIntervalMinutes < 5) {
      errors.push('Sync interval must be at least 5 minutes');
    }

    if (config.syncSettings.maxRetryAttempts < 1 || config.syncSettings.maxRetryAttempts > 10) {
      errors.push('Max retry attempts must be between 1 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}