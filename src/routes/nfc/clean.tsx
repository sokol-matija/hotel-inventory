import { createFileRoute } from '@tanstack/react-router';
import { NFCCleanRoomPage } from '@/components/testing/NFCCleanRoomPage';

export const Route = createFileRoute('/nfc/clean')({
  validateSearch: (search: Record<string, unknown>) => ({
    roomId: search.roomId as string | undefined,
  }),
  component: NFCCleanRoomPage,
});
