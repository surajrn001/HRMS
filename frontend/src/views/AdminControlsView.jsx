import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Edit3,
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminControlsView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createData, setCreateData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employee_id: '',
  });
  const [newRole, setNewRole] = useState('EMPLOYEE');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, empData, statsData] = await Promise.all([
        api.getAdminUsers(),
        api.getEmployees().catch(() => []),
        api.getAdminSystemStats().catch(() => null),
      ]);
      setUsers(usersData);
      setEmployees(empData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccessBanner = (msg) => {
    setActionSuccess(msg);
    setActionError('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const showErrorBanner = (msg) => {
    setActionError(msg);
    setActionSuccess('');
    setTimeout(() => setActionError(''), 4000);
  };

  // 1. Toggle User Active / Inactive Status
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      showErrorBanner('You cannot deactivate your own active Administrator account.');
      return;
    }
    const newStatus = !user.is_active;
    const confirmMsg = newStatus
      ? `Re-activate access for user "${user.username}"?`
      : `Deactivate account for user "${user.username}"? They will be immediately blocked from logging in.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleUserStatus(user.id, newStatus);
      showSuccessBanner(`Account "${user.username}" status updated to ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      fetchData();
    } catch (err) {
      showErrorBanner(`Failed to update status: ${err.message}`);
    }
  };

  // 2. Open Change Role Modal
  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await api.updateUserRole(selectedUser.id, newRole);
      setIsRoleModalOpen(false);
      showSuccessBanner(`Role for "${selectedUser.username}" changed to ${newRole}.`);
      fetchData();
    } catch (err) {
      showErrorBanner(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Open Password Reset Modal
  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      setSubmitting(true);
      await api.resetUserPassword(selectedUser.id, newPassword);
      setIsPasswordModalOpen(false);
      showSuccessBanner(`Password successfully reset for "${selectedUser.username}".`);
    } catch (err) {
      showErrorBanner(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Delete User
  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      showErrorBanner('You cannot delete your own Administrator account.');
      return;
    }
    if (!window.confirm(`Permanently delete account "${user.username}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteUser(user.id);
      showSuccessBanner(`User "${user.username}" deleted successfully.`);
      fetchData();
    } catch (err) {
      showErrorBanner(`Delete failed: ${err.message}`);
    }
  };

  // 5. Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        username: createData.username.trim(),
        email: createData.email.trim(),
        password: createData.password,
        role: createData.role,
        employee_id: createData.employee_id ? parseInt(createData.employee_id) : null,
      };
      await api.createAdminUser(payload);
      setIsCreateModalOpen(false);
      setCreateData({
        username: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        employee_id: '',
      });
      showSuccessBanner(`User "${payload.username}" created with role ${payload.role}.`);
      fetchData();
    } catch (err) {
      showErrorBanner(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

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
            <span className="badge badge-purple">Module 13</span>
            <span className="badge badge-indigo">System Administration</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0 0' }}>Admin Controls & User Management</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Manage user accounts, assign enterprise roles (EMPLOYEE / HR / ADMIN), and enforce account activation.
          </p>
        </div>

        <button
          id="btn-create-user-modal"
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <UserPlus size={16} />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Alert Banners */}
      {actionSuccess && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'var(--success-bg)',
            borderColor: 'var(--success-border)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'var(--danger-bg)',
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Security & System Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total User Accounts</span>
              <Users size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.total_users}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              System identities in database
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--success)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Accounts</span>
              <ShieldCheck size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>{stats.active_users}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Granted full system access
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--danger)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Deactivated Accounts</span>
              <ShieldAlert size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.deactivated_users > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
              {stats.deactivated_users}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Login blocked by administrator
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Role Breakdown</span>
              <Shield size={16} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span className="badge badge-purple" title="Administrators">
                {stats.role_distribution?.ADMIN || 0} Admin
              </span>
              <span className="badge badge-indigo" title="HR Managers">
                {stats.role_distribution?.HR || 0} HR
              </span>
              <span className="badge badge-cyan" title="Employees">
                {stats.role_distribution?.EMPLOYEE || 0} Staff
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
          <input
            id="input-admin-search-users"
            type="text"
            className="input"
            placeholder="Search by username, email, full name..."
            style={{ paddingLeft: '36px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-dim)' }} />
          <select
            id="select-admin-role-filter"
            className="input"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="HR">HR</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
          </select>

          <select
            id="select-admin-status-filter"
            className="input"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>User Account</th>
              <th>Linked Employee</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading accounts from database...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No user accounts match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isMe = u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-dim)' }}>#{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: u.is_active
                              ? u.role === 'ADMIN'
                                ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                                : u.role === 'HR'
                                ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
                                : 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)'
                              : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.username}</span>
                            {isMe && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>You</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.full_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                            {u.department} • {u.designation}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          Unlinked Profile
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'ADMIN'
                            ? 'badge-purple'
                            : u.role === 'HR'
                            ? 'badge-emerald'
                            : 'badge-indigo'
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="switch" title={u.is_active ? 'Active' : 'Deactivated'}>
                          <input
                            type="checkbox"
                            checked={u.is_active}
                            disabled={isMe}
                            onChange={() => handleToggleStatus(u)}
                          />
                          <span className="slider"></span>
                        </label>
                        <span
                          className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '6px' }}
                          title="Change Role"
                          onClick={() => handleOpenRoleModal(u)}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '6px' }}
                          title="Reset Password"
                          onClick={() => handleOpenPasswordModal(u)}
                        >
                          <KeyRound size={15} />
                        </button>
                        {!isMe && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '6px', color: 'var(--danger)' }}
                            title="Delete Account"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Provision New User */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Provision New User Account</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Username</label>
                  <input
                    id="input-new-username"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. aditya_tech"
                    value={createData.username}
                    onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Official Email</label>
                  <input
                    id="input-new-email"
                    type="email"
                    required
                    className="input"
                    placeholder="aditya@worksphere.co.in"
                    value={createData.email}
                    onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Initial Password</label>
                  <input
                    id="input-new-password"
                    type="password"
                    required
                    minLength={4}
                    className="input"
                    placeholder="Temporary password"
                    value={createData.password}
                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Assigned Role</label>
                  <select
                    id="select-new-role"
                    className="input"
                    value={createData.role}
                    onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                  >
                    <option value="EMPLOYEE">EMPLOYEE (Self-Service Access)</option>
                    <option value="HR">HR (Manager & Payroll Access)</option>
                    <option value="ADMIN">ADMIN (Full Governance & Security)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="label">Link to Existing Staff Profile (Optional)</label>
                <select
                  id="select-link-employee"
                  className="input"
                  value={createData.employee_id}
                  onChange={(e) => setCreateData({ ...createData, employee_id: e.target.value })}
                >
                  <option value="">-- No link (Standalone Account) --</option>
                  {employees
                    .filter((e) => !e.user_id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.designation} - {e.department})
                      </option>
                    ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Only employees without an active user account are listed.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-user"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Change Role */}
      {isRoleModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Update Role Permission</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsRoleModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Changing role for <strong>{selectedUser.username}</strong> ({selectedUser.email}).
            </p>

            <form onSubmit={handleUpdateRole}>
              <div style={{ marginBottom: '18px' }}>
                <label className="label">Select New Enterprise Role</label>
                <select
                  id="select-change-role"
                  className="input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="EMPLOYEE">EMPLOYEE – View profile, check-in, leaves & own payslips</option>
                  <option value="HR">HR – Employee directory, leave approvals & payroll runs</option>
                  <option value="ADMIN">ADMIN – Full system, user management & security access</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRoleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-role-change"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Confirm Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {isPasswordModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} style={{ color: 'var(--warning)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Administrator Password Reset</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Set a new secure password for user <strong>{selectedUser.username}</strong>.
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '18px' }}>
                <label className="label">New Password</label>
                <input
                  id="input-reset-password"
                  type="password"
                  required
                  minLength={4}
                  className="input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-reset-password"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
