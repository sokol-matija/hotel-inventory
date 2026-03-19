import { useEffect } from 'react'
import { useHotelStore } from '@/stores/hotelStore'
export { useHotel } from '@/stores/hotelStore'

export function SupabaseHotelProvider({ children }: { children: React.ReactNode }) {
  const initialize = useHotelStore(state => state.initialize)
  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, [initialize])
  return <>{children}</>
}
