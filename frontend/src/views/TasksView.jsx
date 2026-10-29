import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  User,
  Trash2,
  Check,
  TrendingUp,
  ListTodo
} from 'lucide-react';
import { api } from '../services/api';

export default function TasksView({ user }) {
  const isEmployee = user.role === 'EMPLOYEE';
  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Assign Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterEmployee, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (canManage && filterEmployee) {
        params.assigned_to = filterEmployee;
      }
      if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }

      const [taskList, statsData] = await Promise.all([
        api.getTasks(params),
        api.getTaskStats(canManage && filterEmployee ? filterEmployee : null),
      ]);
      setTasks(taskList);
      setStats(statsData);

      if (canManage && employees.length === 0) {
        const empList = await api.getEmployees({ status: 'ACTIVE' });
        setEmployees(empList);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateTaskStatus(task.id, nextStatus);
      setSuccessMsg(`Task marked as ${nextStatus.toLowerCase()}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!assignedTo || !title.trim() || !dueDate) {
      alert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.createTask({
        assigned_to: parseInt(assignedTo, 10),
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSuccessMsg('Task assigned successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setSuccessMsg('Task deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ListTodo className="text-primary" size={28} />
            {isEmployee ? 'My Assigned Tasks' : 'Internal Task Operations'}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isEmployee
              ? 'Organize your deliverable milestones, update status, and manage target deadlines.'
              : 'Delegate projects to employees, monitor progress metrics, and track completion velocity.'}
          </p>
        </div>

        {canManage && (
          <button
            id="btn-assign-new-task"
            className="btn btn-primary"
            onClick={() => {
              setAssignedTo(employees[0] ? String(employees[0].id) : '');
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} /> Assign New Task
          </button>
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

      {/* Task Dashboard Metric Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {stats.total_tasks}
            </div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Tasks
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {stats.pending_tasks}
            </div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Completed Tasks
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {stats.completed_tasks}
            </div>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Completion Rate
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  {stats.completion_rate}%
                </div>
              </div>
              <TrendingUp size={28} color="var(--primary)" opacity={0.6} />
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filters Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'PENDING', 'COMPLETED'].map((st) => (
              <button
                key={st}
                className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 14px', fontSize: '0.825rem' }}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Employee Dropdown (HR/Admin) */}
          {canManage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Filter Assignee:
              </span>
              <select
                id="select-task-filter-employee"
                className="input"
                style={{ width: '220px', padding: '6px 12px', fontSize: '0.825rem' }}
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              >
                <option value="">All Team Members</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.department})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="card" style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '45px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={38} color="var(--success)" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No tasks found</div>
            <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              {filterStatus !== 'ALL'
                ? `No tasks currently marked as ${filterStatus.toLowerCase()}.`
                : 'All caught up! No tasks assigned.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map((task) => {
              const isCompleted = task.status === 'COMPLETED';
              return (
                <div
                  key={task.id}
                  id={`task-item-${task.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-card)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, cursor: 'pointer' }}
                    onClick={() => handleToggleStatus(task)}
                  >
                    <div style={{ color: isCompleted ? 'var(--success)' : 'var(--text-dim)', marginTop: '2px' }}>
                      {isCompleted ? <CheckSquare size={22} /> : <Square size={22} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.975rem',
                          fontWeight: 700,
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </div>

                      {task.description && (
                        <p style={{ margin: '4px 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {task.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {canManage && (
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={13} /> Assigned: {task.assignee_name} ({task.department})
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> Due: {task.due_date}
                        </span>
                        {task.is_overdue && (
                          <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
                            <AlertCircle size={11} /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
                    <span className={isCompleted ? 'badge badge-emerald' : 'badge badge-warning'}>
                      {task.status}
                    </span>
                    {canManage && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Delete Task"
                        onClick={() => handleDeleteTask(task.id)}
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
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0' }}>
              Assign Internal Task
            </h3>
            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Assignee Employee *
                </label>
                <select
                  id="modal-task-assignee"
                  className="input"
                  style={{ width: '100%' }}
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
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
                  Task Title *
                </label>
                <input
                  id="modal-task-title"
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Conduct ISO 27001 Access Control Audit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Description / Deliverables
                </label>
                <textarea
                  id="modal-task-desc"
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Provide context, acceptance criteria, or key dependencies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Due Date *
                </label>
                <input
                  id="modal-task-due-date"
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
                  id="btn-confirm-assign-task"
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
