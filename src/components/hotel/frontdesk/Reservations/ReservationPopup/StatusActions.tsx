import { Button } from '../../../../ui/button';
import { LogIn, LogOut, Check, X } from 'lucide-react';

export interface StatusActionsProps {
  statusActions: Array<{
    status: string;
    label: string;
    icon: string;
    variant: 'default' | 'outline' | 'destructive';
  }>;
  isUpdating: boolean;
  onStatusUpdate: (status: string) => void;
}

export const StatusActions = ({
  statusActions,
  isUpdating,
  onStatusUpdate,
}: StatusActionsProps) => (
  <>
    {statusActions.map((action) => (
      <Button
        key={action.status}
        variant={action.variant}
        size="sm"
        onClick={() => onStatusUpdate(action.status)}
        disabled={isUpdating}
      >
        {action.icon === 'log-in' && <LogIn className="mr-1 h-4 w-4" />}
        {action.icon === 'log-out' && <LogOut className="mr-1 h-4 w-4" />}
        {action.icon === 'check' && <Check className="mr-1 h-4 w-4" />}
        {action.icon === 'x' && <X className="mr-1 h-4 w-4" />}
        {action.label}
      </Button>
    ))}
  </>
);
