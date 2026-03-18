import { createFileRoute } from '@tanstack/react-router'
import RoomServiceOrders from '@/components/hotel/frontdesk/RoomService/RoomServiceOrders'
import { useHotel } from '@/lib/hotel/state/SupabaseHotelContext'

function RoomServicePage() {
  const { rooms } = useHotel()
  return <RoomServiceOrders rooms={rooms} />
}

export const Route = createFileRoute('/hotel/front-desk/room-service')({
  component: RoomServicePage,
})
