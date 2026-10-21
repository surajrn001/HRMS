import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { formatDateIndian } from '../utils/format';

export default function AttendanceView({ user }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Manual modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [manualData, setManualData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'PRESENT',
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAttendanceData();
    if (canManage) {
      loadEmployeeList();
    }
  }, [startDate, endDate]);

  const loadEmployeeList = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data);
      if (data.length > 0 && !manualData.employee_id) {
        setManualData((prev) => ({ ...prev, employee_id: data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const [today, hist] = await Promise.all([
        api.getTodayAttendance().catch(() => null),
        api.getAttendanceHistory({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      ]);
      setTodayRecord(today);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    try {
      setActionLoading(true);
      const res = await api.checkIn();
      setTodayRecord(res);
      fetchAttendanceData();
    } catch (err) {
      alert(`Punch In failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setActionLoading(true);
      const res = await api.checkOut();
      setTodayRecord(res);
      fetchAttendanceData();
    } catch (err) {
      alert(`Punch Out failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: parseInt(manualData.employee_id),
        date: manualData.date,
        check_in: manualData.check_in ? `${manualData.date}T${manualData.check_in}:00` : null,
        check_out: manualData.check_out ? `${manualData.date}T${manualData.check_out}:00` : null,
        status: manualData.status,
      };
      await api.logManualAttendance(payload);
      setIsManualModalOpen(false);
      fetchAttendanceData();
    } catch (err) {
      alert(`Manual entry error: ${err.message}`);
    }
  };

  const hasPunchedIn = !!todayRecord?.check_in;
  const hasPunchedOut = !!todayRecord?.check_out;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px 0' }}>Daily Attendance & Punches</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Mark daily Punch In / Punch Out, calculate shift hours, and view historical logs.</p>
        </div>
        {canManage && (
          <button className="btn btn-secondary" onClick={() => setIsManualModalOpen(true)}>
            <Plus size={16} /> Regularize / Manual Punch
          </button>
        )}
      </div>

      {/* Clock & Punch Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
            }}
          >
            <Clock size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 700 }}>
              Indian Standard Time (IST)
            </span>
            <h2 style={{ fontSize: '2.4rem', margin: '2px 0', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Action Controls for Punch In / Out */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
              onClick={handlePunchIn}
              disabled={hasPunchedIn || actionLoading}
            >
              <LogIn size={16} /> {hasPunchedIn ? 'Punched In' : 'Punch In'}
            </button>

            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
              onClick={handlePunchOut}
              disabled={!hasPunchedIn || hasPunchedOut || actionLoading}
            >
              <LogOut size={16} /> {hasPunchedOut ? 'Punched Out' : 'Punch Out'}
            </button>
          </div>

          {/* Today's Punch Summary */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Shift Status:</span>
            {hasPunchedIn ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                In: {new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}{' '}
                {hasPunchedOut && `• Out: ${new Date(todayRecord.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                {todayRecord.working_hours > 0 && ` (${todayRecord.working_hours} hrs)`}
              </span>
            ) : (
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Not punched today</span>
            )}
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Attendance Log History</h3>

          {/* Date Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '5px 8px', fontSize: '0.785rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '5px 8px', fontSize: '0.785rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Shift Date</th>
                <th>Punch In Time</th>
                <th>Punch Out Time</th>
                <th>Total Hours</th>
                <th>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading attendance entries...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No attendance records found for this period.
                  </td>
                </tr>
              ) : (
                history.map((record) => {
                  const checkInFormatted = record.check_in
                    ? new Date(record.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '--';
                  const checkOutFormatted = record.check_out
                    ? new Date(record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '--';

                  return (
                    <tr key={record.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{record.employee_name || 'My Record'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{record.department || 'Staff'}</div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatDateIndian(record.date)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>{checkInFormatted}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>{checkOutFormatted}</td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {record.working_hours > 0 ? `${record.working_hours} hrs` : '--'}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            record.status === 'PRESENT'
                              ? 'badge-success'
                              : record.status === 'HALF_DAY'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <div className="modal-overlay" onClick={() => setIsManualModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Regularize Shift / Manual Punch</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsManualModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select
                  className="form-select"
                  value={manualData.employee_id}
                  onChange={(e) => setManualData({ ...manualData, employee_id: e.target.value })}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Shift Date</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={manualData.date}
                  onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Punch In Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={manualData.check_in}
                    onChange={(e) => setManualData({ ...manualData, check_in: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Punch Out Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={manualData.check_out}
                    onChange={(e) => setManualData({ ...manualData, check_out: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Attendance Status</label>
                <select
                  className="form-select"
                  value={manualData.status}
                  onChange={(e) => setManualData({ ...manualData, status: e.target.value })}
                >
                  <option value="PRESENT">Present (Full Day)</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
