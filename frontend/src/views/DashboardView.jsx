import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CalendarCheck2,
  TrendingUp,
  UserCheck,
  AlertCircle,
  LogIn,
  LogOut,
  CreditCard,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR, formatDateIndian } from '../utils/format';
import PayslipModal from '../components/PayslipModal';

export default function DashboardView({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchMessage, setPunchMessage] = useState({ text: '', type: '' });
  const [activePayslip, setActivePayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  useEffect(() => {
    loadStats();
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    try {
      setPunchLoading(true);
      setPunchMessage({ text: '', type: '' });
      const res = await api.checkIn();
      setPunchMessage({
        text: `Checked in successfully at ${new Date(res.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}${
          res.is_late ? ` (Late entry: ${res.late_minutes}m)` : ' (On-Time)'
        }`,
        type: res.is_late ? 'warning' : 'success',
      });
      loadStats();
    } catch (err) {
      setPunchMessage({ text: err.message, type: 'danger' });
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setPunchLoading(true);
      setPunchMessage({ text: '', type: '' });
      const res = await api.checkOut();
      setPunchMessage({
        text: `Checked out successfully. Logged ${res.working_hours} hrs${
          res.overtime_hours > 0 ? ` (+${res.overtime_hours} hrs Overtime)` : ''
        }.`,
        type: 'success',
      });
      loadStats();
    } catch (err) {
      setPunchMessage({ text: err.message, type: 'danger' });
    } finally {
      setPunchLoading(false);
    }
  };

  const handleOpenLatestPayslip = async () => {
    try {
      const payrolls = await api.getPayrollList();
      if (payrolls && payrolls.length > 0) {
        setActivePayslip(payrolls[0]);
        setIsPayslipOpen(true);
      } else {
        alert('No payslip records available yet.');
      }
    } catch (err) {
      alert(`Could not load payslip: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>
        <AlertCircle size={32} style={{ marginBottom: '8px' }} />
        <p>Could not load dashboard stats: {error}</p>
        <button className="btn btn-secondary btn-sm" onClick={loadStats}>
          Try Again
        </button>
      </div>
    );
  }

  const isEmployee = user?.role === 'EMPLOYEE';
  const personal = stats.personal_stats || {};
  const todayPunch = personal.today_punch || {};
  const leaveBalances = personal.leave_balances || [];

  const att = stats.attendance_summary || {};
  const present = att.present_today || 0;
  const halfDay = att.half_day_today || 0;
  const absent = att.absent_today || 0;
  const lateToday = att.late_today || 0;
  const totalAtt = present + halfDay + absent || 1;
  const attendancePercentage = Math.round(((present + halfDay * 0.5) / totalAtt) * 100);

  // SVG Donut calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = (present / totalAtt) * circumference;
  const halfDayStroke = (halfDay / totalAtt) * circumference;
  const absentStroke = (absent / totalAtt) * circumference;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ========================================================
          1. EMPLOYEE SELF-SERVICE PORTAL (MODULE 9)
         ======================================================== */}
      {isEmployee ? (
        <div>
          {/* Welcome & Profile Header */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              marginBottom: '20px',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                }}
              >
                {(user.full_name || user.username).substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-purple">Employee Self-Service (ESS)</span>
                  <span className="badge badge-indigo">Emp ID: #{user.employee_id || user.id}</span>
                </div>
                <h1 style={{ fontSize: '1.65rem', margin: '2px 0 4px 0' }}>
                  Welcome back, {user.full_name || user.username}!
                </h1>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {personal.my_designation || 'Engineer'} • {personal.my_department || 'Engineering'} • Joined:{' '}
                  {personal.my_joining_date || '2023'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {currentTime.toLocaleTimeString('en-IN')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Punch Banner Notice */}
          {punchMessage.text && (
            <div
              className="glass-panel"
              style={{
                padding: '12px 18px',
                marginBottom: '20px',
                background:
                  punchMessage.type === 'success'
                    ? 'var(--success-bg)'
                    : punchMessage.type === 'warning'
                    ? 'var(--warning-bg)'
                    : 'var(--danger-bg)',
                borderColor:
                  punchMessage.type === 'success'
                    ? 'var(--success-border)'
                    : punchMessage.type === 'warning'
                    ? 'var(--warning-border)'
                    : 'var(--danger-border)',
                color:
                  punchMessage.type === 'success'
                    ? 'var(--success)'
                    : punchMessage.type === 'warning'
                    ? 'var(--warning)'
                    : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {punchMessage.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <span>{punchMessage.text}</span>
            </div>
          )}

          {/* Top Quick Actions & Shift Widget Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Shift & Daily Attendance Punch Card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Today's Shift & Punches</span>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  Standard: 09:30 AM – 06:30 PM
                </span>
              </div>

              {/* Status details */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Punch Status:</span>
                  {todayPunch.checked_out ? (
                    <span className="badge badge-indigo">Shift Completed</span>
                  ) : todayPunch.checked_in ? (
                    todayPunch.is_late ? (
                      <span className="badge badge-amber">
                        Late Punch (+{todayPunch.late_minutes}m)
                      </span>
                    ) : (
                      <span className="badge badge-emerald">On-Time Punch</span>
                    )
                  ) : (
                    <span className="badge badge-warning">Not Punched In</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Check-in: </span>
                    <strong>
                      {todayPunch.check_in_time
                        ? new Date(todayPunch.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Check-out: </span>
                    <strong>
                      {todayPunch.check_out_time
                        ? new Date(todayPunch.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {!todayPunch.checked_in ? (
                  <button
                    id="btn-ess-punch-in"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handlePunchIn}
                    disabled={punchLoading}
                  >
                    <LogIn size={16} />
                    <span>{punchLoading ? 'Punching...' : 'Punch In Now'}</span>
                  </button>
                ) : !todayPunch.checked_out ? (
                  <button
                    id="btn-ess-punch-out"
                    className="btn btn-primary"
                    style={{ flex: 1, background: '#059669', borderColor: '#059669' }}
                    onClick={handlePunchOut}
                    disabled={punchLoading}
                  >
                    <LogOut size={16} />
                    <span>{punchLoading ? 'Punching...' : 'Punch Out (End Shift)'}</span>
                  </button>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px',
                      background: '#f1f5f9',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.825rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Punches completed for today ({todayPunch.working_hours} hrs logged)
                  </div>
                )}

                <button className="btn btn-secondary" onClick={() => onNavigate('attendance')}>
                  History
                </button>
              </div>
            </div>

            {/* Compensation & Payslip Card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--success)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Salary & Compensation</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Disbursed</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest Net Salary</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {formatINR(personal.my_latest_salary || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Includes Basic, HRA, Special Allowance less PF & Professional Tax
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  id="btn-ess-view-payslip"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleOpenLatestPayslip}
                >
                  <FileText size={16} />
                  <span>View Payslip</span>
                </button>
                <button className="btn btn-primary" onClick={() => onNavigate('payroll')}>
                  All Cycles
                </button>
              </div>
            </div>

            {/* Quick Summary Stats Card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={18} color="var(--info)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Monthly Overview</span>
                </div>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Current Month</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Present Days</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '2px' }}>{personal.my_present_days || 0}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Late Entries</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: personal.my_late_days > 0 ? 'var(--warning)' : 'var(--text-main)', marginTop: '2px' }}>
                    {personal.my_late_days || 0}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Overtime Logged</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                    {personal.my_overtime_hours || 0} hrs
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Leaves Taken</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '2px' }}>{personal.my_total_leaves || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balances Cards (Module 11 in ESS) */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck2 size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>My Leave Balances & Entitlements</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('leaves')}>
                <CalendarCheck2 size={15} /> Apply for Leave
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {leaveBalances.map((b) => {
                const percent = Math.round((b.remaining_days / (b.total_days || 1)) * 100);
                const color =
                  b.leave_type === 'CASUAL'
                    ? '#0891b2'
                    : b.leave_type === 'SICK'
                    ? '#d97706'
                    : '#4f46e5';

                return (
                  <div key={b.leave_type} className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.leave_type} LEAVE</span>
                      <span className="badge" style={{ background: `${color}15`, color: color, borderColor: `${color}30` }}>
                        {b.remaining_days} / {b.total_days} Days
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Used: {b.used_days} days</span>
                      <span>{percent}% Remaining</span>
                    </div>

                    <div className="balance-progress-bar">
                      <div
                        className="balance-progress-fill"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ESS Recent Activity Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* My Recent Attendances */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>My Recent Attendance Punches</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance')}>
                  View All
                </button>
              </div>

              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>In / Out</th>
                      <th>Hours</th>
                      <th>Status Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recent_attendances || []).slice(0, 5).map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{formatDateIndian(a.date)}</td>
                        <td>
                          {a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                          {' → '}
                          {a.check_out ? new Date(a.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </td>
                        <td>{a.working_hours}h</td>
                        <td>
                          {a.is_late && (
                            <span className="badge badge-amber" style={{ marginRight: '4px' }}>
                              Late (+{a.late_minutes}m)
                            </span>
                          )}
                          {a.overtime_hours > 0 && (
                            <span className="badge badge-indigo" style={{ marginRight: '4px' }}>
                              OT +{a.overtime_hours}h
                            </span>
                          )}
                          {!a.is_late && a.overtime_hours === 0 && (
                            <span className="badge badge-success">On-Time</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* My Recent Leave Requests */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>My Leave Requests & Status</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leaves')}>
                  View All
                </button>
              </div>

              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recent_leaves || []).slice(0, 5).map((l) => (
                      <tr key={l.id}>
                        <td>
                          <span className="badge badge-indigo">{l.leave_type}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDateIndian(l.start_date)} - {formatDateIndian(l.end_date)}
                        </td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           2. EXECUTIVE / HR / ADMIN DASHBOARD
           ======================================================== */
        <div>
          {/* Welcome Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '22px 24px',
              marginBottom: '20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-purple" style={{ textTransform: 'none', fontWeight: 600 }}>
                  WorkSphere Technologies Pvt. Ltd. (Bengaluru Hub)
                </span>
                <span className="badge badge-indigo">
                  {user.role === 'ADMIN' ? 'Executive Admin Mode' : 'HR Operations Mode'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.7rem', margin: '4px 0 6px 0' }}>
                Namaste, {user?.full_name || user?.username}!
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {user?.role === 'ADMIN'
                  ? 'Administrator console — full access across staff, attendance compliance, leave policies, payroll & security governance.'
                  : 'HR Operations dashboard — manage staff, approve leaves, audit attendance shifts, and run monthly payroll.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('attendance')}>
                <Clock size={16} /> Audit Punches
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('leaves')}>
                <CalendarCheck2 size={16} /> Review Leaves
              </button>
              {user.role === 'ADMIN' && (
                <button
                  id="btn-nav-admin-controls"
                  className="btn btn-primary"
                  style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                  onClick={() => onNavigate('admin')}
                >
                  <ShieldCheck size={16} /> Admin Controls
                </button>
              )}
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="kpi-grid">
            {/* KPI 1: Total Employees */}
            <div
              className="kpi-card"
              onClick={() => onNavigate('employees')}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Employees
                </span>
                <h2 style={{ fontSize: '1.9rem', margin: '6px 0 2px 0' }}>{stats.total_employees}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--success)' }}>
                  <TrendingUp size={14} />
                  <span>{stats.active_employees} Active on rolls</span>
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: '#eef2ff', color: '#4338ca' }}>
                <Users size={20} />
              </div>
            </div>

            {/* KPI 2: Today's Attendance Rate */}
            <div className="kpi-card" onClick={() => onNavigate('attendance')} style={{ cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Today's Attendance
                </span>
                <h2 style={{ fontSize: '1.9rem', margin: '6px 0 2px 0' }}>{attendancePercentage}%</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--info)' }}>
                  <UserCheck size={14} />
                  <span>{present} Present • {lateToday} Late entries</span>
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: '#f0fdf4', color: '#15803d' }}>
                <Clock size={20} />
              </div>
            </div>

            {/* KPI 3: Pending Leaves */}
            <div className="kpi-card" onClick={() => onNavigate('leaves')} style={{ cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Pending Leaves
                </span>
                <h2 style={{ fontSize: '1.9rem', margin: '6px 0 2px 0' }}>{stats.leave_stats?.pending || 0}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--warning)' }}>
                  <AlertCircle size={14} />
                  <span>{stats.leave_stats?.approved || 0} approved this cycle</span>
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: '#fffbeb', color: '#b45309' }}>
                <CalendarCheck2 size={20} />
              </div>
            </div>

            {/* KPI 4: Monthly Payroll Payout */}
            <div className="kpi-card" onClick={() => onNavigate('payroll')} style={{ cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Monthly Net Payroll
                </span>
                <h2 style={{ fontSize: '1.6rem', margin: '6px 0 2px 0', letterSpacing: '-0.02em' }}>
                  {formatINR(stats.payroll_overview?.total_monthly_payroll || 0)}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                  <CreditCard size={14} />
                  <span>{stats.payroll_overview?.records_count || 0} staff processed</span>
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: '#ecfeff', color: '#0891b2' }}>
                <CreditCard size={20} />
              </div>
            </div>
          </div>

          {/* Middle Analytics Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {/* Donut Chart: Today's Shift Punches */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Shift Punches Breakdown</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Real-time status for today ({totalAtt} expected)
                  </p>
                </div>
                <span className="badge badge-indigo">Shift: 09:30 AM</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="65" cy="65" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="14"
                      strokeDasharray={`${presentStroke} ${circumference}`}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="14"
                      strokeDasharray={`${halfDayStroke} ${circumference}`}
                      strokeDashoffset={-presentStroke}
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="14"
                      strokeDasharray={`${absentStroke} ${circumference}`}
                      strokeDashoffset={-(presentStroke + halfDayStroke)}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{present}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Present</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div>
                    <span>On-time / Present:</span>
                    <strong>{present}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></div>
                    <span>Late Punches:</span>
                    <strong style={{ color: 'var(--warning)' }}>{lateToday}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></div>
                    <span>Absent / No Punch:</span>
                    <strong>{absent}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Distribution */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Department Headcount</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Staff distribution across business units
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(stats.department_distribution || []).map((dept) => {
                  const pct = Math.round((dept.count / (stats.total_employees || 1)) * 100);
                  return (
                    <div key={dept.department}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{dept.department}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {dept.count} ({pct}%)
                        </span>
                      </div>
                      <div className="balance-progress-bar" style={{ height: '7px', marginTop: 0 }}>
                        <div
                          className="balance-progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, var(--primary) 0%, #06b6d4 100%)',
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Operational Audits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Recent Attendance */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Recent Attendance Punches</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance')}>
                  View All
                </button>
              </div>

              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Dept</th>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Status Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recent_attendances || []).slice(0, 6).map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.employee_name || 'Staff'}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{a.department}</td>
                        <td>{formatDateIndian(a.date)}</td>
                        <td>
                          {a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </td>
                        <td>
                          {a.is_late && (
                            <span className="badge badge-amber">Late (+{a.late_minutes}m)</span>
                          )}
                          {a.overtime_hours > 0 && (
                            <span className="badge badge-indigo">OT +{a.overtime_hours}h</span>
                          )}
                          {!a.is_late && a.overtime_hours === 0 && (
                            <span className="badge badge-success">On-Time</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Leaves */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Recent Leave Applications</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leaves')}>
                  View All
                </button>
              </div>

              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recent_leaves || []).slice(0, 6).map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.employee_name || 'Staff'}</td>
                        <td>
                          <span className="badge badge-indigo">{l.leave_type}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDateIndian(l.start_date)} - {formatDateIndian(l.end_date)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal if triggered */}
      {isPayslipOpen && activePayslip && (
        <PayslipModal
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          payrollItem={activePayslip}
        />
      )}
    </div>
  );
}
