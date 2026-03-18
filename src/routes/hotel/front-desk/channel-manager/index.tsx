import { createFileRoute } from '@tanstack/react-router'
import ChannelManagerDashboard from '@/components/hotel/frontdesk/ChannelManager/ChannelManagerDashboard'

export const Route = createFileRoute('/hotel/front-desk/channel-manager/')({
  component: ChannelManagerDashboard,
})
