import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CalendarCheck2,
  TrendingUp,
  UserCheck,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR, formatDateIndian } from '../utils/format';

export default function DashboardView({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
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

  const att = stats.attendance_summary || {};
  const present = att.present_today || 0;
  const halfDay = att.half_day_today || 0;
  const absent = att.absent_today || 0;
  const totalAtt = present + halfDay + absent || 1;
  const attendancePercentage = Math.round(((present + halfDay * 0.5) / totalAtt) * 100);

  // SVG Donut calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = (present / totalAtt) * circumference;
  const halfDayStroke = (halfDay / totalAtt) * circumference;
  const absentStroke = (absent / totalAtt) * circumference;

  const canManageEmployees = user?.role === 'ADMIN' || user?.role === 'HR';

  return (
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
          </div>
          <h1 style={{ fontSize: '1.7rem', margin: '4px 0 6px 0' }}>
            Namaste, {user?.full_name || user?.username}!
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {user?.role === 'ADMIN'
              ? 'Administrator dashboard — manage staff, department attendance, leaves & monthly payroll runs.'
              : user?.role === 'HR'
              ? 'HR Operations — review employee leave requests, update records and process salary slips.'
              : 'Employee Self-Service — punch attendance, check leave balance, and download monthly salary slips.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('attendance')}>
            <Clock size={16} /> Punch Attendance
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('leaves')}>
            <CalendarCheck2 size={16} /> Apply Leave
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Total Employees */}
        <div
          className="kpi-card"
          onClick={canManageEmployees ? () => onNavigate('employees') : undefined}
          style={{ cursor: canManageEmployees ? 'pointer' : 'default' }}
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
              <span>{present} Punched in • {absent} Out</span>
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
            <h2 style={{ fontSize: '1.9rem', margin: '6px 0 2px 0', color: stats.leave_stats?.pending ? 'var(--warning)' : 'var(--text-main)' }}>
              {stats.leave_stats?.pending || 0}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: stats.leave_stats?.pending ? 'var(--warning)' : 'var(--text-muted)' }}>
              <AlertCircle size={14} />
              <span>{stats.leave_stats?.approved || 0} Approved this month</span>
            </div>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fffbeb', color: '#b45309' }}>
            <CalendarCheck2 size={20} />
          </div>
        </div>

        {/* KPI 4: Monthly Payroll Expenses in INR (₹) */}
        <div className="kpi-card" onClick={() => onNavigate('payroll')} style={{ cursor: 'pointer' }}>
          <div>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Monthly Payroll Run
            </span>
            <h2 style={{ fontSize: '1.9rem', margin: '6px 0 2px 0' }}>
              {formatINR(stats.payroll_overview?.total_monthly_payroll || 0)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: '#475569' }}>
              <span style={{ fontWeight: 600 }}>₹</span>
              <span>{stats.payroll_overview?.records_count || 0} Salary Slips Generated</span>
            </div>
          </div>
          <div className="kpi-icon-box" style={{ background: '#f1f5f9', color: '#0f172a' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>₹</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Attendance Visual Donut */}
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Today's Shift Attendance</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Office & WFH</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg width="130" height="130" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="14" />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="14"
                  strokeDasharray={`${presentStroke} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="var(--warning)"
                  strokeWidth="14"
                  strokeDasharray={`${halfDayStroke} ${circumference}`}
                  strokeDashoffset={`-${presentStroke}`}
                  strokeLinecap="round"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="14"
                  strokeDasharray={`${absentStroke} ${circumference}`}
                  strokeDashoffset={`-${presentStroke + halfDayStroke}`}
                  strokeLinecap="round"
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
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{attendancePercentage}%</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Present</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--success)' }}></span>
                <span style={{ color: 'var(--text-muted)' }}>Present:</span>
                <strong style={{ color: 'var(--text-main)' }}>{present} members</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--warning)' }}></span>
                <span style={{ color: 'var(--text-muted)' }}>Half-Day:</span>
                <strong style={{ color: 'var(--text-main)' }}>{halfDay} members</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--danger)' }}></span>
                <span style={{ color: 'var(--text-muted)' }}>On Leave / Absent:</span>
                <strong style={{ color: 'var(--text-main)' }}>{absent} members</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Department Headcount */}
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Department Strength</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Headcount</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(stats.department_distribution || []).map((dept) => {
              const maxCount = Math.max(...(stats.department_distribution || []).map((d) => d.count), 1);
              const pct = Math.round((dept.count / maxCount) * 100);
              return (
                <div key={dept.department}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{dept.department}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{dept.count} members</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Recent Attendance */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Recent Punch Records</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance')}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_attendances || []).map((att) => (
                  <tr key={att.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{att.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{att.department}</div>
                      </div>
                    </td>
                    <td>{formatDateIndian(att.date)}</td>
                    <td>{att.working_hours > 0 ? `${att.working_hours}h` : '--'}</td>
                    <td>
                      <span className={`badge ${att.status === 'PRESENT' ? 'badge-success' : att.status === 'HALF_DAY' ? 'badge-warning' : 'badge-danger'}`}>
                        {att.status}
                      </span>
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
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Recent Leave Requests</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leaves')}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_leaves || []).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{l.department}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{l.leave_type}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {formatDateIndian(l.start_date)} - {formatDateIndian(l.end_date)}
                    </td>
                    <td>
                      <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
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
  );
}
