import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { formatDateIndian } from '../utils/format';

export default function LeavesView({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Apply modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canApprove = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const data = await api.getLeaves({
        status: statusFilter || undefined,
      });
      setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await api.applyLeave(leaveData);
      setIsApplyModalOpen(false);
      setLeaveData({
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leaveId, status) => {
    try {
      await api.updateLeaveStatus(leaveId, status);
      if (status === 'APPROVED') {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      }
      fetchLeaves();
    } catch (err) {
      alert(`Could not update leave request: ${err.message}`);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px 0' }}>Leave Applications & Holidays</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Apply for Casual (CL), Sick (SL), or Privilege Leave (PL) and track approval status.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsApplyModalOpen(true)}>
          <Plus size={16} /> Apply for Leave
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('PENDING')}>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Approval
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--warning)' }}>{pendingCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>Pending with HR / Lead</span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('APPROVED')}>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Approved Leaves
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--success)' }}>{approvedCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>Leaves granted</span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('REJECTED')}>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Rejected Requests
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--danger)' }}>{rejectedCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>Declined requests</span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Leave History</h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Filter size={15} color="var(--text-dim)" />
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '150px', padding: '5px 10px', fontSize: '0.825rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Leave Period</th>
                <th>Reason</th>
                <th>Applied Date</th>
                <th>Status</th>
                {canApprove && <th style={{ textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canApprove ? '7' : '6'} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading leave applications...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? '7' : '6'} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const sDate = new Date(leave.start_date);
                  const eDate = new Date(leave.end_date);
                  const days = Math.round((eDate - sDate) / (1000 * 3600 * 24)) + 1;

                  return (
                    <tr key={leave.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{leave.employee_name || 'My Application'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{leave.department || 'Staff'}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            leave.leave_type === 'SICK'
                              ? 'badge-danger'
                              : leave.leave_type === 'PAID'
                              ? 'badge-success'
                              : 'badge-purple'
                          }`}
                        >
                          {leave.leave_type === 'PAID' ? 'Privilege (PL)' : leave.leave_type === 'CASUAL' ? 'Casual (CL)' : 'Sick (SL)'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {formatDateIndian(leave.start_date)} to {formatDateIndian(leave.end_date)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '1 day'}
                        </div>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {leave.reason}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {formatDateIndian(leave.created_at)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            leave.status === 'APPROVED'
                              ? 'badge-success'
                              : leave.status === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      {canApprove && (
                        <td style={{ textAlign: 'right' }}>
                          {leave.status === 'PENDING' ? (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateStatus(leave.id, 'APPROVED')}
                                title="Approve Leave"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleUpdateStatus(leave.id, 'REJECTED')}
                                title="Reject Leave"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Actioned</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      {isApplyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApplyModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Apply for Leave</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsApplyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              <div className="form-group">
                <label className="form-label">Leave Category</label>
                <select
                  className="form-select"
                  value={leaveData.leave_type}
                  onChange={(e) => setLeaveData({ ...leaveData, leave_type: e.target.value })}
                >
                  <option value="CASUAL">Casual Leave (CL - Personal / Festival)</option>
                  <option value="SICK">Sick Leave (SL - Medical / Recovery)</option>
                  <option value="PAID">Privilege / Earned Leave (PL - Vacation)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">From Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={leaveData.start_date}
                    onChange={(e) => setLeaveData({ ...leaveData, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={leaveData.end_date}
                    onChange={(e) => setLeaveData({ ...leaveData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Absence *</label>
                <textarea
                  required
                  rows="3"
                  className="form-textarea"
                  placeholder="e.g. Traveling to hometown for Diwali celebrations..."
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsApplyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
