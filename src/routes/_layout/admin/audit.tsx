import { createFileRoute } from '@tanstack/react-router'
import AuditLogPage from '@/components/audit/AuditLogPage'

export const Route = createFileRoute('/_layout/admin/audit')({
  component: AuditLogPage,
})
