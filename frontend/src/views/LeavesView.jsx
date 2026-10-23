import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { formatDateIndian } from '../utils/format';

export default function LeavesView({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // Apply form
  const [leaveData, setLeaveData] = useState({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Policy edit form
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyEditData, setPolicyEditData] = useState({ total_days_allowed: 12, description: '' });

  const canApprove = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    fetchInitialData();
  }, [statusFilter]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [leavesData, balancesData, policiesData] = await Promise.all([
        api.getLeaves({ status: statusFilter || undefined }),
        api.getLeaveBalances().catch(() => []),
        api.getLeavePolicies().catch(() => []),
      ]);
      setLeaves(leavesData);
      setBalances(balancesData);
      setPolicies(policiesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate requested duration
  const startD = new Date(leaveData.start_date);
  const endD = new Date(leaveData.end_date);
  const diffDays = Math.max(0, Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1);

  // Find balance for selected leave type
  const currentBal = balances.find((b) => b.leave_type === leaveData.leave_type);
  const remainingDays = currentBal ? currentBal.remaining_days : 0;
  const isOverBalance = diffDays > remainingDays;

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (endD < startD) {
      setErrorMsg('End date cannot be earlier than start date.');
      return;
    }

    if (isOverBalance) {
      setErrorMsg(
        `Insufficient leave balance. You requested ${diffDays} day(s), but only have ${remainingDays} day(s) remaining for ${leaveData.leave_type} leave.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.applyLeave(leaveData);
      setIsApplyModalOpen(false);
      setLeaveData({
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchInitialData();
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
      fetchInitialData();
    } catch (err) {
      alert(`Could not update leave request: ${err.message}`);
    }
  };

  const handleUpdatePolicySubmit = async (e) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    try {
      await api.updateLeavePolicy({
        leave_type: selectedPolicy.leave_type,
        total_days_allowed: parseFloat(policyEditData.total_days_allowed),
        description: policyEditData.description,
      });
      setSelectedPolicy(null);
      fetchInitialData();
    } catch (err) {
      alert(`Policy update failed: ${err.message}`);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-purple">Module 11</span>
            <span className="badge badge-indigo">Structured Leave Policies & Balances</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0 0' }}>Leave Policies & Balances</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Structured policies (Casual, Sick, Paid), balance tracking, approval deduction, and over-usage prevention.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {canApprove && (
            <button
              id="btn-open-policies-modal"
              className="btn btn-secondary"
              onClick={() => setIsPolicyModalOpen(true)}
            >
              <BookOpen size={16} /> Policy Overview
            </button>
          )}
          <button
            id="btn-open-apply-leave"
            className="btn btn-primary"
            onClick={() => setIsApplyModalOpen(true)}
          >
            <Plus size={16} /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Leave Balances Cards */}
      <div style={{ marginBottom: '22px' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
          Leave Balances & Entitlements
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {balances.map((b) => {
            const pct = Math.round((b.remaining_days / (b.total_days || 1)) * 100);
            const color =
              b.leave_type === 'CASUAL'
                ? '#0891b2'
                : b.leave_type === 'SICK'
                ? '#d97706'
                : '#4f46e5';

            return (
              <div key={b.leave_type} className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                    {b.leave_type} LEAVE
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: `${color}15`,
                      color: color,
                      borderColor: `${color}30`,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {b.remaining_days} / {b.total_days} Days Left
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.785rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <span>Used: {b.used_days} days</span>
                  <span>{pct}% Available</span>
                </div>

                <div className="balance-progress-bar">
                  <div
                    className="balance-progress-fill"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards & Filters */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div
          className={`kpi-card ${statusFilter === 'PENDING' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', border: statusFilter === 'PENDING' ? '2px solid var(--warning)' : undefined }}
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')}
        >
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Approval
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--warning)' }}>{pendingCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>
              {statusFilter === 'PENDING' ? 'Filter applied (click to reset)' : 'Pending with HR / Lead'}
            </span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === 'APPROVED' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', border: statusFilter === 'APPROVED' ? '2px solid var(--success)' : undefined }}
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED')}
        >
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Approved Leaves
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--success)' }}>{approvedCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>
              {statusFilter === 'APPROVED' ? 'Filter applied (click to reset)' : 'Leaves granted & balance deducted'}
            </span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === 'REJECTED' ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', border: statusFilter === 'REJECTED' ? '2px solid var(--danger)' : undefined }}
          onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
        >
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Rejected Requests
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--danger)' }}>{rejectedCount}</h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>
              {statusFilter === 'REJECTED' ? 'Filter applied (click to reset)' : 'Application declined'}
            </span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Leave Type</th>
              <th>Date Range</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Status</th>
              {canApprove && <th style={{ textAlign: 'right' }}>HR Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canApprove ? 8 : 7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading leave records...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 8 : 7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No leave applications match this filter.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.employee_name || 'Staff Member'}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{l.department || 'General'}</td>
                  <td>
                    <span className="badge badge-indigo">{l.leave_type}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDateIndian(l.start_date)} - {formatDateIndian(l.end_date)}
                  </td>
                  <td>
                    <strong>{l.days_count || 1}</strong> day(s)
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.reason}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        l.status === 'APPROVED'
                          ? 'badge-success'
                          : l.status === 'REJECTED'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td style={{ textAlign: 'right' }}>
                      {l.status === 'PENDING' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            id={`btn-approve-leave-${l.id}`}
                            className="btn btn-sm btn-primary"
                            style={{ background: '#059669', borderColor: '#059669', padding: '4px 10px' }}
                            onClick={() => handleUpdateStatus(l.id, 'APPROVED')}
                            title="Approve and deduct leave balance"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            id={`btn-reject-leave-${l.id}`}
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--danger)', padding: '4px 10px' }}
                            onClick={() => handleUpdateStatus(l.id, 'REJECTED')}
                            title="Reject leave application"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Apply for Leave with Live Validation */}
      {isApplyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Apply for Leave</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsApplyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  fontSize: '0.85rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label">Leave Category</label>
                <select
                  id="select-leave-type"
                  className="input"
                  value={leaveData.leave_type}
                  onChange={(e) => setLeaveData({ ...leaveData, leave_type: e.target.value })}
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick / Medical Leave (SL)</option>
                  <option value="PAID">Earned / Privilege Leave (PL)</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Available balance for this category:{' '}
                  <strong style={{ color: remainingDays > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {remainingDays} days
                  </strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Start Date</label>
                  <input
                    id="input-leave-start-date"
                    type="date"
                    required
                    className="input"
                    value={leaveData.start_date}
                    onChange={(e) => setLeaveData({ ...leaveData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    id="input-leave-end-date"
                    type="date"
                    required
                    className="input"
                    value={leaveData.end_date}
                    onChange={(e) => setLeaveData({ ...leaveData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Live Duration & Balance Warning */}
              <div
                style={{
                  background: isOverBalance ? 'var(--danger-bg)' : '#f8fafc',
                  border: `1px solid ${isOverBalance ? 'var(--danger-border)' : '#e2e8f0'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {isOverBalance ? (
                  <AlertCircle size={18} color="var(--danger)" />
                ) : (
                  <Info size={18} color="var(--primary)" />
                )}
                <div>
                  <div>
                    Requested Duration: <strong>{diffDays} day(s)</strong> • Remaining Balance:{' '}
                    <strong>{remainingDays} day(s)</strong>
                  </div>
                  {isOverBalance && (
                    <div style={{ color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                      Over-usage prohibited: Requested days exceed remaining balance by {diffDays - remainingDays} day(s).
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="label">Reason for Absence</label>
                <textarea
                  id="textarea-leave-reason"
                  rows={3}
                  required
                  className="input"
                  placeholder="Please state brief reason for leave application..."
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-apply-leave"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || isOverBalance}
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Leave Policy Overview & Governance */}
      {isPolicyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Corporate Leave Policy Overview</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsPolicyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Annual leave entitlements allocated to employees as per Indian labour standards and company HR policy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="glass-panel"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.leave_type} LEAVE</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.description || 'Standard corporate leave entitlement'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                      {p.total_days_allowed} Days / Year
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsPolicyModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
