// Channel Manager Settings - Configuration panel for Phobs integration
// Manage API credentials, channel settings, and sync preferences

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Switch } from '../../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { 
  ArrowLeft,
  Save,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Settings,
  Globe,
  Clock,
  Shield,
  Download,
  Trash2
} from 'lucide-react';
import { PhobsConfigurationService, PhobsConfiguration, PhobsChannelConfig, PhobsApiCredentials, PhobsSyncSettings } from '../../../../lib/hotel/services/PhobsConfigurationService';
import { OTAChannel } from '../../../../lib/hotel/services/phobsTypes';
import hotelNotification from '../../../../lib/hotel/notifications';

interface ConnectionTestResult {
  testing: boolean;
  success?: boolean;
  error?: string;
  responseTime?: number;
}

export default function ChannelManagerSettings() {
  const navigate = useNavigate();
  const configService = PhobsConfigurationService.getInstance();
  
  const [configuration, setConfiguration] = useState<PhobsConfiguration | null>(null);
  const [credentials, setCredentials] = useState<PhobsApiCredentials>({
    apiKey: '',
    apiSecret: '',
    hotelId: '',
    baseUrl: 'https://api.phobs.net/v1',
    webhookSecret: '',
    webhookUrl: ''
  });
  const [channelConfigs, setChannelConfigs] = useState<PhobsChannelConfig[]>([]);
  const [syncSettings, setSyncSettings] = useState<PhobsSyncSettings>({
    autoSync: true,
    syncIntervalMinutes: 30,
    maxRetryAttempts: 3,
    batchSize: 100,
    throttleDelayMs: 1000,
    conflictResolutionStrategy: 'manual_review',
    notifyOnConflicts: true,
    notifyOnFailures: true
  });

  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult>({ testing: false });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('credentials');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    const config = configService.getConfiguration();
    setConfiguration(config);

    if (config) {
      setCredentials(config.credentials);
      setChannelConfigs(config.channels);
      setSyncSettings(config.syncSettings);
    } else {
      // Load defaults
      setChannelConfigs(configService.getChannelConfigurations());
      setSyncSettings(configService.getSyncSettings());
    }
  };

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      const result = await configService.updateCredentials(credentials);
      if (result.success) {
        hotelNotification.success('Credentials Saved', 'Phobs API credentials updated successfully');
        loadConfiguration(); // Reload to get updated config
      } else {
        hotelNotification.error('Save Failed', result.error || 'Failed to save credentials');
      }
    } catch (error) {
      hotelNotification.error('Save Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTest({ testing: true });
    
    try {
      const result = await configService.testConnection();
      setConnectionTest({
        testing: false,
        success: result.success,
        error: result.error,
        responseTime: result.responseTime
      });

      if (result.success) {
        hotelNotification.success(
          'Connection Test Successful', 
          `Connected to Phobs API in ${result.responseTime}ms`
        );
      } else {
        hotelNotification.error('Connection Test Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      setConnectionTest({
        testing: false,
        success: false,
        error: 'Connection test failed'
      });
    }
  };

  const handleChannelConfigChange = async (channel: OTAChannel, updates: Partial<PhobsChannelConfig>) => {
    try {
      const result = await configService.updateChannelConfiguration(channel, updates);
      if (result.success) {
        loadConfiguration();
        hotelNotification.success('Channel Updated', `${channel} configuration saved`);
      } else {
        hotelNotification.error('Update Failed', result.error || 'Failed to update channel');
      }
    } catch (error) {
      hotelNotification.error('Update Error', 'An unexpected error occurred');
    }
  };

  const handleSyncSettingsChange = async (updates: Partial<PhobsSyncSettings>) => {
    setSaving(true);
    try {
      const result = await configService.updateSyncSettings({ ...syncSettings, ...updates });
      if (result.success) {
        setSyncSettings({ ...syncSettings, ...updates });
        hotelNotification.success('Sync Settings Saved', 'Synchronization settings updated');
      } else {
        hotelNotification.error('Save Failed', result.error || 'Failed to save sync settings');
      }
    } catch (error) {
      hotelNotification.error('Save Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfig = () => {
    try {
      const exportData = configService.exportConfiguration();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phobs-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      hotelNotification.success('Configuration Exported', 'Configuration file downloaded');
    } catch (error) {
      hotelNotification.error('Export Failed', 'Failed to export configuration');
    }
  };

  const handleResetConfig = async () => {
    if (window.confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
      try {
        await configService.resetConfiguration();
        loadConfiguration();
        hotelNotification.warning('Configuration Reset', 'All settings have been reset to defaults');
      } catch (error) {
        hotelNotification.error('Reset Failed', 'Failed to reset configuration');
      }
    }
  };

  const getChannelDisplayName = (channel: OTAChannel): string => {
    const displayNames: { [K in OTAChannel]: string } = {
      'booking.com': 'Booking.com',
      'expedia': 'Expedia',
      'airbnb': 'Airbnb',
      'agoda': 'Agoda',
      'hotels.com': 'Hotels.com',
      'hostelworld': 'Hostelworld',
      'kayak': 'Kayak',
      'trivago': 'Trivago',
      'priceline': 'Priceline',
      'camping.info': 'Camping.info',
      'pitchup.com': 'Pitchup.com',
      'eurocamp': 'Eurocamp',
      'directBooking': 'Direct Booking'
    };
    return displayNames[channel];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/hotel/front-desk/channel-manager')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Channel Manager Settings</h1>
            <p className="text-gray-600">Configure Phobs integration and OTA channels</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {configuration?.isConfigured && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
          {!configuration?.isConfigured && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>API Credentials</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>OTA Channels</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Sync Settings</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* API Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Phobs API Credentials</CardTitle>
              <CardDescription>
                Configure your Phobs API credentials to enable channel manager integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                    placeholder="Enter your Phobs API key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={credentials.apiSecret}
                    onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                    placeholder="Enter your API secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hotelId">Hotel ID</Label>
                  <Input
                    id="hotelId"
                    value={credentials.hotelId}
                    onChange={(e) => setCredentials({ ...credentials, hotelId: e.target.value })}
                    placeholder="Your hotel ID in Phobs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">API Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={credentials.baseUrl}
                    onChange={(e) => setCredentials({ ...credentials, baseUrl: e.target.value })}
                    placeholder="https://api.phobs.net/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={credentials.webhookUrl}
                    onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                    placeholder="https://your-domain.com/api/phobs/webhook"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={credentials.webhookSecret}
                    onChange={(e) => setCredentials({ ...credentials, webhookSecret: e.target.value })}
                    placeholder="Webhook verification secret"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4">
                  <Button onClick={handleSaveCredentials} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Credentials'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={connectionTest.testing || !credentials.apiKey}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {connectionTest.testing ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>

                {connectionTest.success !== undefined && !connectionTest.testing && (
                  <div className="flex items-center space-x-2">
                    {connectionTest.success ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected ({connectionTest.responseTime}ms)
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Failed: {connectionTest.error}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTA Channels Tab */}
        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>OTA Channel Configuration</CardTitle>
              <CardDescription>
                Configure individual channel settings, commission rates, and restrictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelConfigs.map((channelConfig) => (
                  <div key={channelConfig.channel} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-gray-600" />
                        <span className="font-medium">{getChannelDisplayName(channelConfig.channel)}</span>
                      </div>
                      <Switch
                        checked={channelConfig.isEnabled}
                        onCheckedChange={(enabled) => 
                          handleChannelConfigChange(channelConfig.channel, { isEnabled: enabled })
                        }
                      />
                    </div>

                    {channelConfig.isEnabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                        <div className="space-y-2">
                          <Label>Commission Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            value={channelConfig.commissionRate * 100}
                            onChange={(e) => 
                              handleChannelConfigChange(channelConfig.channel, { 
                                commissionRate: parseFloat(e.target.value) / 100 
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Rate Adjustment (%)</Label>
                          <Input
                            type="number"
                            min="-50"
                            max="50"
                            step="1"
                            value={channelConfig.rateAdjustment}
                            onChange={(e) => 
                              handleChannelConfigChange(channelConfig.channel, { 
                                rateAdjustment: parseInt(e.target.value) 
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Min Stay (nights)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={channelConfig.minimumStay}
                            onChange={(e) => 
                              handleChannelConfigChange(channelConfig.channel, { 
                                minimumStay: parseInt(e.target.value) 
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Max Stay (nights)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={channelConfig.maximumStay}
                            onChange={(e) => 
                              handleChannelConfigChange(channelConfig.channel, { 
                                maximumStay: parseInt(e.target.value) 
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings Tab */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
              <CardDescription>
                Configure how often data is synchronized and how conflicts are handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoSync">Automatic Synchronization</Label>
                    <Switch
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) => 
                        handleSyncSettingsChange({ autoSync: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                    <Input
                      id="syncInterval"
                      type="number"
                      min="5"
                      max="1440"
                      value={syncSettings.syncIntervalMinutes}
                      onChange={(e) => 
                        setSyncSettings({ ...syncSettings, syncIntervalMinutes: parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="1"
                      max="10"
                      value={syncSettings.maxRetryAttempts}
                      onChange={(e) => 
                        setSyncSettings({ ...syncSettings, maxRetryAttempts: parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchSize">Batch Size</Label>
                    <Input
                      id="batchSize"
                      type="number"
                      min="10"
                      max="1000"
                      value={syncSettings.batchSize}
                      onChange={(e) => 
                        setSyncSettings({ ...syncSettings, batchSize: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="conflictStrategy">Conflict Resolution Strategy</Label>
                    <Select
                      value={syncSettings.conflictResolutionStrategy}
                      onValueChange={(value: 'favor_internal' | 'favor_phobs' | 'manual_review') =>
                        setSyncSettings({ ...syncSettings, conflictResolutionStrategy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="favor_internal">Favor Internal Data</SelectItem>
                        <SelectItem value="favor_phobs">Favor Phobs Data</SelectItem>
                        <SelectItem value="manual_review">Manual Review Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifyConflicts">Notify on Conflicts</Label>
                    <Switch
                      checked={syncSettings.notifyOnConflicts}
                      onCheckedChange={(checked) => 
                        setSyncSettings({ ...syncSettings, notifyOnConflicts: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifyFailures">Notify on Failures</Label>
                    <Switch
                      checked={syncSettings.notifyOnFailures}
                      onCheckedChange={(checked) => 
                        setSyncSettings({ ...syncSettings, notifyOnFailures: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => handleSyncSettingsChange({})} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Sync Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>
                Advanced tools for configuration management and troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Configuration Management</h3>
                  
                  <Button variant="outline" onClick={handleExportConfig} className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Configuration
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="importFile">Import Configuration</Label>
                    <Input
                      id="importFile"
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const config = event.target?.result as string;
                              const result = await configService.importConfiguration(config);
                              if (result.success) {
                                loadConfiguration();
                                hotelNotification.success('Configuration Imported', 'Settings loaded successfully');
                              } else {
                                hotelNotification.error('Import Failed', result.error || 'Invalid file');
                              }
                            } catch (error) {
                              hotelNotification.error('Import Error', 'Failed to read configuration file');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Reset & Recovery</h3>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleResetConfig}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Settings
                  </Button>

                  <div className="text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg border">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Warning: Resetting will remove all current configuration and cannot be undone.
                  </div>
                </div>
              </div>

              {configuration && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Configuration Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Status</div>
                      <div className="font-medium">
                        {configuration.isConfigured ? 'Configured' : 'Not Configured'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-medium">{configuration.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Last Updated</div>
                      <div className="font-medium">{configuration.lastUpdated.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Active Channels</div>
                      <div className="font-medium">
                        {configuration.channels.filter(c => c.isEnabled).length} / {configuration.channels.length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}