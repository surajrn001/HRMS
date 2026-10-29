import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  UserX,
  FileText,
  Calendar,
  Check,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function ExitManagementView({ user }) {
  const isEmployee = user.role === 'EMPLOYEE';
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Submit Resignation Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('30 Days');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadResignations();
  }, [filterStatus]);

  const loadResignations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResignations(filterStatus !== 'ALL' ? filterStatus : null);
      setResignations(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load exit records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for resignation');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitResignation({
        reason: reason.trim(),
        notice_period: noticePeriod,
      });
      setIsSubmitModalOpen(false);
      setReason('');
      setSuccessMsg('Your resignation request has been formally submitted to People Operations.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadResignations();
    } catch (err) {
      alert(err.message || 'Failed to submit resignation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const actionName = status === 'APPROVED' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionName} this resignation request?`)) return;

    try {
      await api.updateResignationStatus(id, status);
      setSuccessMsg(`Resignation request successfully ${status.toLowerCase()}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadResignations();
    } catch (err) {
      alert(err.message || 'Failed to update resignation status');
    }
  };

  const hasActivePending = isEmployee && resignations.some((r) => r.status === 'PENDING');

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogOut className="text-primary" size={28} />
            {isEmployee ? 'Exit & Separation Portal' : 'Resignation & Exit Management'}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isEmployee
              ? 'Initiate formal resignation, track notice period milestones, and monitor separation clearance.'
              : 'Review employee separation requests, notice period obligations, and complete offboarding workflows.'}
          </p>
        </div>

        {isEmployee && (
          <button
            id="btn-submit-resignation"
            className="btn btn-primary"
            disabled={hasActivePending}
            onClick={() => setIsSubmitModalOpen(true)}
            style={{
              backgroundColor: hasActivePending ? 'var(--text-dim)' : 'var(--danger)',
              borderColor: hasActivePending ? 'var(--text-dim)' : 'var(--danger)',
            }}
          >
            <Send size={16} /> {hasActivePending ? 'Resignation In Review' : 'Submit Resignation'}
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

      {/* Policy Notice Card for Employees */}
      {isEmployee && (
        <div className="card" style={{ marginBottom: '24px', padding: '18px 22px', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <AlertTriangle size={22} color="var(--info)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--info)', fontSize: '0.95rem' }}>
                Separation & Notice Period Policy
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Standard employee notice period at WorkSphere is <strong>30 days</strong> unless mutually agreed upon with your Department Lead. During this window, please complete knowledge transfer (KT), hand over company hardware, and settle pending expense claims.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: '0.825rem' }}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Total Records: <strong>{resignations.length}</strong>
        </span>
      </div>

      {/* Resignations Table / Card List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading exit records...
          </div>
        ) : resignations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '45px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No exit records found</div>
            <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              {filterStatus !== 'ALL'
                ? `No resignations currently marked as ${filterStatus.toLowerCase()}.`
                : 'No resignation requests recorded.'}
            </p>
          </div>
        ) : (
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Notice Period</th>
                <th>Reason for Leaving</th>
                <th>Submitted On</th>
                <th>Status</th>
                {canManage && <th>Decision Actions</th>}
              </tr>
            </thead>
            <tbody>
              {resignations.map((item) => {
                const isPending = item.status === 'PENDING';
                const isApproved = item.status === 'APPROVED';
                return (
                  <tr key={item.id} id={`resignation-row-${item.id}`}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.employee_name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {item.designation}
                      </div>
                    </td>
                    <td>{item.department}</td>
                    <td>
                      <span className="badge badge-gray">{item.notice_period}</span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {item.reason}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isApproved
                            ? 'badge-emerald'
                            : isPending
                            ? 'badge-warning'
                            : 'badge-rose'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              id={`btn-approve-resignation-${item.id}`}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                              onClick={() => handleUpdateStatus(item.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              id={`btn-reject-resignation-${item.id}`}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
                              onClick={() => handleUpdateStatus(item.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Closed ({item.status})
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Resignation Submission Modal */}
      {isSubmitModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                <LogOut size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Submit Resignation
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  WorkSphere Formal Separation Notice
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitResignation}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Notice Period *
                </label>
                <select
                  id="modal-resignation-notice"
                  className="input"
                  style={{ width: '100%' }}
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  required
                >
                  <option value="30 Days">30 Days (Standard Enterprise Notice)</option>
                  <option value="15 Days">15 Days (Accelerated Handover Request)</option>
                  <option value="60 Days">60 Days (Leadership / Extended KT)</option>
                  <option value="Immediate">Immediate / Emergency Release</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Reason for Leaving *
                </label>
                <textarea
                  id="modal-resignation-reason"
                  className="input"
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Please state your reason for separation, proposed last working day, and handover notes..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSubmitModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-resignation-submit"
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
