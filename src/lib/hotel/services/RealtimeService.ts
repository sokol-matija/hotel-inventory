// RealtimeService - Real-time subscriptions for hotel data
// Handles real-time updates for reservations, rooms, and guests

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { Reservation, Room, Guest } from '../types';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
  table: string;
}

export interface ReservationRealtimePayload extends RealtimePayload {
  new: Reservation | null;
  old: Reservation | null;
}

export interface RoomRealtimePayload extends RealtimePayload {
  new: Room | null;
  old: Room | null;
}

export interface GuestRealtimePayload extends RealtimePayload {
  new: Guest | null;
  old: Guest | null;
}

export type ReservationChangeHandler = (payload: ReservationRealtimePayload) => void;
export type RoomChangeHandler = (payload: RoomRealtimePayload) => void;
export type GuestChangeHandler = (payload: GuestRealtimePayload) => void;

export class RealtimeService {
  private static instance: RealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private static readonly HOTEL_POREC_ID = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for Hotel Porec
  
  private constructor() {}
  
  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Subscribe to reservation changes
   */
  subscribeToReservations(
    onReservationChange: ReservationChangeHandler,
    roomId?: string
  ): () => void {
    const channelName = roomId 
      ? `reservations-room-${roomId}`
      : 'reservations-all';

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: roomId 
            ? `room_id=eq.${roomId}`
            : `hotel_id=eq.${RealtimeService.HOTEL_POREC_ID}`
        },
        (payload) => {
          console.log('Reservation change:', payload);
          
          const realtimePayload: ReservationRealtimePayload = {
            eventType: payload.eventType as RealtimeEventType,
            new: payload.new as Reservation | null,
            old: payload.old as Reservation | null,
            table: 'reservations'
          };
          
          onReservationChange(realtimePayload);
        }
      )
      .subscribe((status) => {
        console.log(`Reservation subscription ${channelName}:`, status);
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to room status changes
   */
  subscribeToRooms(
    onRoomChange: RoomChangeHandler,
    floor?: number
  ): () => void {
    const channelName = floor 
      ? `rooms-floor-${floor}`
      : 'rooms-all';

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: floor 
            ? `floor=eq.${floor}`
            : `hotel_id=eq.${RealtimeService.HOTEL_POREC_ID}`
        },
        (payload) => {
          console.log('Room change:', payload);
          
          const realtimePayload: RoomRealtimePayload = {
            eventType: payload.eventType as RealtimeEventType,
            new: payload.new as Room | null,
            old: payload.old as Room | null,
            table: 'rooms'
          };
          
          onRoomChange(realtimePayload);
        }
      )
      .subscribe((status) => {
        console.log(`Room subscription ${channelName}:`, status);
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to guest changes
   */
  subscribeToGuests(
    onGuestChange: GuestChangeHandler
  ): () => void {
    const channelName = 'guests-all';

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests'
        },
        (payload) => {
          console.log('Guest change:', payload);
          
          const realtimePayload: GuestRealtimePayload = {
            eventType: payload.eventType as RealtimeEventType,
            new: payload.new as Guest | null,
            old: payload.old as Guest | null,
            table: 'guests'
          };
          
          onGuestChange(realtimePayload);
        }
      )
      .subscribe((status) => {
        console.log(`Guest subscription ${channelName}:`, status);
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to hotel timeline changes (all relevant tables)
   */
  subscribeToHotelTimeline(
    onReservationChange: ReservationChangeHandler,
    onRoomChange?: RoomChangeHandler,
    onGuestChange?: GuestChangeHandler
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to reservations
    const unsubReservations = this.subscribeToReservations(onReservationChange);
    unsubscribeFunctions.push(unsubReservations);

    // Subscribe to rooms if handler provided
    if (onRoomChange) {
      const unsubRooms = this.subscribeToRooms(onRoomChange);
      unsubscribeFunctions.push(unsubRooms);
    }

    // Subscribe to guests if handler provided
    if (onGuestChange) {
      const unsubGuests = this.subscribeToGuests(onGuestChange);
      unsubscribeFunctions.push(unsubGuests);
    }

    // Return function to unsubscribe from all
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  /**
   * Subscribe to specific reservation changes
   */
  subscribeToReservation(
    reservationId: string,
    onReservationChange: ReservationChangeHandler
  ): () => void {
    const channelName = `reservation-${reservationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `id=eq.${reservationId}`
        },
        (payload) => {
          console.log('Single reservation change:', payload);
          
          const realtimePayload: ReservationRealtimePayload = {
            eventType: payload.eventType as RealtimeEventType,
            new: payload.new as Reservation | null,
            old: payload.old as Reservation | null,
            table: 'reservations'
          };
          
          onReservationChange(realtimePayload);
        }
      )
      .subscribe((status) => {
        console.log(`Single reservation subscription ${channelName}:`, status);
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelName: string): void {
    const existingChannel = this.channels.get(channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from ${channelName}`);
    });
    this.channels.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    // Supabase realtime doesn't expose connection details directly
    // We'll return a simple status based on channel count
    return this.channels.size > 0 ? 'connected' : 'disconnected';
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    supabase.realtime.disconnect();
    setTimeout(() => {
      supabase.realtime.connect();
    }, 1000);
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get active channel names
   */
  getActiveChannelNames(): string[] {
    return Array.from(this.channels.keys());
  }
}

export const realtimeService = RealtimeService.getInstance();