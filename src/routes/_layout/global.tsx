import { createFileRoute } from '@tanstack/react-router';
import GlobalView from '@/components/global/GlobalView';

export const Route = createFileRoute('/_layout/global')({
  validateSearch: (search: Record<string, unknown>): { filter?: string } => ({
    ...(search.filter ? { filter: search.filter as string } : {}),
  }),
  component: GlobalView,
});
