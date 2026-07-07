'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api-client';
import {
  isIosDevice,
  isIosStandalone,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/subscribe';

type PushPermissionState = NotificationPermission | 'unsupported';

interface UsePushNotifications {
  supported: boolean;
  permission: PushPermissionState;
  // Whether this device actually has a live push subscription — distinct from
  // `permission`, since requestPermission() can succeed while the subsequent
  // pushManager.subscribe() call still fails (e.g. push service unreachable).
  subscribed: boolean;
  iosNeedsInstall: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function readPermission(supported: boolean): PushPermissionState {
  if (!supported || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function usePushNotifications(): UsePushNotifications {
  const supported = isPushSupported();
  const [permission, setPermission] = useState<PushPermissionState>('unsupported');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(readPermission(supported));

    if (!supported) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) return;

    const { data } = await api.get<{ publicKey: string }>('/api/push/vapid-public-key');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return;

    // Only reflect "subscribed" once both the browser subscription and the
    // backend save succeed — a granted permission does not guarantee either.
    const subscriptionJson = await subscribeToPush(data.publicKey);
    await api.post('/api/push/subscribe', subscriptionJson);
    setSubscribed(true);
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;

    // Note: unsubscribing does not change the browser's Notification.permission
    // (that's a separate, one-way grant) — only the subscription is revoked.
    const endpoint = await unsubscribeFromPush();
    setSubscribed(false);
    if (!endpoint) return;

    await api.post('/api/push/unsubscribe', { endpoint });
  }, [supported]);

  return {
    supported,
    permission,
    subscribed,
    iosNeedsInstall: isIosDevice() && !isIosStandalone(),
    subscribe,
    unsubscribe,
  };
}
