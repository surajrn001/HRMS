import React from 'react';
import { Bell, CheckCheck, X, Clock, Info } from 'lucide-react';

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '520px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>System Notifications</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'You are all caught up!'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Info size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: n.is_read ? 'var(--bg-hover)' : 'rgba(99, 102, 241, 0.08)',
                  borderLeft: `4px solid ${n.is_read ? 'var(--border-subtle)' : 'var(--primary)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: n.is_read ? 'var(--text-main)' : 'var(--primary)' }}>
                      {n.title}
                    </h4>
                    {!n.is_read && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {!n.is_read && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onMarkAsRead(n.id)}
                    title="Mark as read"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', alignSelf: 'center' }}
                  >
                    Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
