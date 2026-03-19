import { createFileRoute } from '@tanstack/react-router';
import RevenueAnalyticsPage from '@/components/hotel/finance/RevenueAnalyticsPage';

export const Route = createFileRoute('/hotel/finance/revenue-analytics')({
  component: RevenueAnalyticsPage,
});
