import { createFileRoute } from '@tanstack/react-router';
import ChannelManagerSettings from '@/components/hotel/frontdesk/ChannelManager/ChannelManagerSettings';

export const Route = createFileRoute('/hotel/front-desk/channel-manager/settings')({
  component: ChannelManagerSettings,
});
