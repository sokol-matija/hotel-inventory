import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReservationListRow } from '@/hooks/useReservationsListQuery';
import type { TFunction } from 'i18next';

const ALL_STATUSES = [
  'confirmed',
  'checked-in',
  'checked-out',
  'cancelled',
  'no-show',
  'pending',
  'unallocated',
] as const;

interface ReservationsRowActionsProps {
  row: ReservationListRow;
  onViewDetails: (row: ReservationListRow) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  t: TFunction;
}

export function ReservationsRowActions({
  row,
  onViewDetails,
  onEdit,
  onDelete,
  onStatusChange,
  t,
}: ReservationsRowActionsProps) {
  const currentStatus = row.reservation_statuses?.code;

  const handleDelete = () => {
    const confirmed = window.confirm(
      t('reservationsList.confirmDelete', 'Are you sure you want to delete this reservation?')
    );
    if (confirmed) {
      onDelete(row.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium"
        aria-label={t('reservationsList.openMenu', 'Open menu')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(row)}>
          <Eye className="mr-2 h-4 w-4" />
          {t('reservationsList.actions.viewDetails', 'View Details')}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onEdit(row.id)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('reservationsList.actions.edit', 'Edit')}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t('reservationsList.actions.changeStatus', 'Change Status')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ALL_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={status === currentStatus}
                onClick={() => onStatusChange(row.id, status)}
                className="capitalize"
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('reservationsList.actions.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
