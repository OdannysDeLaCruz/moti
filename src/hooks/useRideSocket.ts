'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export interface RideOfferEvent {
  offerId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  counterPrice: number;
}

export interface RideAcceptedEvent {
  rideId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  finalPrice: number;
}

export interface RideStatusEvent {
  rideId: string;
  status: string;
}

export interface DriverLocationEvent {
  driverId: string;
  lat: number;
  lng: number;
}

interface Handlers {
  onOffer?: (e: RideOfferEvent) => void;
  onAccepted?: (e: RideAcceptedEvent) => void;
  onStatus?: (e: RideStatusEvent) => void;
  onDriverLocation?: (e: DriverLocationEvent) => void;
}

export function useRideSocket(rideId: string | undefined, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!rideId) return;
    const supabase = getSupabaseClient();

    // New offers on this ride — table: ride_offers (Prisma RideOffer model)
    const offersChannel = supabase
      .channel(`ride-offers-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_offers',
          filter: `ride_request_id=eq.${rideId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          handlersRef.current.onOffer?.({
            offerId: row.id as string,
            driverId: row.driver_id as string,
            // driver name/phone require a join — pages should call fetchRide() on this event
            driverName: '',
            driverPhone: '',
            counterPrice: Number(row.counter_price),
          });
        },
      )
      .subscribe();

    // Ride status changes — table: ride_requests (Prisma RideRequest model)
    const statusChannel = supabase
      .channel(`ride-status-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const status = row.status as string;

          handlersRef.current.onStatus?.({ rideId, status });

          if (status === 'ACCEPTED') {
            // driver name/phone require a join — pages should call fetchRide() on this event
            handlersRef.current.onAccepted?.({
              rideId,
              driverId: (row.driver_id as string) ?? '',
              driverName: '',
              driverPhone: '',
              finalPrice: Number(row.final_price),
            });
          }
        },
      )
      .subscribe();

    // Driver location — sent via Supabase Broadcast from the driver's browser
    const locationChannel = supabase
      .channel(`driver-location-${rideId}`)
      .on('broadcast', { event: 'driver:location' }, ({ payload }) => {
        handlersRef.current.onDriverLocation?.(payload as DriverLocationEvent);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [rideId]);
}
