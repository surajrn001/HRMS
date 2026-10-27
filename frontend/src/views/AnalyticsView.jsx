import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AnalyticsView({ user }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedDept, setSelectedDept] = useState('All');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAnalyticsOverview(days);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const handleExport = async (type) => {
    try {
      setExporting(true);
      await api.exportReport(type);
    } catch (err) {
      setError(err.message || 'Report export failed');
    } finally {
      setExporting(false);
    }
  };

  const filteredDepts = data?.department_reports
    ? selectedDept === 'All'
      ? data.department_reports
      : data.department_reports.filter((d) => d.department === selectedDept)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Advanced Analytics & Workforce Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Operational metrics, attendance trends, department allocations, and compliance reporting.
          </p>
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleExport('departments')}
            disabled={exporting}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-main)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📊</span> Department CSV
          </button>
          <button
            onClick={() => handleExport('attendance')}
            disabled={exporting}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-main)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⏱️</span> Attendance CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Primary KPI Metrics */}
      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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
              Active Workforce
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
              {data.total_employees}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '500' }}>
              100% verified active status
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
              Monthly Attendance Health
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
              {data.attendance_rate_month}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Average on-time ratio
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
              Performance Index
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
              {data.avg_performance_rating}★
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across all department reviews
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
              Monthly Payroll Run
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
              ₹{(data.total_monthly_payroll / 100000).toFixed(2)}L
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ₹{data.total_monthly_payroll.toLocaleString()} / mo
            </div>
          </div>
        </div>
      )}

      {/* Attendance Trends Chart */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              Daily Attendance Trends & Punctuality
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Historical punctuality, check-in compliance, and attendance volume.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  background: days === d ? 'var(--primary)' : 'var(--surface-muted)',
                  color: days === d ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid ' + (days === d ? 'var(--primary)' : 'var(--border)'),
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Past {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Visual Trend Bars */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating trend patterns...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${data?.attendance_trends?.length || 1}, 1fr)`,
                gap: '8px',
                alignItems: 'flex-end',
                height: '180px',
                paddingTop: '20px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {data?.attendance_trends?.map((pt, idx) => {
                const heightPct = Math.max(12, Math.min(100, pt.attendance_rate));
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: '6px',
                    }}
                    title={`${pt.date}: ${pt.present} present, ${pt.late} late (${pt.attendance_rate}%)`}
                  >
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {pt.attendance_rate}%
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${heightPct}%`,
                        background: pt.late > 0 ? 'linear-gradient(to top, #3b82f6, #f59e0b)' : 'var(--primary)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${data?.attendance_trends?.length || 1}, 1fr)`,
                gap: '8px',
                textAlign: 'center',
              }}
            >
              {data?.attendance_trends?.map((pt, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {pt.date.slice(5)}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
                On-time Presence
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }} />
                Includes Late Check-in
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Department Breakdown & Reports Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              Department-Wise Operating Metrics
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Breakdown of headcount, today's availability, payroll outlay, and quality ratings.
            </p>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: '#ffffff',
              fontSize: '13px',
              color: 'var(--text-main)',
            }}
          >
            <option value="All">All Departments</option>
            {data?.department_reports?.map((d) => (
              <option key={d.department} value={d.department}>
                {d.department}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Department</th>
                <th style={{ padding: '12px 14px' }}>Headcount</th>
                <th style={{ padding: '12px 14px' }}>Present Today</th>
                <th style={{ padding: '12px 14px' }}>On Leave</th>
                <th style={{ padding: '12px 14px' }}>Avg Rating</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Monthly Payroll</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {d.department}
                  </td>
                  <td style={{ padding: '14px', color: 'var(--text-main)' }}>
                    {d.total_employees} staff
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>{d.present_today}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> / {d.total_employees}</span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    {d.on_leave_today > 0 ? (
                      <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                        {d.on_leave_today} on leave
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{d.avg_rating}★</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>
                    ₹{d.monthly_payroll.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
