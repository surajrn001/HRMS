import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Calendar,
  AlertCircle,
  UserCheck,
  Sparkles,
  Users,
  Search,
  Filter,
  Check,
  Trash2,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function OnboardingView({ user }) {
  const isEmployee = user.role === 'EMPLOYEE';
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState(null);
  const [overview, setOverview] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Add Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskEmpId, setNewTaskEmpId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedEmpId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (canManage) {
        const [ovData, empData] = await Promise.all([
          api.getOnboardingOverview(),
          api.getEmployees({ status: 'ACTIVE' }),
        ]);
        setOverview(ovData);
        setEmployees(empData);

        // Load tasks for selected employee or all
        const taskData = await api.getOnboarding(
          selectedEmpId ? { employee_id: selectedEmpId } : {}
        );
        setTasks(taskData);

        if (selectedEmpId) {
          const prog = await api.getOnboardingProgress(selectedEmpId);
          setProgress(prog);
        } else {
          setProgress(null);
        }
      } else {
        // Employee view
        const [taskData, progData] = await Promise.all([
          api.getOnboarding(),
          api.getOnboardingProgress(),
        ]);
        setTasks(taskData);
        setProgress(progData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load onboarding tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateOnboardingStatus(task.id, nextStatus);
      setSuccessMsg(`Task marked as ${nextStatus.toLowerCase()}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskEmpId || !newTaskName || !newTaskDueDate) {
      alert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.createOnboardingTask({
        employee_id: parseInt(newTaskEmpId, 10),
        task_name: newTaskName,
        due_date: newTaskDueDate,
      });
      setIsModalOpen(false);
      setNewTaskName('');
      setNewTaskDueDate('');
      setSuccessMsg('Onboarding task assigned successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDefaults = async (empId) => {
    if (!window.confirm('Assign standard onboarding checklist templates to this employee?')) return;
    try {
      await api.assignDefaultOnboarding(empId);
      setSuccessMsg('Standard onboarding checklist assigned successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign default tasks');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this onboarding task?')) return;
    try {
      await api.deleteOnboardingTask(taskId);
      setSuccessMsg('Task deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'PENDING') return t.status === 'PENDING';
    if (filterStatus === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck className="text-primary" size={28} />
            {isEmployee ? 'My Onboarding Checklist' : 'Employee Onboarding Hub'}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isEmployee
              ? 'Complete required onboarding verification items, compliance training, and orientation tasks.'
              : 'Streamline orientation, assign checklists, and monitor milestone completion across new hires.'}
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="btn-assign-onboarding"
              className="btn btn-primary"
              onClick={() => {
                setNewTaskEmpId(selectedEmpId || (employees[0] ? employees[0].id : ''));
                setIsModalOpen(true);
              }}
            >
              <Plus size={16} /> Assign Task
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
          {error}
        </div>
      )}

      {/* Progress Card */}
      {progress && (
        <div className="card" style={{ marginBottom: '24px', padding: '22px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Onboarding Completion Status
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {progress.employee_name} ({progress.department})
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {progress.progress_percentage}%
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {progress.completed_tasks} of {progress.total_tasks} completed
                </div>
              </div>
              {progress.progress_percentage === 100 && (
                <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.8rem' }}>
                  <Sparkles size={14} /> Fully Onboarded!
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '10px', background: 'var(--bg-main)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress.progress_percentage}%`,
                height: '100%',
                background: progress.progress_percentage === 100
                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* HR Overview Roster Cards (if canManage and no employee selected) */}
      {canManage && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> New Hire Progress Overview
            </h3>

            {/* Employee Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter Roster:</span>
              <select
                id="select-onboarding-employee"
                className="input"
                style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                <option value="">All Team Members</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Overview Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Progress</th>
                  <th>Tasks Done</th>
                  <th>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overview.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No active onboarding checklists found.
                    </td>
                  </tr>
                ) : (
                  overview.map((item) => (
                    <tr
                      key={item.employee_id}
                      style={{
                        backgroundColor: selectedEmpId === String(item.employee_id) ? 'var(--primary-light)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedEmpId(String(item.employee_id))}
                    >
                      <td style={{ fontWeight: 600 }}>{item.employee_name}</td>
                      <td>{item.department}</td>
                      <td style={{ minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.progress_percentage}%`,
                                height: '100%',
                                background: item.progress_percentage === 100 ? '#10b981' : '#4f46e5',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                            {item.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-emerald">
                          {item.completed_tasks} / {item.total_tasks}
                        </span>
                      </td>
                      <td>
                        <span className={item.pending_tasks > 0 ? 'badge badge-warning' : 'badge badge-gray'}>
                          {item.pending_tasks}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmpId(String(item.employee_id));
                          }}
                        >
                          View Tasks
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Checklist Section */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {selectedEmpId
                ? `Checklist Items for ${employees.find((e) => String(e.id) === selectedEmpId)?.full_name || 'Selected Employee'}`
                : isEmployee
                ? 'Your Onboarding Milestones'
                : 'All Onboarding Checklist Tasks'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any checkbox to toggle completion status.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'PENDING', 'COMPLETED'].map((status) => (
              <button
                key={status}
                className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Task items list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading checklist...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
            <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No onboarding tasks found</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 12px 0' }}>
              {filterStatus !== 'ALL'
                ? `No ${filterStatus.toLowerCase()} tasks in this category.`
                : 'No tasks have been assigned yet.'}
            </p>
            {canManage && selectedEmpId && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.825rem' }}
                onClick={() => handleAssignDefaults(parseInt(selectedEmpId, 10))}
              >
                <Layers size={15} /> Assign Standard Starter Checklist
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTasks.map((t) => {
              const isCompleted = t.status === 'COMPLETED';
              return (
                <div
                  key={t.id}
                  id={`onboarding-task-${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-card)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, cursor: 'pointer' }}
                    onClick={() => handleToggleStatus(t)}
                  >
                    <div style={{ color: isCompleted ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                      {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                      >
                        {t.task_name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {canManage && !selectedEmpId && (
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {t.employee_name} ({t.department})
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> Due: {t.due_date}
                        </span>
                        {t.is_overdue && (
                          <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
                            <AlertCircle size={11} /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={isCompleted ? 'badge badge-emerald' : 'badge badge-indigo'}>
                      {t.status}
                    </span>
                    {canManage && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Delete Task"
                        onClick={() => handleDeleteTask(t.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Task Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0' }}>
              Assign Onboarding Task
            </h3>
            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Assign To Employee *
                </label>
                <select
                  id="modal-onboarding-emp-id"
                  className="input"
                  style={{ width: '100%' }}
                  value={newTaskEmpId}
                  onChange={(e) => setNewTaskEmpId(e.target.value)}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} – {e.designation} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Task Name / Description *
                </label>
                <input
                  id="modal-onboarding-task-name"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Submit Address Proof & Bank Details"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Due Date *
                </label>
                <input
                  id="modal-onboarding-due-date"
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-onboarding-task"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
