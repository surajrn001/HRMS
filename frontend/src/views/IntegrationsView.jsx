import React, { useState, useEffect } from 'react';
import {
  Layers,
  Mail,
  Calendar,
  Download,
  ExternalLink,
  Send,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Server,
  Check,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function IntegrationsView({ user }) {
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [activeTab, setActiveTab] = useState('exports'); // 'exports', 'calendar', 'email'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Email Test State
  const [testEmail, setTestEmail] = useState(user.email || 'suraj@worksphere.co.in');
  const [testSubject, setTestSubject] = useState('WorkSphere Live Integration Test');
  const [testBody, setTestBody] = useState('This is an automated notification testing WorkSphere HRMS email integration gateway.');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Calendar Event Link State
  const [eventTitle, setEventTitle] = useState('General Work Shift - WorkSphere');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState('');

  // Export State
  const [exportingType, setExportingType] = useState(null);

  useEffect(() => {
    generateGoogleLink();
  }, [eventTitle, startTime, endTime]);

  useEffect(() => {
    if (activeTab === 'email' && canManage) {
      loadEmailLogs();
    }
  }, [activeTab]);

  const generateGoogleLink = async () => {
    try {
      const res = await api.getGoogleCalendarLink(eventTitle, startTime, endTime);
      setGoogleCalendarUrl(res.google_calendar_url);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.getEmailLogs();
      setEmailLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setSendingEmail(true);
    setErrorMsg('');
    try {
      const res = await api.sendTestEmail({
        recipient: testEmail,
        subject: testSubject,
        body: testBody,
      });
      setSuccessMsg(`Email successfully dispatched to ${res.recipient}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      if (canManage) loadEmailLogs();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch test email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadIcs = async () => {
    try {
      await api.downloadCalendarIcs();
      setSuccessMsg('Calendar .ics file downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to download iCal file');
    }
  };

  const handleExportCsv = async (type) => {
    setExportingType(type);
    try {
      await api.downloadExportCsv(type);
      setSuccessMsg(`Successfully generated and downloaded ${type} CSV report!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message || `Failed to export ${type} report`);
    } finally {
      setExportingType(null);
    }
  };

  const exportCards = [
    {
      type: 'employees',
      title: 'Employee Directory Ledger',
      description: 'Comprehensive roster with employee names, email addresses, departments, designations, joining dates, salaries, and current status.',
      badge: 'Staff Data',
    },
    {
      type: 'attendance',
      title: 'Attendance & Punctuality Logs',
      description: 'Detailed daily punch records, check-in/out timestamps, hours worked, late check-in flags, and overtime summaries.',
      badge: 'Time Tracking',
    },
    {
      type: 'payroll',
      title: 'Payroll & Compensation Registry',
      description: 'Full monthly salary calculation, basic pay, HRA allowances, bonus disbursements, statutory PF deductions, and net salary payout.',
      badge: 'Finance',
    },
    {
      type: 'leaves',
      title: 'Leave Applications & Balances',
      description: 'Audit report of all employee casual, sick, and paid leave applications, duration in days, and manager approval status.',
      badge: 'Leave Tracker',
    },
    {
      type: 'onboarding',
      title: 'Onboarding Checklist Progress',
      description: 'Task-by-task status report of new hire onboarding checklists, verification milestones, and scheduled completion due dates.',
      badge: 'Orientation',
    },
    {
      type: 'resignations',
      title: 'Exit & Separation Records',
      description: 'Formal employee resignation submissions, stated reasons, notice period obligations, and executive approval records.',
      badge: 'Separations',
    },
  ];

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers className="text-primary" size={28} />
          Third-Party Integrations & Export Hub
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Seamlessly connect WorkSphere with external calendar clients, email dispatch gateways, and enterprise CSV/PDF reporting pipelines.
        </p>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
          {errorMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          id="tab-integrations-exports"
          className={`btn ${activeTab === 'exports' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('exports')}
        >
          <FileSpreadsheet size={16} /> Data Export Center
        </button>
        <button
          id="tab-integrations-calendar"
          className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={16} /> Calendar Integration (iCal & Google)
        </button>
        <button
          id="tab-integrations-email"
          className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={16} /> Email Notification Service
        </button>
      </div>

      {/* TAB 1: DATA EXPORT CENTER */}
      {activeTab === 'exports' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
              One-Click Executive Report Exports
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Export clean, standard UTF-8 CSV sheets compatible with Microsoft Excel, Apple Numbers, and Google Sheets.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
            {exportCards.map((card) => (
              <div
                key={card.type}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '22px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-indigo">{card.badge}</span>
                    <FileSpreadsheet size={20} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
                    {card.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: '0 0 16px 0' }}>
                    {card.description}
                  </p>
                </div>

                <button
                  id={`btn-export-${card.type}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={exportingType === card.type}
                  onClick={() => handleExportCsv(card.type)}
                >
                  <Download size={16} />
                  {exportingType === card.type ? 'Exporting CSV...' : 'Download CSV Dataset'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CALENDAR INTEGRATION */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
          {/* Card 1: RFC 5545 iCal Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Calendar size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Standard iCalendar (.ics) Sync
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  For Apple Calendar, Microsoft Outlook & Thunderbird
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Download your personal WorkSphere schedule feed containing your active shift timings, upcoming approved leaves, and company orientation milestones in RFC 5545 format.
            </p>

            <div style={{ padding: '14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                FEED SPECIFICATION:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>Standard: RFC 5545 iCalendar</li>
                <li>Timezone: Asia/Kolkata (IST)</li>
                <li>Events: Shifts, Approved Vacation/Sick Leaves, Onboarding</li>
              </ul>
            </div>

            <button
              id="btn-download-ics"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleDownloadIcs}
            >
              <Download size={16} /> Download .ics Calendar File
            </button>
          </div>

          {/* Card 2: 1-Click Google Calendar Generator */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <ExternalLink size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  1-Click Google Calendar Sync
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Add Shift or Meeting to Google Calendar
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Generate an instant Google Calendar event link to save your shifts, meetings, or company milestones directly into your Google Calendar account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Event Title
                </label>
                <input
                  id="input-gcal-title"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="input"
                    style={{ width: '100%' }}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    className="input"
                    style={{ width: '100%' }}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <a
              id="link-google-calendar"
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <ExternalLink size={16} /> Open in Google Calendar
            </a>
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL NOTIFICATION SERVICE */}
      {activeTab === 'email' && (
        <div style={{ display: 'grid', gridTemplateColumns: canManage ? '1fr 1fr' : '1fr', gap: '22px' }}>
          {/* Test Dispatch Form */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Mail size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Test Email Dispatch Gateway
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Verify email dispatch for employee alerts and bulletins
                </span>
              </div>
            </div>

            <form onSubmit={handleSendTestEmail}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Recipient Email *
                </label>
                <input
                  id="input-test-email-recipient"
                  type="email"
                  className="input"
                  style={{ width: '100%' }}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Subject Line *
                </label>
                <input
                  id="input-test-email-subject"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Email Body Content *
                </label>
                <textarea
                  id="input-test-email-body"
                  className="input"
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-send-test-email"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={sendingEmail}
              >
                <Send size={16} /> {sendingEmail ? 'Dispatching...' : 'Dispatch Test Notification'}
              </button>
            </form>
          </div>

          {/* Audit Logs (HR/Admin) */}
          {canManage && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} /> Integration Dispatch Audit Logs
                </h3>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  onClick={loadEmailLogs}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading logs...
                </div>
              ) : emailLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  No recent email logs recorded. Dispatch a test notification to see audit logs.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          To: {log.recipient}
                        </span>
                        <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                          {log.status}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Subject: <em>{log.subject}</em>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Sent by {log.sent_by} • {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
