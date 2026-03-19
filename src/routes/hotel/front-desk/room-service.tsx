import { createFileRoute } from '@tanstack/react-router';
import RoomServiceOrders from '@/components/hotel/frontdesk/RoomService/RoomServiceOrders';

function RoomServicePage() {
  return <RoomServiceOrders />;
}

export const Route = createFileRoute('/hotel/front-desk/room-service')({
  component: RoomServicePage,
});
