'use client';

import { useEffect } from 'react';

const TYPE_BG: Record<string, string> = {
  success: 'var(--success)',
  info:    'var(--primary)',
  error:   '#ef4444',
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
  icon = '🎉',
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
        <img
          src={photoUrl}
          alt=""
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }}
        />
      ) : (
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
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
          fontSize: '20px',
          padding: '0',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
