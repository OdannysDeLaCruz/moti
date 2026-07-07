'use client';

import { useEffect, useState } from 'react';
import { Bell, Share, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PROMPT_DISMISSED_KEY = 'motu_push_prompt_dismissed';
const IOS_HINT_DISMISSED_KEY = 'motu_push_ios_hint_dismissed';

type Banner = 'none' | 'prompt' | 'ios-hint';

export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const { supported, permission, iosNeedsInstall, subscribe } = usePushNotifications();
  const [banner, setBanner] = useState<Banner>('none');
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let next: Banner = 'none';

    if (user && supported) {
      if (iosNeedsInstall) {
        next = localStorage.getItem(IOS_HINT_DISMISSED_KEY) ? 'none' : 'ios-hint';
      } else if (permission === 'default' && !localStorage.getItem(PROMPT_DISMISSED_KEY)) {
        next = 'prompt';
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBanner(next);
  }, [user, supported, iosNeedsInstall, permission]);

  if (banner === 'none') return null;

  function dismiss(key: string) {
    localStorage.setItem(key, '1');
    setBanner('none');
  }

  async function handleActivate() {
    setSubscribing(true);
    setError(false);
    try {
      await subscribe();
      setBanner('none');
    } catch {
      setError(true);
    } finally {
      setSubscribing(false);
    }
  }

  const isIosHint = banner === 'ios-hint';

  return (
    <div
      className="card-ghost animate-slide-down"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 448,
        zIndex: 900,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 14px 14px 16px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--r-full)',
          background: 'var(--primary-pale)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isIosHint ? (
          <Share size={16} color="var(--primary-dark)" />
        ) : (
          <Bell size={16} color="var(--primary-dark)" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-semibold text-sm">
          {isIosHint ? 'Instala Motu para recibir notificaciones' : 'Activa las notificaciones'}
        </p>
        <p className="text-muted text-xs mt-1">
          {isIosHint
            ? 'Toca Compartir y luego "Agregar a inicio" para instalar la app.'
            : error
              ? 'No se pudo activar. Revisa tu conexión o el antivirus/firewall e intenta de nuevo.'
              : 'Activa las notificaciones para no perderte tus viajes.'}
        </p>

        {!isIosHint && (
          <button
            className="btn btn-primary btn-sm mt-3"
            onClick={handleActivate}
            disabled={subscribing}
          >
            {subscribing ? <span className="spinner spinner-sm" /> : error ? 'Reintentar' : 'Activar'}
          </button>
        )}
      </div>

      <button
        onClick={() => dismiss(isIosHint ? IOS_HINT_DISMISSED_KEY : PROMPT_DISMISSED_KEY)}
        aria-label="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
