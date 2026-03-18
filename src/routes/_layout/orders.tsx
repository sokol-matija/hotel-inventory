import { createFileRoute } from '@tanstack/react-router'
import OrdersPage from '@/components/orders/OrdersPage'

export const Route = createFileRoute('/_layout/orders')({
  component: OrdersPage,
})
