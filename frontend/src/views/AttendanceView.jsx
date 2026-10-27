import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  X,
  UserX,
  Check
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
  const [onlyLate, setOnlyLate] = useState(false);

  // Auto-mark Absent & Alerts
  const [alertMessage, setAlertMessage] = useState({ text: '', type: '' });
  const [autoMarkDate, setAutoMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAutoMarkModalOpen, setIsAutoMarkModalOpen] = useState(false);
  const [autoMarkLoading, setAutoMarkLoading] = useState(false);

  // Manual modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [manualData, setManualData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:30',
    check_out: '18:30',
    status: 'PRESENT',
    is_late: false,
    late_minutes: 0,
  });

  // Module 14: Shift Management State
  const [myShift, setMyShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ employee_id: '', shift_id: '' });
  const [assigningShift, setAssigningShift] = useState(false);

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
  }, [startDate, endDate, onlyLate]);

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
      const [today, hist, shiftInfo] = await Promise.all([
        api.getTodayAttendance().catch(() => null),
        api.getAttendanceHistory({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          only_late: onlyLate || undefined,
        }),
        api.getMyShift().catch(() => null),
      ]);
      setTodayRecord(today);
      setHistory(hist);
      setMyShift(shiftInfo);

      if (canManage) {
        const [allShifts, allAssigns] = await Promise.all([
          api.getShifts().catch(() => []),
          api.getShiftAssignments().catch(() => []),
        ]);
        setShifts(allShifts || []);
        setShiftAssignments(allAssigns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShiftSubmit = async (e) => {
    e.preventDefault();
    if (!assignData.employee_id || !assignData.shift_id) {
      showAlert('Please select both employee and target shift', 'warning');
      return;
    }
    try {
      setAssigningShift(true);
      await api.assignShift({
        employee_id: parseInt(assignData.employee_id),
        shift_id: parseInt(assignData.shift_id),
      });
      showAlert('Shift schedule assigned successfully and employee notified', 'success');
      const allAssigns = await api.getShiftAssignments();
      setShiftAssignments(allAssigns || []);
    } catch (err) {
      showAlert(err.message || 'Failed to assign shift', 'danger');
    } finally {
      setAssigningShift(false);
    }
  };

  const showAlert = (text, type = 'info') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage({ text: '', type: '' }), 5000);
  };

  const handlePunchIn = async () => {
    try {
      setActionLoading(true);
      const res = await api.checkIn();
      setTodayRecord(res);
      showAlert(
        `Punch in successful at ${new Date(res.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}${
          res.is_late ? ` (Late entry recorded: ${res.late_minutes} mins past 09:30 AM)` : ' (On-Time Entry)'
        }`,
        res.is_late ? 'warning' : 'success'
      );
      fetchAttendanceData();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setActionLoading(true);
      const res = await api.checkOut();
      setTodayRecord(res);
      showAlert(
        `Punch out successful. Logged ${res.working_hours} hours${
          res.overtime_hours > 0 ? ` with ${res.overtime_hours} hrs of overtime!` : '.'
        }`,
        'success'
      );
      fetchAttendanceData();
    } catch (err) {
      showAlert(err.message, 'danger');
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
        is_late: manualData.is_late,
        late_minutes: manualData.late_minutes ? parseInt(manualData.late_minutes) : 0,
      };
      await api.logManualAttendance(payload);
      setIsManualModalOpen(false);
      showAlert('Attendance record regularized successfully.', 'success');
      fetchAttendanceData();
    } catch (err) {
      showAlert(`Manual entry error: ${err.message}`, 'danger');
    }
  };

  const handleAutoMarkAbsentSubmit = async (e) => {
    e.preventDefault();
    try {
      setAutoMarkLoading(true);
      const res = await api.autoMarkAbsent(autoMarkDate);
      setIsAutoMarkModalOpen(false);
      showAlert(res.message, 'info');
      fetchAttendanceData();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setAutoMarkLoading(false);
    }
  };

  const hasPunchedIn = !!todayRecord?.check_in;
  const hasPunchedOut = !!todayRecord?.check_out;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* View Header */}
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
            <span className="badge badge-purple">Module 10</span>
            <span className="badge badge-emerald">Advanced Attendance Controls</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0 0' }}>Daily Attendance & Punches</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Multi-punch prevention, late entry tracking (09:30 AM shift start), overtime computation, and auto-absence engine.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="btn-open-shift-management"
              className="btn btn-secondary"
              onClick={() => setIsShiftModalOpen(true)}
            >
              <Calendar size={16} /> Shift Rosters
            </button>
            <button
              id="btn-open-auto-mark-absent"
              className="btn btn-secondary"
              onClick={() => setIsAutoMarkModalOpen(true)}
            >
              <UserX size={16} /> Auto-mark Absent
            </button>
            <button
              id="btn-open-manual-attendance"
              className="btn btn-primary"
              onClick={() => setIsManualModalOpen(true)}
            >
              <Plus size={16} /> Regularize Punch
            </button>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {alertMessage.text && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background:
              alertMessage.type === 'success'
                ? 'var(--success-bg)'
                : alertMessage.type === 'warning'
                ? 'var(--warning-bg)'
                : alertMessage.type === 'danger'
                ? 'var(--danger-bg)'
                : 'var(--info-bg)',
            borderColor:
              alertMessage.type === 'success'
                ? 'var(--success-border)'
                : alertMessage.type === 'warning'
                ? 'var(--warning-border)'
                : alertMessage.type === 'danger'
                ? 'var(--danger-border)'
                : 'var(--info-border)',
            color:
              alertMessage.type === 'success'
                ? 'var(--success)'
                : alertMessage.type === 'warning'
                ? 'var(--warning)'
                : alertMessage.type === 'danger'
                ? 'var(--danger)'
                : 'var(--info)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : alertMessage.type === 'danger' ? (
            <AlertTriangle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Clock & Interactive Punch Widget */}
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
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Clock size={28} />
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assigned Shift: <strong style={{ color: 'var(--primary)' }}>{myShift?.shift_name || 'General Shift'}</strong> ({myShift?.start_time || '09:30'} – {myShift?.end_time || '18:30'} IST)
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '2px 0' }}>
              {currentTime.toLocaleTimeString('en-IN')}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Status & Punch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', minWidth: '160px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Current Shift Status:</div>
            {hasPunchedOut ? (
              <span className="badge badge-indigo" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                Shift Completed ({todayRecord.working_hours}h)
              </span>
            ) : hasPunchedIn ? (
              todayRecord.is_late ? (
                <span className="badge badge-amber" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Late Check-in (+{todayRecord.late_minutes}m)
                </span>
              ) : (
                <span className="badge badge-emerald" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  On-Time Checked In
                </span>
              )
            ) : (
              <span className="badge badge-warning" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                Not Checked In
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!hasPunchedIn ? (
              <button
                id="btn-attendance-punch-in"
                className="btn btn-primary"
                style={{ padding: '10px 18px' }}
                onClick={handlePunchIn}
                disabled={actionLoading}
              >
                <LogIn size={17} />
                <span>{actionLoading ? 'Recording...' : 'Punch In'}</span>
              </button>
            ) : !hasPunchedOut ? (
              <button
                id="btn-attendance-punch-out"
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669', padding: '10px 18px' }}
                onClick={handlePunchOut}
                disabled={actionLoading}
              >
                <LogOut size={17} />
                <span>{actionLoading ? 'Recording...' : 'Punch Out'}</span>
              </button>
            ) : (
              <button className="btn btn-secondary" disabled title="Shift already completed for today">
                <Check size={16} /> Shift Recorded
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Analytics Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--text-dim)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
            <input
              id="input-att-start-date"
              type="date"
              className="input"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
            <input
              id="input-att-end-date"
              type="date"
              className="input"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(startDate || endDate) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-filter-only-late"
            className={`btn btn-sm ${onlyLate ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOnlyLate(!onlyLate)}
          >
            <Clock size={14} />
            <span>{onlyLate ? 'Showing Late Only' : 'Filter Late Entries'}</span>
          </button>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Working Hours</th>
              <th>Shift Compliance</th>
              <th>Overtime</th>
              <th>Attendance Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No attendance records found for this criteria.
                </td>
              </tr>
            ) : (
              history.map((r) => {
                const inTime = r.check_in ? new Date(r.check_in) : null;
                const outTime = r.check_out ? new Date(r.check_out) : null;

                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{formatDateIndian(r.date)}</td>
                    <td style={{ fontWeight: 500 }}>{r.employee_name || 'Staff Member'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{r.department || 'General'}</td>
                    <td>
                      {inTime ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <LogIn size={13} style={{ color: 'var(--primary)' }} />
                          <span>{inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>--:--</span>
                      )}
                    </td>
                    <td>
                      {outTime ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <LogOut size={13} style={{ color: 'var(--success)' }} />
                          <span>{outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>--:--</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.working_hours}</span> hrs
                    </td>
                    <td>
                      {r.is_late ? (
                        <span className="badge badge-amber" title={`Punched in ${r.late_minutes} minutes after 09:30 AM`}>
                          Late Entry (+{r.late_minutes}m)
                        </span>
                      ) : r.check_in ? (
                        <span className="badge badge-emerald">On-Time (≤ 9:30)</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No Punch</span>
                      )}
                    </td>
                    <td>
                      {r.overtime_hours > 0 ? (
                        <span className="badge badge-indigo">+{r.overtime_hours} hrs OT</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>0.0 hrs</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'PRESENT'
                            ? 'badge-success'
                            : r.status === 'HALF_DAY'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Auto-mark Absent */}
      {isAutoMarkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={18} style={{ color: 'var(--danger)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Auto-mark Absent Engine</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsAutoMarkModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Scans all active employees for the selected workday. Employees with no check-in punch will be automatically marked as <strong>ABSENT</strong>.
            </p>

            <form onSubmit={handleAutoMarkAbsentSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label className="label">Evaluation Date</label>
                <input
                  id="input-auto-mark-date"
                  type="date"
                  required
                  className="input"
                  value={autoMarkDate}
                  onChange={(e) => setAutoMarkDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAutoMarkModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-auto-mark-absent"
                  type="submit"
                  className="btn btn-primary"
                  disabled={autoMarkLoading}
                >
                  {autoMarkLoading ? 'Evaluating...' : 'Run Auto-Mark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Regularize / Manual Attendance */}
      {isManualModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Regularize / Manual Punch Record</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsManualModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="label">Employee</label>
                <select
                  id="select-manual-employee"
                  className="input"
                  value={manualData.employee_id}
                  onChange={(e) => setManualData({ ...manualData, employee_id: e.target.value })}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.designation} - {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Date</label>
                  <input
                    id="input-manual-date"
                    type="date"
                    required
                    className="input"
                    value={manualData.date}
                    onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Attendance Status</label>
                  <select
                    id="select-manual-status"
                    className="input"
                    value={manualData.status}
                    onChange={(e) => setManualData({ ...manualData, status: e.target.value })}
                  >
                    <option value="PRESENT">PRESENT (Full Day)</option>
                    <option value="HALF_DAY">HALF_DAY</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Punch In Time</label>
                  <input
                    id="input-manual-checkin"
                    type="time"
                    className="input"
                    value={manualData.check_in}
                    onChange={(e) => setManualData({ ...manualData, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Punch Out Time</label>
                  <input
                    id="input-manual-checkout"
                    type="time"
                    className="input"
                    value={manualData.check_out}
                    onChange={(e) => setManualData({ ...manualData, check_out: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-manual-attendance"
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module 14: Shift Rosters & Assignments Modal */}
      {isShiftModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '720px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-purple">Module 14</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.3rem' }}>Shift Management & Schedules</h2>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px' }}
                onClick={() => setIsShiftModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Shift Assignment Form */}
            <form onSubmit={handleAssignShiftSubmit} style={{ background: 'var(--surface-muted)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-main)' }}>
                Assign Employee to Shift
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <label className="label">Employee</label>
                  <select
                    className="input"
                    value={assignData.employee_id}
                    onChange={(e) => setAssignData({ ...assignData, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Shift Schedule</label>
                  <select
                    className="input"
                    value={assignData.shift_id}
                    onChange={(e) => setAssignData({ ...assignData, shift_id: e.target.value })}
                    required
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigningShift}
                  style={{ height: '38px', whiteSpace: 'nowrap' }}
                >
                  {assigningShift ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>

            {/* Active Shifts Summary */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Configured Shifts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {shifts.map((s) => (
                  <div key={s.id} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>{s.start_time} - {s.end_time}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments Roster */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Current Team Shift Roster ({shiftAssignments.length})
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Assigned Shift</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Timings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftAssignments.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{a.employee_name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{a.department}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className="badge badge-indigo">{a.shift_name}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{a.start_time} - {a.end_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
