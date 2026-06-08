'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export interface NewRideEvent {
  rideId: string;
  originAddress: string;
  destAddress: string;
  initialPrice: string;
  rideType: 'DELIVERY' | 'TRANSPORT';
}

interface DriverFeedHandlers {
  onNewRide: (e: NewRideEvent) => void;
  onRideAccepted?: (rideId: string) => void;
  onRideCancelled?: (rideId: string) => void;
}

export function useDriverFeed(driverId: string | undefined, handlers: DriverFeedHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // New ride requests — all drivers see new PENDING rides
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('driver-feed-ride-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_requests' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          handlersRef.current.onNewRide({
            rideId: row.id as string,
            originAddress: row.origin_address as string,
            destAddress: row.dest_address as string,
            initialPrice: String(row.initial_price),
            rideType: row.ride_type as 'DELIVERY' | 'TRANSPORT',
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Offer accepted — only fires for this specific driver
  useEffect(() => {
    if (!driverId) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-accepted-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.status === 'ACCEPTED') {
            handlersRef.current.onRideAccepted?.(row.id as string);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  // Ride cancelled — fires for any ride that transitions to CANCELLED
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('driver-feed-cancellations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: 'status=eq.CANCELLED' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          handlersRef.current.onRideCancelled?.(row.id as string);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
