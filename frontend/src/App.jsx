import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  Bell,
  Sun,
  Moon,
  LogOut,
  Building2,
} from 'lucide-react';
import './App.css';
import { api } from './services/api';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmployeesView from './views/EmployeesView';
import AttendanceView from './views/AttendanceView';
import LeavesView from './views/LeavesView';
import PayrollView from './views/PayrollView';
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

  useEffect(() => {
    if (currentUser?.role === 'EMPLOYEE' && activeTab === 'employees') {
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

  const canManageEmployees = currentUser.role === 'ADMIN' || currentUser.role === 'HR';
  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(canManageEmployees ? [{ id: 'employees', label: 'Employees', icon: Users }] : []),
    { id: 'attendance', label: 'Attendance (Punches)', icon: Clock },
    { id: 'leaves', label: 'Leaves & Holidays', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll & Salary', icon: CreditCard },
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
            <p style={{ fontSize: '0.725rem', margin: 0, color: 'var(--text-dim)' }}>Tech Pvt. Ltd. (Bengaluru)</p>
          </div>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li
                key={item.id}
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
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.full_name || currentUser.username}
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
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
                ? 'Overview Dashboard'
                : activeTab === 'employees'
                ? 'Employee Management'
                : activeTab === 'attendance'
                ? 'Daily Attendance & Shifts'
                : activeTab === 'leaves'
                ? 'Leave Tracker'
                : 'Payroll & Compensation'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
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
                      boxShadow: '0 0 8px var(--primary-glow)',
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
          {activeTab === 'payroll' && <PayrollView user={currentUser} />}
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
}
