'use client';

import { useEffect } from 'react';
import { X, Navigation, MapPin, Bike, Flag, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import Image from 'next/image';

const TYPE_BG: Record<string, string> = {
  success: 'var(--success)',
  info:    'var(--primary)',
  error:   '#ef4444',
};

const LUCIDE_ICONS: Record<string, React.ReactNode> = {
  nav:   <Navigation size={22} color="#fff" />,
  pin:   <MapPin size={22} color="#fff" />,
  bike:  <Bike size={22} color="#fff" />,
  flag:  <Flag size={22} color="#fff" />,
  x:     <AlertCircle size={22} color="#fff" />,
  check: <CheckCircle size={22} color="#fff" />,
  bell:  <Bell size={22} color="#fff" />,
};

interface ToastProps {
  message: string;
  subMessage?: string;
  icon?: string;
  photoUrl?: string;
  type?: 'success' | 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  subMessage,
  icon = 'bell',
  photoUrl,
  type = 'success',
  actionLabel,
  onAction,
  onDismiss,
  duration = 8000,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const iconNode = photoUrl ? null : (LUCIDE_ICONS[icon] ?? <Bell size={22} color="#fff" />);

  return (
    <div
      className="animate-slide-down"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 448,
        zIndex: 9999,
        background: TYPE_BG[type] ?? TYPE_BG.success,
        borderRadius: 'var(--r-md)',
        padding: '14px 14px 14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={40}
          height={40}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }}
        />
      ) : (
        <span style={{ flexShrink: 0, display: 'flex' }}>{iconNode}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>
          {message}
        </div>
        {subMessage && (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
            {subMessage}
          </div>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: '#fff',
            color: TYPE_BG[type] ?? TYPE_BG.success,
            border: 'none',
            borderRadius: 'var(--r-sm)',
            padding: '7px 14px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1,
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
