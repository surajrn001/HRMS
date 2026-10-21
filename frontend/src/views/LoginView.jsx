import React, { useState } from 'react';
import {
  Lock,
  User,
  Mail,
  Shield,
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await api.register({
        username,
        email,
        password,
        role,
      });
      setSuccessMsg('Account registered successfully! Logging you in...');
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: '#0f172a',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Building2 size={24} />
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px 0', letterSpacing: '-0.02em', color: '#0f172a' }}>
            WorkSphere HRMS
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            WorkSphere Technologies Pvt. Ltd. • Bengaluru
          </p>
        </div>

        {/* Minimal White Card */}
        <div
          className="glass-panel"
          style={{
            padding: '26px 28px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', marginBottom: '18px' }}>
            <button
              style={{
                flex: 1,
                padding: '8px',
                background: 'transparent',
                border: 'none',
                borderBottom: !isRegister ? '2px solid #0f172a' : '2px solid transparent',
                color: !isRegister ? '#0f172a' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
            >
              Sign In
            </button>
            <button
              style={{
                flex: 1,
                padding: '8px',
                background: 'transparent',
                border: 'none',
                borderBottom: isRegister ? '2px solid #0f172a' : '2px solid transparent',
                color: isRegister ? '#0f172a' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '9px 12px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.825rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '9px 12px',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--success)',
                fontSize: '0.825rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label">Email ID</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    placeholder="name@worksphere.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label">Role</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    className="form-select"
                    style={{ paddingLeft: '36px' }}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="EMPLOYEE">Employee (Attendance & Leaves)</option>
                    <option value="HR">HR Manager</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', marginTop: '6px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : isRegister ? 'Register Account' : 'Sign In'}
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
