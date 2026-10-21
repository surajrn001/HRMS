import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  Calendar,
  ShieldCheck,
  X
} from 'lucide-react';
import { api } from '../services/api';
import PayslipModal from '../components/PayslipModal';
import { formatINR } from '../utils/format';

export default function PayrollView({ user }) {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // Generate form
  const [genData, setGenData] = useState({
    employee_id: '',
    month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    basic_salary: 85000,
    bonus: 5000,
    deductions: 8700,
  });
  const [submitting, setSubmitting] = useState(false);

  const canGenerate = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    fetchPayroll();
    if (canGenerate) {
      loadEmployees();
    }
  }, [selectedMonth]);

  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data);
      if (data.length > 0 && !genData.employee_id) {
        const firstSalary = data[0].salary || 85000;
        setGenData((prev) => ({
          ...prev,
          employee_id: data[0].id,
          basic_salary: firstSalary,
          deductions: Math.round(firstSalary * 0.10 + 200),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const data = await api.getPayrollList({
        month: selectedMonth || undefined,
      });
      setPayrolls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find((e) => e.id === parseInt(empId));
    if (emp) {
      setGenData({
        ...genData,
        employee_id: emp.id,
        basic_salary: emp.salary,
        deductions: Math.round(emp.salary * 0.10 + 200),
      });
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.generatePayroll({
        employee_id: parseInt(genData.employee_id),
        month: genData.month,
        basic_salary: parseFloat(genData.basic_salary),
        bonus: parseFloat(genData.bonus),
        deductions: parseFloat(genData.deductions),
      });
      setIsGenerateModalOpen(false);
      fetchPayroll();
    } catch (err) {
      alert(`Payroll generation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayslip = (item) => {
    setActivePayslip(item);
    setIsPayslipModalOpen(true);
  };

  // Metrics
  const totalNet = payrolls.reduce((acc, curr) => acc + curr.net_salary, 0);
  const totalBonus = payrolls.reduce((acc, curr) => acc + curr.bonus, 0);
  const totalDeductions = payrolls.reduce((acc, curr) => acc + curr.deductions, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px 0' }}>Payroll Processing & Salary Slips</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Monthly CTC disbursement, EPF & PT deductions, and digital Form 16 / Payslip generation.</p>
        </div>
        {canGenerate && (
          <button className="btn btn-primary" onClick={() => setIsGenerateModalOpen(true)}>
            <Plus size={16} /> Process Salary Run
          </button>
        )}
      </div>

      {/* KPI Cards in INR */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Net Disbursed
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--success)' }}>
              {formatINR(totalNet)}
            </h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>{payrolls.length} salary records processed</span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>₹</span>
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Incentives & Diwali Bonus
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--primary)' }}>
              +{formatINR(totalBonus)}
            </h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>Performance bonuses credited</span>
          </div>
          <div className="kpi-icon-box" style={{ background: '#eef2ff', color: '#4338ca' }}>
            <CreditCard size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Statutory Deductions (EPF / PT / TDS)
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '4px 0 2px 0', color: 'var(--danger)' }}>
              -{formatINR(totalDeductions)}
            </h2>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>Government statutory withholdings</span>
          </div>
          <div className="kpi-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Salary Statements (INR)</h3>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Calendar size={15} color="var(--text-dim)" />
            <input
              type="text"
              className="form-input"
              style={{ width: 'auto', minWidth: '170px', padding: '5px 10px', fontSize: '0.825rem' }}
              placeholder="Filter by Month (e.g. October 2026)"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Month</th>
                <th>Basic Pay</th>
                <th>Incentives / Bonus</th>
                <th>Deductions (PF+PT)</th>
                <th>Net In-Hand Pay</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading salary statements...
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No payroll entries found for this month.
                  </td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {p.designation} • {p.department}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{p.month}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {formatINR(p.basic_salary)}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      +{formatINR(p.bonus)}
                    </td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      -{formatINR(p.deductions)}
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {formatINR(p.net_salary)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenPayslip(p)}
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      >
                        <Eye size={13} /> View Payslip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE MODAL */}
      {isGenerateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGenerateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Process Monthly Salary Run</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsGenerateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit}>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select
                  className="form-select"
                  value={genData.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.designation} - {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payroll Month</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. October 2026"
                  value={genData.month}
                  onChange={(e) => setGenData({ ...genData, month: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Basic Pay (₹) *</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    step="1000"
                    className="form-input"
                    value={genData.basic_salary}
                    onChange={(e) => setGenData({ ...genData, basic_salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Performance Bonus / Incentives (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={genData.bonus}
                    onChange={(e) => setGenData({ ...genData, bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deductions (PF + PT ₹200 + TDS) (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="form-input"
                  value={genData.deductions}
                  onChange={(e) => setGenData({ ...genData, deductions: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Net In-Hand preview */}
              <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated In-Hand Salary:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
                  {formatINR(genData.basic_salary + genData.bonus - genData.deductions)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsGenerateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Confirm & Generate Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        payrollItem={activePayslip}
      />
    </div>
  );
}
