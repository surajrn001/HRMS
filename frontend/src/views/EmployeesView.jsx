import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Mail,
  Building,
  Calendar,
  Shield,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR, formatDateIndian } from '../utils/format';

export default function EmployeesView({ user }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    designation: '',
    department: 'Engineering',
    joining_date: new Date().toISOString().split('T')[0],
    salary: 85000,
    role: 'EMPLOYEE',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'HR';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm, selectedDept, selectedStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees({
        search: searchTerm || undefined,
        department: selectedDept || undefined,
        status: selectedStatus || undefined,
      });
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      full_name: '',
      email: '',
      username: '',
      designation: '',
      department: 'Engineering',
      joining_date: new Date().toISOString().split('T')[0],
      salary: 85000,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      full_name: emp.full_name,
      designation: emp.designation,
      department: emp.department,
      joining_date: emp.joining_date,
      salary: emp.salary,
      status: emp.status,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenProfile = (emp) => {
    setSelectedEmployee(emp);
    setIsProfileModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      await api.createEmployee(formData);
      setIsAddModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      await api.updateEmployee(selectedEmployee.id, formData);
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.full_name} from records?`)) return;
    try {
      await api.deleteEmployee(emp.id);
      fetchEmployees();
    } catch (err) {
      alert(`Error deleting employee: ${err.message}`);
    }
  };

  const departments = [
    'Engineering',
    'Design & UX',
    'Human Resources',
    'Finance & Accounts',
    'Sales & Growth',
    'Executive Management'
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px 0' }}>Employee Directory</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Manage company employees, designations, monthly CTC, and active status.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search employee by name, department, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '170px' }}
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Role Access</th>
                <th>Monthly Gross</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const initials = emp.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e0e7ff',
                              border: '1px solid #c7d2fe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#3730a3',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{emp.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.department}</span>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          <Shield size={10} /> {emp.user_role || 'EMPLOYEE'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatINR(emp.salary)} / mo
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {formatDateIndian(emp.joining_date)}
                      </td>
                      <td>
                        <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="View Employee Profile"
                            onClick={() => handleOpenProfile(emp)}
                            style={{ padding: '6px' }}
                          >
                            <Eye size={15} />
                          </button>
                          {canManage && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Edit Employee"
                              onClick={() => handleOpenEdit(emp)}
                              style={{ padding: '6px' }}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Delete Employee"
                              onClick={() => handleDelete(emp)}
                              style={{ padding: '6px', color: 'var(--danger)' }}
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
      </div>

      {/* MODAL 1: ADD EMPLOYEE */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Add New Employee</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Ananya Sen"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Email *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ananya.sen@worksphere.co.in"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ananya_sen"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-select"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Gross Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    step="1000"
                    className="form-input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Joining *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Access Role *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="EMPLOYEE">Employee (Portal Access)</option>
                    <option value="HR">HR Officer</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EMPLOYEE */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Edit Employee Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-select"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Gross Pay (₹) *</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    step="1000"
                    className="form-input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Joining Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW PROFILE */}
      {isProfileModalOpen && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Employee Card</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsProfileModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  border: '1px solid #c7d2fe',
                  margin: '0 auto 10px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3730a3',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                {selectedEmployee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <h2 style={{ fontSize: '1.3rem', margin: '0 0 4px 0' }}>{selectedEmployee.full_name}</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 6px 0', fontSize: '0.9rem' }}>{selectedEmployee.designation}</p>
              <span className={`badge ${selectedEmployee.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                {selectedEmployee.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> Work Email</span>
                <span style={{ fontWeight: 600 }}>{selectedEmployee.user_email || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={14} /> Department</span>
                <span style={{ fontWeight: 600 }}>{selectedEmployee.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date of Joining</span>
                <span style={{ fontWeight: 600 }}>{formatDateIndian(selectedEmployee.joining_date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 700 }}>₹</span> Monthly Pay</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {formatINR(selectedEmployee.salary)} / month
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} /> System Role</span>
                <span className="badge badge-purple">{selectedEmployee.user_role || 'EMPLOYEE'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
