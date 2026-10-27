import React, { useState } from 'react';
import { Bell, CheckCheck, X, Clock, Info, Trash2 } from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'ATTENDANCE',
  'LEAVE',
  'PAYROLL',
  'SHIFT',
  'PERFORMANCE',
  'DOCUMENT',
  'SYSTEM',
];

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
}) {
  if (!isOpen) return null;

  const [activeCategory, setActiveCategory] = useState('ALL');

  const filtered = activeCategory === 'ALL'
    ? notifications
    : notifications.filter((n) => (n.category || 'SYSTEM').toUpperCase() === activeCategory);

  const unreadCount = filtered.filter((n) => !n.is_read).length;

  const getCategoryBadge = (category = 'SYSTEM') => {
    const cat = category.toUpperCase();
    const styleMap = {
      ATTENDANCE: { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      LEAVE: { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
      PAYROLL: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
      SHIFT: { bg: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' },
      PERFORMANCE: { bg: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' },
      DOCUMENT: { bg: 'rgba(14, 165, 233, 0.1)', color: '#0284c7' },
      SYSTEM: { bg: 'rgba(107, 114, 128, 0.1)', color: '#4b5563' },
    };
    const s = styleMap[cat] || styleMap.SYSTEM;
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {cat}
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '580px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Smart Notifications & Alerts</h3>
                <span className="badge badge-indigo" style={{ fontSize: '10px' }}>Module 19</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
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
            {onClearAllNotifications && notifications.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClearAllNotifications}
                title="Clear all notifications"
                style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444' }}
              >
                Clear all
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '14px',
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORIES.map((cat) => {
            const count = cat === 'ALL'
              ? notifications.length
              : notifications.filter((n) => (n.category || 'SYSTEM').toUpperCase() === cat).length;
            if (cat !== 'ALL' && count === 0) return null;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: activeCategory === cat ? 'var(--primary)' : 'var(--surface-muted)',
                  color: activeCategory === cat ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid ' + (activeCategory === cat ? 'var(--primary)' : 'var(--border)'),
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Info size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>No notifications in this category</p>
            </div>
          ) : (
            filtered.map((n) => (
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
                    {getCategoryBadge(n.category)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'center' }}>
                  {!n.is_read && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onMarkAsRead(n.id)}
                      title="Mark as read"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Read
                    </button>
                  )}
                  {onDeleteNotification && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onDeleteNotification(n.id)}
                      title="Dismiss"
                      style={{ padding: '4px', color: 'var(--text-dim)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
