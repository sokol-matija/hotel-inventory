// StatusIndicators.tsx - UI components for channel sync status and conflict indicators
// Real-time visual feedback for Phobs integration operations

import React, { useState } from 'react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Activity,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { OTAChannel } from '../../../../lib/hotel/services/phobsTypes';
import { PhobsError, PhobsErrorType } from '../../../../lib/hotel/services/PhobsErrorHandlingService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'warning' | 'disconnected';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

interface StatusIndicatorProps {
  status: SyncStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface ChannelStatusProps {
  channel: OTAChannel;
  status: SyncStatus;
  lastSync?: Date;
  errorCount?: number;
  reservationCount?: number;
  responseTime?: number;
  onViewDetails?: () => void;
}

interface ConflictIndicatorProps {
  severity: ConflictSeverity;
  conflictType: string;
  affectedItems: number;
  autoResolvable: boolean;
  onResolve?: () => void;
  onView?: () => void;
}

interface SyncProgressProps {
  operation: string;
  progress: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  estimatedTimeRemaining?: number;
  onCancel?: () => void;
}

interface PerformanceMetricsProps {
  successRate: number;
  averageResponseTime: number;
  operationsPerMinute: number;
  errorRate: number;
  trend: 'up' | 'down' | 'stable';
}

// Basic status indicator component
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showLabel = true,
  className
}) => {
  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'idle':
        return {
          icon: Clock,
          color: 'text-gray-500 bg-gray-100',
          label: 'Idle'
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-600 bg-blue-100',
          label: 'Syncing',
          animate: true
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
          label: 'Success'
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600 bg-red-100',
          label: 'Error'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600 bg-yellow-100',
          label: 'Warning'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-600 bg-gray-100',
          label: 'Disconnected'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500 bg-gray-100',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn('flex items-center justify-center rounded-full p-1', config.color)}>
        <Icon 
          className={cn(
            sizeClasses[size],
            config.animate && 'animate-spin'
          )} 
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium">
          {label || config.label}
        </span>
      )}
    </div>
  );
};

