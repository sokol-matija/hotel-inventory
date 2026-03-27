import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReservationListRow } from '@/hooks/useReservationsListQuery';
import { ReservationsRowActions } from './ReservationsRowActions';
import type { TFunction } from 'i18next';

// ─── Meta interface (passed via table.options.meta) ─────────────────────────────

export interface ReservationsTableMeta {
  chargeTotals: Record<number, number>;
  onViewDetails: (row: ReservationListRow) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  t: TFunction;
}

// ─── Status badge colors ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'checked-in': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'checked-out': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'no-show': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  unallocated: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
};

// ─── Column helper ──────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ReservationListRow>();

export function getColumns(t: TFunction) {
  return [
    // ── Select ────────────────────────────────────────────────────────────────
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label={t('reservationsList.selectAll', 'Select all')}
          className="border-input h-4 w-4 rounded"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={t('reservationsList.selectRow', 'Select row')}
          className="border-input h-4 w-4 rounded"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    }),

    // ── Guest ─────────────────────────────────────────────────────────────────
    columnHelper.accessor(
      (row) =>
        row.guests?.full_name ??
        `${row.guests?.first_name ?? ''} ${row.guests?.last_name ?? ''}`.trim(),
      {
        id: 'guest',
        header: () => t('reservationsList.columns.guest', 'Guest'),
        cell: ({ row }) => {
          const guest = row.original.guests;
          if (!guest) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {guest.full_name ?? `${guest.first_name} ${guest.last_name}`}
              </span>
              {guest.email && (
                <span className="text-muted-foreground max-w-[200px] truncate text-xs">
                  {guest.email}
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      }
    ),

    // ── Room ──────────────────────────────────────────────────────────────────
    columnHelper.accessor((row) => row.rooms?.room_number ?? '', {
      id: 'room',
      header: () => t('reservationsList.columns.room', 'Room'),
      cell: ({ row }) => {
        const room = row.original.rooms;
        if (!room) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{room.room_number}</span>
            {room.room_types?.code && (
              <Badge variant="outline" className="w-fit text-xs">
                {room.room_types.code}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),

    // ── Check-in ──────────────────────────────────────────────────────────────
    columnHelper.accessor('check_in_date', {
      header: () => t('reservationsList.columns.checkIn', 'Check-in'),
      cell: ({ getValue }) => {
        const val = getValue();
        return val ? format(new Date(val), 'MMM dd, yyyy') : '—';
      },
      enableSorting: true,
    }),

    // ── Check-out ─────────────────────────────────────────────────────────────
    columnHelper.accessor('check_out_date', {
      header: () => t('reservationsList.columns.checkOut', 'Check-out'),
      cell: ({ getValue }) => {
        const val = getValue();
        return val ? format(new Date(val), 'MMM dd, yyyy') : '—';
      },
      enableSorting: true,
    }),

    // ── Status ────────────────────────────────────────────────────────────────
    columnHelper.accessor((row) => row.reservation_statuses?.code ?? '', {
      id: 'status',
      header: () => t('reservationsList.columns.status', 'Status'),
      cell: ({ getValue }) => {
        const code = getValue();
        if (!code) return '—';
        return <Badge className={cn('capitalize', STATUS_STYLES[code] ?? '')}>{code}</Badge>;
      },
      enableColumnFilter: true,
    }),

    // ── Booking source ────────────────────────────────────────────────────────
    columnHelper.accessor((row) => row.booking_sources?.code ?? '', {
      id: 'booking_source',
      header: () => t('reservationsList.columns.source', 'Source'),
      cell: ({ getValue }) => {
        const code = getValue();
        return code ? (
          <Badge variant="outline" className="capitalize">
            {code}
          </Badge>
        ) : (
          '—'
        );
      },
      enableColumnFilter: true,
    }),

    // ── Amount ────────────────────────────────────────────────────────────────
    columnHelper.display({
      id: 'amount',
      header: () => t('reservationsList.columns.amount', 'Amount'),
      cell: ({ row, table }) => {
        const meta = table.options.meta as ReservationsTableMeta | undefined;
        const total = meta?.chargeTotals[row.original.id];
        if (total === undefined) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-medium tabular-nums">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
            }).format(total)}
          </span>
        );
      },
      enableSorting: false,
    }),

    // ── Guests count ──────────────────────────────────────────────────────────
    columnHelper.accessor((row) => (row.adults ?? 0) + (row.children_count ?? 0), {
      id: 'guests_count',
      header: () => t('reservationsList.columns.guests', 'Guests'),
      cell: ({ row }) => {
        const adults = row.original.adults ?? 0;
        const children = row.original.children_count ?? 0;
        return (
          <span className="tabular-nums">
            {adults + children}
            {children > 0 && (
              <span className="text-muted-foreground ml-1 text-xs">
                ({adults}+{children})
              </span>
            )}
          </span>
        );
      },
      enableSorting: true,
    }),

    // ── Actions ───────────────────────────────────────────────────────────────
    columnHelper.display({
      id: 'actions',
      header: () => null,
      cell: ({ row, table }) => {
        const meta = table.options.meta as ReservationsTableMeta | undefined;
        if (!meta) return null;
        return (
          <ReservationsRowActions
            row={row.original}
            onViewDetails={meta.onViewDetails}
            onEdit={meta.onEdit}
            onDelete={meta.onDelete}
            onStatusChange={meta.onStatusChange}
            t={meta.t}
          />
        );
      },
      size: 40,
    }),
  ];
}
