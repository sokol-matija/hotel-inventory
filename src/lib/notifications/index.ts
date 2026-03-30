// Public API -- re-exports the notify singleton as default so that
// `import hotelNotification from '@/lib/notifications'` keeps working.

export type { NotificationType } from './types';
export { default } from './notify';
