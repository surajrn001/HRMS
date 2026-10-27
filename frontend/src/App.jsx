import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  LogOut,
  Building2,
  FileText,
  Star,
  BarChart3
} from 'lucide-react';
import './App.css';
import { api } from './services/api';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmployeesView from './views/EmployeesView';
import AttendanceView from './views/AttendanceView';
import LeavesView from './views/LeavesView';
import PayrollView from './views/PayrollView';
import AdminControlsView from './views/AdminControlsView';
import DocumentsView from './views/DocumentsView';
import PerformanceView from './views/PerformanceView';
import AnalyticsView from './views/AnalyticsView';
import NotificationsModal from './components/NotificationsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.clearAllNotifications();
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // RBAC Navigation guards
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'EMPLOYEE' && (activeTab === 'employees' || activeTab === 'admin')) {
      setActiveTab('dashboard');
    } else if (currentUser.role === 'HR' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const isEmployee = currentUser.role === 'EMPLOYEE';
  const isHR = currentUser.role === 'HR';
  const isAdmin = currentUser.role === 'ADMIN';

  const canManageEmployees = isAdmin || isHR;
  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  const menuItems = [
    {
      id: 'dashboard',
      label: isEmployee ? 'Self-Service Portal' : 'Overview Dashboard',
      icon: LayoutDashboard,
    },
    ...(canManageEmployees ? [{ id: 'employees', label: 'Employee Directory', icon: Users }] : []),
    { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
    { id: 'leaves', label: 'Leaves & Calendar', icon: CalendarDays },
    { id: 'documents', label: 'Document Vault', icon: FileText },
    { id: 'performance', label: 'Performance Reviews', icon: Star },
    ...(canManageEmployees ? [{ id: 'analytics', label: 'Workforce Analytics', icon: BarChart3 }] : []),
    { id: 'payroll', label: 'Payroll & Payslips', icon: CreditCard },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Controls', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="main-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
              WorkSphere
            </h2>
            <p style={{ fontSize: '0.725rem', margin: 0, color: 'var(--text-dim)' }}>
              Tech Pvt. Ltd. (Bengaluru)
            </p>
          </div>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li
                key={item.id}
                id={`sidebar-item-${item.id}`}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>

        {/* User Card in Sidebar Bottom */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isAdmin
                  ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                  : isHR
                  ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {(currentUser.full_name || currentUser.username).substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser.full_name || currentUser.username}
              </div>
              <span
                className={`badge ${
                  isAdmin ? 'badge-purple' : isHR ? 'badge-emerald' : 'badge-indigo'
                }`}
                style={{ fontSize: '0.65rem', padding: '1px 6px' }}
              >
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="content-area">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
              {activeTab === 'dashboard'
                ? isEmployee
                  ? 'Employee Self-Service (ESS)'
                  : 'Overview Dashboard'
                : activeTab === 'employees'
                ? 'Employee Directory & Staff'
                : activeTab === 'attendance'
                ? 'Daily Attendance & Shifts'
                : activeTab === 'leaves'
                ? 'Leave Tracker & Balances'
                : activeTab === 'payroll'
                ? 'Payroll & Compensation'
                : 'Admin Controls & Governance'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                id="btn-notifications-drawer"
                className="btn btn-ghost"
                style={{ position: 'relative', padding: '8px' }}
                onClick={() => setIsNotifModalOpen(true)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              className="btn btn-ghost"
              style={{ padding: '8px' }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Logout */}
            <button
              id="btn-logout"
              className="btn btn-ghost"
              style={{ padding: '8px', color: 'var(--danger)' }}
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* View Container */}
        <main className="main-view-container">
          {activeTab === 'dashboard' && <DashboardView user={currentUser} onNavigate={setActiveTab} />}
          {activeTab === 'employees' && canManageEmployees && <EmployeesView user={currentUser} />}
          {activeTab === 'attendance' && <AttendanceView user={currentUser} />}
          {activeTab === 'leaves' && <LeavesView user={currentUser} />}
          {activeTab === 'documents' && <DocumentsView user={currentUser} />}
          {activeTab === 'performance' && <PerformanceView user={currentUser} />}
          {activeTab === 'analytics' && canManageEmployees && <AnalyticsView user={currentUser} />}
          {activeTab === 'payroll' && <PayrollView user={currentUser} />}
          {activeTab === 'admin' && isAdmin && <AdminControlsView currentUser={currentUser} />}
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
      />
    </div>
  );
}
