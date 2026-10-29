import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Star,
  Send,
  MessageSquare,
  Sparkles,
  Users,
  CheckCircle2,
  TrendingUp,
  Smile,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function FeedbackView({ user }) {
  const isEmployee = user.role === 'EMPLOYEE';
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [feedbacks, setFeedbacks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Submit Feedback State
  const [rating, setRating] = useState(5.0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const loadFeedbackData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (canManage) {
        const [fbList, sumData] = await Promise.all([
          api.getFeedback(),
          api.getFeedbackSummary(),
        ]);
        setFeedbacks(fbList);
        setSummary(sumData);
      } else {
        const fbList = await api.getFeedback();
        setFeedbacks(fbList);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Please provide your feedback comments');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitFeedback({
        rating: parseFloat(rating),
        message: message.trim(),
      });
      setMessage('');
      setRating(5.0);
      setSuccessMsg('Thank you! Your feedback has been shared with People Operations.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadFeedbackData();
    } catch (err) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HeartHandshake className="text-primary" size={28} />
          Employee Sentiment & Feedback
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isEmployee
            ? 'Voice your workplace ideas, share anonymous or attributed sentiments, and help shape company culture.'
            : 'Track workforce sentiment, satisfaction benchmarks, and qualitative workplace feedback.'}
        </p>
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

      {/* HR / Management Dashboard Summary */}
      {canManage && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
          {/* Average Rating Card */}
          <div className="card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
            >
              <span style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>
                {summary.average_rating}
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>/ 5.0</span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Overall Satisfaction
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {summary.average_rating >= 4.5
                  ? '🌟 Excellent Culture'
                  : summary.average_rating >= 4.0
                  ? '👍 Healthy Sentiment'
                  : '⚠️ Action Required'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Based on {summary.total_feedbacks} employee submissions
              </div>
            </div>
          </div>

          {/* Rating Distribution Card */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
              Rating Distribution
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.rating_distribution[String(stars)] || 0;
                const pct = summary.total_feedbacks > 0
                  ? Math.round((count / summary.total_feedbacks) * 100)
                  : 0;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                    <span style={{ width: '38px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {stars} <Star size={11} fill="#f59e0b" color="#f59e0b" />
                    </span>
                    <div style={{ flex: 1, height: '7px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: stars >= 4 ? '#10b981' : stars === 3 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span style={{ width: '30px', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Submit Form & Feedbacks List */}
      <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '1fr 1fr' : '1fr', gap: '22px' }}>
        {/* Submit Feedback Form (Always available to employees, or optional for admins) */}
        {isEmployee && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Smile size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Share Your Experience
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  How has your experience at WorkSphere been?
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Star Rating Picker */}
              <div style={{ marginBottom: '18px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Overall Rating (1 - 5 Stars) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const filled = (hoverRating || rating) >= starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: filled ? '#f59e0b' : 'var(--text-dim)',
                          transition: 'transform 0.1s ease',
                        }}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(starValue)}
                      >
                        <Star size={30} fill={filled ? '#f59e0b' : 'none'} />
                      </button>
                    );
                  })}
                  <span style={{ marginLeft: '10px', fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b' }}>
                    {rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Feedback Comments / Suggestions *
                </label>
                <textarea
                  id="textarea-feedback-message"
                  className="input"
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Tell us what you like or what we can improve (workplace tools, management, culture, infrastructure)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-submit-feedback"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={submitting}
              >
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}

        {/* Feedbacks List */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} />
            {isEmployee ? 'My Feedback Submissions' : 'All Employee Feedback Submissions'}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Loading feedback...
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <HeartHandshake size={36} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No feedback recorded yet</div>
              <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                {isEmployee ? 'Be the first to share your thoughts!' : 'No employee feedback submitted.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '520px', overflowY: 'auto' }}>
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  id={`feedback-item-${fb.id}`}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={15}
                          fill={i < Math.round(fb.rating) ? '#f59e0b' : 'none'}
                          color={i < Math.round(fb.rating) ? '#f59e0b' : '#cbd5e1'}
                        />
                      ))}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: '6px', color: '#b45309' }}>
                        {fb.rating.toFixed(1)}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(fb.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    "{fb.message}"
                  </p>

                  {canManage && fb.employee_name && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      — {fb.employee_name} ({fb.department})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
