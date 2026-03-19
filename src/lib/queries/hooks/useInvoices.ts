import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../queryKeys';
import { hotelDataService } from '../../hotel/services/HotelDataService';

// ─── Query ────────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.all(),
    queryFn: () => hotelDataService.getInvoices(),
    staleTime: 1000 * 60 * 2, // 2 min — invoices change less frequently
  });
}

// ─── Derived ──────────────────────────────────────────────────────────────────

export function useUnpaidInvoices() {
  const { data: invoices = [], ...rest } = useInvoices();
  const unpaid = useMemo(() => invoices.filter((inv) => inv.status !== 'paid'), [invoices]);
  return { data: unpaid, ...rest };
}

export function useInvoicesByDateRange(start: Date | null, end: Date | null) {
  const { data: invoices = [], ...rest } = useInvoices();
  const filtered = useMemo(() => {
    if (!start || !end) return invoices;
    return invoices.filter((inv) => inv.issueDate >= start && inv.issueDate <= end);
  }, [invoices, start, end]);
  return { data: filtered, ...rest };
}
