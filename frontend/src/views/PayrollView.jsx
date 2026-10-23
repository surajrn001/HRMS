import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  Calendar,
  X
} from 'lucide-react';
import { api } from '../services/api';
import PayslipModal from '../components/PayslipModal';
import { formatINR } from '../utils/format';

export default function PayrollView({ user }) {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // Generate form with complete breakdown
  const [genData, setGenData] = useState({
    employee_id: '',
    month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    basic_salary: 67500,
    hra: 40500,
    special_allowance: 27000,
    bonus: 5000,
    pf_deduction: 8100,
    tax_deduction: 8300,
  });
  const [submitting, setSubmitting] = useState(false);

  const canGenerate = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    fetchPayrollData();
    if (canGenerate) {
      loadEmployees();
    }
  }, [selectedMonth]);

  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data);
      if (data.length > 0 && !genData.employee_id) {
        autoFillBreakdown(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const autoFillBreakdown = (emp) => {
    const ctc = emp.salary || 100000;
    const basic = Math.round(ctc * 0.50);
    const hra = Math.round(ctc * 0.30);
    const special = Math.round(ctc * 0.20);
    const bonus = emp.department === 'Engineering' ? 5000 : 2500;
    const pf = Math.round(basic * 0.12);
    const tax = Math.round(ctc * 0.06 + 200);

    setGenData({
      employee_id: emp.id,
      month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      basic_salary: basic,
      hra: hra,
      special_allowance: special,
      bonus: bonus,
      pf_deduction: pf,
      tax_deduction: tax,
    });
  };

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [listData, summaryData] = await Promise.all([
        api.getPayrollList({ month: selectedMonth || undefined }),
        canGenerate ? api.getPayrollSummary(selectedMonth || undefined).catch(() => null) : null,
      ]);
      setPayrolls(listData);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find((e) => e.id === parseInt(empId));
    if (emp) {
      autoFillBreakdown(emp);
    }
  };

  // Live Calculations for Modal
  const calculatedGross =
    parseFloat(genData.basic_salary || 0) +
    parseFloat(genData.hra || 0) +
    parseFloat(genData.special_allowance || 0) +
    parseFloat(genData.bonus || 0);

  const calculatedDeductions =
    parseFloat(genData.pf_deduction || 0) + parseFloat(genData.tax_deduction || 0);

  const calculatedNet = Math.round((calculatedGross - calculatedDeductions) * 100) / 100;

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.generatePayroll({
        employee_id: parseInt(genData.employee_id),
        month: genData.month,
        basic_salary: parseFloat(genData.basic_salary),
        hra: parseFloat(genData.hra),
        special_allowance: parseFloat(genData.special_allowance),
        bonus: parseFloat(genData.bonus),
        pf_deduction: parseFloat(genData.pf_deduction),
        tax_deduction: parseFloat(genData.tax_deduction),
        deductions: calculatedDeductions,
      });
      setIsGenerateModalOpen(false);
      fetchPayrollData();
    } catch (err) {
      alert(`Could not process payroll: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPayslip = (p) => {
    setActivePayslip(p);
    setIsPayslipModalOpen(true);
  };

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
            <span className="badge badge-purple">Module 12</span>
            <span className="badge badge-indigo">Salary Breakdown & Payslips</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0 0' }}>Payroll & Compensation</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Detailed compensation breakdown (Basic, HRA, Special Allowance, PF, Tax), monthly summaries, and payslips.
          </p>
        </div>

        {canGenerate && (
          <button
            id="btn-open-generate-payroll"
            className="btn btn-primary"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <Plus size={16} /> Process Monthly Payroll
          </button>
        )}
      </div>

      {/* Monthly Summary KPI Banner (Module 12) */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Cycle Disbursed
            </span>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
              {formatINR(summary.total_net_disbursed)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total Net Payout ({summary.total_employees} staff)
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Gross Earnings (A)
            </span>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, marginTop: '2px' }}>
              {formatINR(summary.total_gross_disbursed)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Basic ({formatINR(summary.total_basic)}) + Allowances
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Statutory Deductions (B)
            </span>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
              {formatINR(summary.total_deductions)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              EPF + Professional Tax + TDS
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Allowances Total
            </span>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              {formatINR(summary.total_allowances)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              HRA, Special & Performance Bonus
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter Month:</span>
          <select
            id="select-payroll-month-filter"
            className="input"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All Payroll Cycles</option>
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Showing <strong>{payrolls.length}</strong> payroll records
        </div>
      </div>

      {/* Payroll Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Month</th>
              <th>Basic Pay</th>
              <th>Allowances (HRA+Spl)</th>
              <th>Bonus</th>
              <th>Deductions (PF+Tax)</th>
              <th>Net Salary</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Loading payroll records...
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No payroll records found.
                </td>
              </tr>
            ) : (
              payrolls.map((p) => {
                const totalAllowances = (p.hra || 0) + (p.special_allowance || 0);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.employee_name || 'Staff Member'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.department || 'General'}</td>
                    <td>
                      <span className="badge badge-purple">{p.month}</span>
                    </td>
                    <td>{formatINR(p.basic_salary)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatINR(totalAllowances)}</td>
                    <td>
                      {p.bonus > 0 ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>+{formatINR(p.bonus)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>₹0</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--danger)' }}>-{formatINR(p.deductions)}</td>
                    <td>
                      <strong style={{ color: 'var(--success)', fontSize: '0.95rem' }}>{formatINR(p.net_salary)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        id={`btn-view-payslip-${p.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewPayslip(p)}
                        title="View Detailed Payslip"
                      >
                        <Eye size={14} /> Payslip
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Payroll Modal with Live Breakdown */}
      {isGenerateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Generate Monthly Compensation Run</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsGenerateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Employee</label>
                  <select
                    id="select-generate-emp"
                    className="input"
                    value={genData.employee_id}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Payroll Month</label>
                  <input
                    id="input-generate-month"
                    type="text"
                    required
                    className="input"
                    value={genData.month}
                    onChange={(e) => setGenData({ ...genData, month: e.target.value })}
                  />
                </div>
              </div>

              {/* Salary Breakdown Inputs */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Salary Earnings & Allowances (₹)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Basic Salary</label>
                    <input
                      id="input-basic-salary"
                      type="number"
                      required
                      className="input"
                      value={genData.basic_salary}
                      onChange={(e) => setGenData({ ...genData, basic_salary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>House Rent Allowance (HRA)</label>
                    <input
                      id="input-hra-salary"
                      type="number"
                      className="input"
                      value={genData.hra}
                      onChange={(e) => setGenData({ ...genData, hra: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Special Allowance</label>
                    <input
                      id="input-special-allowance"
                      type="number"
                      className="input"
                      value={genData.special_allowance}
                      onChange={(e) => setGenData({ ...genData, special_allowance: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Performance Bonus</label>
                    <input
                      id="input-bonus"
                      type="number"
                      className="input"
                      value={genData.bonus}
                      onChange={(e) => setGenData({ ...genData, bonus: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Inputs */}
              <div style={{ background: '#fef2f2', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--danger)', textTransform: 'uppercase' }}>
                  Statutory Deductions (₹)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Provident Fund (EPF 12%)</label>
                    <input
                      id="input-pf-deduction"
                      type="number"
                      className="input"
                      value={genData.pf_deduction}
                      onChange={(e) => setGenData({ ...genData, pf_deduction: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Income Tax (TDS) + PT</label>
                    <input
                      id="input-tax-deduction"
                      type="number"
                      className="input"
                      value={genData.tax_deduction}
                      onChange={(e) => setGenData({ ...genData, tax_deduction: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Calculated Net Take-Home</span>
                  <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Gross: {formatINR(calculatedGross)} • Deductions: {formatINR(calculatedDeductions)}
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
                  {formatINR(calculatedNet)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsGenerateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-generate-payroll"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Disburse & Generate Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {isPayslipModalOpen && activePayslip && (
        <PayslipModal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          payrollItem={activePayslip}
        />
      )}
    </div>
  );
}
