import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  User,
  Trash2,
  Check,
  Sparkles,
  Eye,
  X,
  BellRing
} from 'lucide-react';
import { api } from '../services/api';

export default function AnnouncementsView({ user }) {
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Post Announcement Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);

  // Read Detail Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, [search]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnnouncements(search);
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert('Please fill in both title and message');
      return;
    }
    setPosting(true);
    try {
      await api.createAnnouncement({
        title: newTitle.trim(),
        message: newMessage.trim(),
      });
      setIsPostModalOpen(false);
      setNewTitle('');
      setNewMessage('');
      setSuccessMsg('Announcement broadcasted to all active team members!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this company announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      setSuccessMsg('Announcement deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to delete announcement');
    }
  };

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone className="text-primary" size={28} />
            Company Announcements & Bulletin
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Stay aligned with executive townhalls, policy updates, cultural events, and organization milestones.
          </p>
        </div>

        {canManage && (
          <button
            id="btn-post-announcement"
            className="btn btn-primary"
            onClick={() => setIsPostModalOpen(true)}
          >
            <Plus size={16} /> Broadcast Announcement
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-dim)" />
          <input
            id="input-search-announcements"
            type="text"
            className="input"
            style={{ flex: 1, border: 'none', padding: '6px 0', fontSize: '0.9rem', outline: 'none', background: 'transparent' }}
            placeholder="Search announcements by keywords, events, policy titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Announcements Board Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <Megaphone size={40} color="var(--text-dim)" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No announcements found</div>
          <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            {search ? `No announcements match "${search}".` : 'There are no announcements posted yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {announcements.map((item) => {
            const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={item.id}
                id={`announcement-card-${item.id}`}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  borderTop: '3px solid var(--primary)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
                      {item.title}
                    </h3>
                    <span className="badge badge-indigo" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                      Notice
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      margin: '0 0 16px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.message}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {item.author_name} ({item.author_role})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {formattedDate}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      id={`btn-read-announcement-${item.id}`}
                      className="btn btn-ghost"
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={() => setSelectedAnnouncement(item)}
                    >
                      <Eye size={14} /> Read Full
                    </button>
                    {canManage && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Delete Announcement"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isPostModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <BellRing size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Post Internal Announcement
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  This will broadcast an in-app alert to all active team members
                </span>
              </div>
            </div>

            <form onSubmit={handlePostAnnouncement}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Announcement Title *
                </label>
                <input
                  id="modal-announcement-title"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 📢 Q4 All-Hands Townhall & Awards Ceremony"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Detailed Announcement Message *
                </label>
                <textarea
                  id="modal-announcement-message"
                  className="input"
                  rows={5}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Write clear, comprehensive details for your organization bulletin..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPostModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-post-announcement"
                  type="submit"
                  className="btn btn-primary"
                  disabled={posting}
                >
                  {posting ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Detail Modal */}
      {selectedAnnouncement && (
        <div className="modal-backdrop" onClick={() => setSelectedAnnouncement(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-indigo" style={{ marginBottom: '8px', display: 'inline-block' }}>
                  Company Bulletin
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {selectedAnnouncement.title}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>Posted by: <strong>{selectedAnnouncement.author_name}</strong> ({selectedAnnouncement.author_role})</span>
                  <span>•</span>
                  <span>{new Date(selectedAnnouncement.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px' }}
                onClick={() => setSelectedAnnouncement(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                fontSize: '0.925rem',
                color: 'var(--text-main)',
                lineHeight: 1.6,
                padding: '16px 0',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {selectedAnnouncement.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
