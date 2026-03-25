import { createFileRoute } from '@tanstack/react-router';
import GlobalView from '@/components/global/GlobalView';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout/global')({
  beforeLoad: requireRole([2, 5]), // kitchen + admin
  validateSearch: (search: Record<string, unknown>): { filter?: string } => ({
    ...(search.filter ? { filter: search.filter as string } : {}),
  }),
  component: GlobalView,
});
