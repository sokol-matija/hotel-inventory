import { createFileRoute } from '@tanstack/react-router';
import CompanyManagement from '@/components/hotel/companies/CompanyManagement';

export const Route = createFileRoute('/hotel/front-desk/companies')({
  component: CompanyManagement,
});
