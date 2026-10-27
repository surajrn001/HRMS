import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function PerformanceView({ user }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // New Review Modal
  const [showModal, setShowModal] = useState(false);
  const [newReview, setNewReview] = useState({
    employee_id: '',
    review_period: 'Q3 2026',
    rating: 5.0,
    feedback: '',
    goals: '',
    reviewer_name: user?.full_name || user?.username || 'HR Manager',
  });
  const [submitting, setSubmitting] = useState(false);

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'HR';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedPeriod !== 'All') {
        params.review_period = selectedPeriod;
      }
      if (isPrivileged && selectedEmpId) {
        params.employee_id = selectedEmpId;
      }

      const revs = await api.getPerformanceReviews(params);
      setReviews(revs || []);

      if (isPrivileged) {
        const [statsData, emps] = await Promise.all([
          api.getPerformanceStats(),
          api.getEmployees(),
        ]);
        setStats(statsData);
        setEmployees(emps || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load performance reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedEmpId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.employee_id) {
      setError('Please select an employee for this review');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.createPerformanceReview({
        ...newReview,
        employee_id: parseInt(newReview.employee_id),
        rating: parseFloat(newReview.rating),
      });

      setSuccess('Performance review published successfully');
      setShowModal(false);
      setNewReview({
        employee_id: '',
        review_period: 'Q3 2026',
        rating: 5.0,
        feedback: '',
        goals: '',
        reviewer_name: user?.full_name || user?.username || 'HR Manager',
      });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to publish review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    return (
      <span style={{ color: '#f59e0b', fontSize: '16px', letterSpacing: '2px' }}>
        {'★'.repeat(fullStars)}
        {hasHalf ? '½' : ''}
        <span style={{ color: '#d1d5db' }}>{'★'.repeat(Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0)))}</span>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Performance Management System
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {isPrivileged
              ? 'Evaluate employee milestones, track company ratings, and nurture professional growth.'
              : 'Review your quarterly appraisals, manager feedback, and strategic goals.'}
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
            Record Review
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius)', color: '#059669', fontSize: '14px' }}>
          {success}
        </div>
      )}

      {/* Privileged Stats Cards */}
      {isPrivileged && stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Average Company Rating
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>
              {stats.average_rating} <span style={{ fontSize: '18px', fontWeight: '400' }}>/ 5.0</span>
            </div>
            <div style={{ marginTop: '4px' }}>{renderStars(stats.average_rating)}</div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Reviews Filed
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>
              {stats.total_reviews}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Formal appraisals documented
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Top Performers (4.5★+)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
              {stats.rating_distribution?.['5_stars'] || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Exceeding expectations
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Solid Contributors (3.5 - 4.4★)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)', marginTop: '6px' }}>
              {stats.rating_distribution?.['4_stars'] || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Meeting core objectives
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '14px 20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Period:</span>
          {['All', 'Q1 2026', 'Q2 2026', 'Q3 2026'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                background: selectedPeriod === period ? 'var(--primary)' : 'var(--surface-muted)',
                color: selectedPeriod === period ? '#ffffff' : 'var(--text-main)',
                border: '1px solid ' + (selectedPeriod === period ? 'var(--primary)' : 'var(--border)'),
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {isPrivileged && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Employee:</span>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: '#ffffff',
                fontSize: '13px',
                color: 'var(--text-main)',
              }}
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.department})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading performance reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⭐</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
            No performance reviews found
          </div>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>
            There are no reviews matching this filter period.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {r.review_period}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                      {r.employee_name}
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      ({r.department})
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Reviewed by <strong>{r.reviewer_name || 'HR Management'}</strong> on{' '}
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>
                    {r.rating.toFixed(1)}
                  </span>
                  <div>{renderStars(r.rating)}</div>
                </div>
              </div>

              {/* Feedback text */}
              <div
                style={{
                  background: 'var(--surface-muted)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Manager Assessment
                </div>
                "{r.feedback}"
              </div>

              {/* Goals */}
              {r.goals && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  🎯 <strong style={{ color: 'var(--text-main)' }}>Key Objectives:</strong> {r.goals}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Review Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg, 12px)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                Record Employee Appraisal
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Employee <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={newReview.employee_id}
                  onChange={(e) => setNewReview({ ...newReview, employee_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    background: '#fff',
                  }}
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.department} - {e.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Review Period <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newReview.review_period}
                    onChange={(e) => setNewReview({ ...newReview, review_period: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  >
                    <option value="Q3 2026">Q3 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Annual 2026">Annual 2026</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Rating: <strong style={{ color: '#f59e0b' }}>{newReview.rating}★</strong>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Detailed Qualitative Feedback <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="Provide structured feedback on achievements, technical delivery, leadership, and team collaboration..."
                  value={newReview.feedback}
                  onChange={(e) => setNewReview({ ...newReview, feedback: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Forward-Looking Goals & Next Milestones
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lead automated CI/CD pipeline setup, mentor associate developers"
                  value={newReview.goals}
                  onChange={(e) => setNewReview({ ...newReview, goals: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    padding: '9px 16px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Publishing...' : 'Publish Appraisal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