// Channel-specific status card
export const ChannelStatusCard: React.FC<ChannelStatusProps> = ({
  channel,
  status,
  lastSync,
  errorCount = 0,
  reservationCount = 0,
  responseTime,
  onViewDetails
}) => {
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

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wifi className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-base">{getChannelDisplayName(channel)}</CardTitle>
              <CardDescription className="text-sm">
                Last sync: {formatLastSync(lastSync)}
              </CardDescription>
            </div>
          </div>
          <StatusIndicator status={status} showLabel={false} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">{reservationCount}</div>
            <div className="text-gray-600">Reservations</div>
          </div>
          
          <div className="text-center">
            <div className="font-semibold text-lg text-red-600">{errorCount}</div>
            <div className="text-gray-600">Errors</div>
          </div>
          
          <div className="text-center">
            <div className="font-semibold text-lg">
              {responseTime ? `${responseTime}ms` : '-'}
            </div>
            <div className="text-gray-600">Response</div>
          </div>
        </div>
        
        {onViewDetails && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewDetails}
            className="w-full mt-4 flex items-center justify-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Conflict indicator with resolution options
export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  severity,
  conflictType,
  affectedItems,
  autoResolvable,
  onResolve,
  onView
}) => {
  const getSeverityConfig = (severity: ConflictSeverity) => {
    switch (severity) {
      case 'low':
        return {
          color: 'border-blue-200 bg-blue-50 text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600'
        };
      case 'medium':
        return {
          color: 'border-yellow-200 bg-yellow-50 text-yellow-800',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600'
        };
      case 'high':
        return {
          color: 'border-orange-200 bg-orange-50 text-orange-800',
          icon: AlertCircle,
          iconColor: 'text-orange-600'
        };
      case 'critical':
        return {
          color: 'border-red-200 bg-red-50 text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
    }
  };

  const config = getSeverityConfig(severity);
  const Icon = config.icon;

  return (
    <div className={cn('border rounded-lg p-4', config.color)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Icon className={cn('h-5 w-5 mt-0.5', config.iconColor)} />
          <div>
            <div className="font-medium capitalize">
              {conflictType.replace('_', ' ')} Conflict
            </div>
            <div className="text-sm mt-1">
              {affectedItems} item{affectedItems !== 1 ? 's' : ''} affected
            </div>
            {autoResolvable && (
              <Badge variant="outline" className="mt-2 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Auto-resolvable
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onResolve && (
            <Button 
              size="sm" 
              onClick={onResolve}
              className={autoResolvable ? 'bg-blue-600 hover:bg-blue-700' : undefined}
            >
              {autoResolvable ? 'Auto Resolve' : 'Resolve'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sync progress indicator
export const SyncProgress: React.FC<SyncProgressProps> = ({
  operation,
  progress,
  currentStep,
  totalSteps,
  currentStepIndex,
  estimatedTimeRemaining,
  onCancel
}) => {
  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{operation}</CardTitle>
            <CardDescription>
              {currentStep && `Step ${(currentStepIndex || 0) + 1}${totalSteps ? ` of ${totalSteps}` : ''}: ${currentStep}`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {estimatedTimeRemaining && (
                <span>~{formatTimeRemaining(estimatedTimeRemaining)} remaining</span>
              )}
            </div>
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Performance metrics display
export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  successRate,
  averageResponseTime,
  operationsPerMinute,
  errorRate,
  trend
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Performance Metrics</span>
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={cn('text-2xl font-bold', getSuccessRateColor(successRate))}>
              {successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {operationsPerMinute.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Ops/min</div>
          </div>
          
          <div className="text-center">
            <div className={cn('text-2xl font-bold', errorRate > 5 ? 'text-red-600' : 'text-green-600')}>
              {errorRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact status badge for use in lists
export const StatusBadge: React.FC<{ status: SyncStatus; size?: 'sm' | 'md' }> = ({ 
  status, 
  size = 'md' 
}) => {
  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'idle':
        return { color: 'bg-gray-100 text-gray-800', label: 'Idle' };
      case 'syncing':
        return { color: 'bg-blue-100 text-blue-800', label: 'Syncing' };
      case 'success':
        return { color: 'bg-green-100 text-green-800', label: 'Success' };
      case 'error':
        return { color: 'bg-red-100 text-red-800', label: 'Error' };
      case 'warning':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' };
      case 'disconnected':
        return { color: 'bg-gray-100 text-gray-800', label: 'Offline' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Badge 
      className={cn(
        config.color,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-0.5'
      )}
    >
      {config.label}
    </Badge>
  );
};

// Error details component
export const ErrorDetails: React.FC<{ 
  error: PhobsError; 
  onRetry?: () => void; 
  onDismiss?: () => void;
}> = ({ error, onRetry, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorTypeColor = (type: PhobsErrorType) => {
    switch (type) {
      case PhobsErrorType.NETWORK_ERROR:
      case PhobsErrorType.TIMEOUT_ERROR:
        return 'text-blue-600';
      case PhobsErrorType.RATE_LIMIT_ERROR:
        return 'text-yellow-600';
      case PhobsErrorType.AUTHENTICATION_ERROR:
      case PhobsErrorType.VALIDATION_ERROR:
        return 'text-orange-600';
      case PhobsErrorType.SERVER_ERROR:
      case PhobsErrorType.UNKNOWN_ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="font-medium text-red-800">
              {error.message}
            </div>
            <div className="text-sm text-red-700 mt-1">
              <span className={cn('font-medium', getErrorTypeColor(error.type))}>
                {error.type.replace('_', ' ').toLowerCase()}
              </span>
              {error.statusCode && ` (HTTP ${error.statusCode})`}
              <span className="mx-2">•</span>
              <span>{error.context.operation}</span>
              {error.context.attempt > 1 && (
                <>
                  <span className="mx-2">•</span>
                  <span>Attempt {error.context.attempt}</span>
                </>
              )}
            </div>
            
            {showDetails && error.originalError && (
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                {error.originalError.stack || error.originalError.message}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          
          {error.retryable && onRetry && (
            <Button size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
          
          {onDismiss && (
            <Button variant="outline" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};