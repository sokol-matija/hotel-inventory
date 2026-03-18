import { createFileRoute } from '@tanstack/react-router'
import ItemsPage from '@/components/items/ItemsPage'

export const Route = createFileRoute('/_layout/items')({
  component: ItemsPage,
})
