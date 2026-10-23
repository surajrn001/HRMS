import React from 'react';
import { X, Printer, Building2, CheckCircle2 } from 'lucide-react';
import { formatINR, formatINRWithDecimals } from '../utils/format';

export default function PayslipModal({ isOpen, onClose, payrollItem }) {
  if (!isOpen || !payrollItem) return null;

  const handlePrint = () => {
    window.print();
  };

  const basic = payrollItem.basic_salary || 0;
  // Use exact DB breakdown if available, else standard Indian corporate formulation
  const hra = payrollItem.hra || Math.round(basic * 0.4);
  const specialAllowance = payrollItem.special_allowance || Math.round(basic * 0.2);
  const bonus = payrollItem.bonus || 0;
  const grossEarnings = basic + hra + specialAllowance + bonus;

  const pfDeduction = payrollItem.pf_deduction || Math.min(Math.round(basic * 0.12), 1800);
  const ptDeduction = 200; // Karnataka / Maharashtra PT standard
  const taxDeduction = payrollItem.tax_deduction || Math.max(0, Math.round(payrollItem.deductions - pfDeduction - ptDeduction));
  const totalDeductions = payrollItem.deductions || (pfDeduction + ptDeduction + taxDeduction);

  const netPay = payrollItem.net_salary || (grossEarnings - totalDeductions);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '740px', padding: '0', background: '#ffffff', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#0f172a', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#818cf8" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Monthly Salary Slip (Corporate Payslip)</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              <Printer size={15} /> Print / Save PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: '#fff' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Indian Payslip Body */}
        <div style={{ padding: '28px 32px', color: '#1e293b', background: '#ffffff', minHeight: '520px', fontSize: '0.85rem' }} id="printable-payslip">
          {/* Company Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>WORKSPHERE TECHNOLOGIES PVT. LTD.</h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                CIN: U72200KA2022PTC158941 • GSTIN: 29AABCW9871P1ZT
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.785rem', margin: 0 }}>
                Pritech Park SEZ, Outer Ring Road, Bellandur, Bengaluru, Karnataka - 560103
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', display: 'inline-block' }}>
                PAYSLIP FOR {payrollItem.month?.toUpperCase()}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Pay Cycle: Monthly (Last Working Day)
              </p>
            </div>
          </div>

          {/* Employee & Bank Info Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>Employee Name:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{payrollItem.employee_name}</span></p>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>Employee ID:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>WS-IN-{String(payrollItem.employee_id).padStart(3, '0')}</span></p>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>Department:</strong> {payrollItem.department || 'Engineering'}</p>
              <p style={{ margin: '0' }}><strong style={{ color: '#475569' }}>Designation:</strong> {payrollItem.designation || 'Specialist'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>Bank Name:</strong> HDFC Bank Ltd. (Salary Account)</p>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>A/c No.:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>5010049281XXXX</span></p>
              <p style={{ margin: '0 0 4px 0' }}><strong style={{ color: '#475569' }}>PF UAN:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>101488920194</span></p>
              <p style={{ margin: '0' }}><strong style={{ color: '#475569' }}>Pay Status:</strong> Direct Electronic Deposit (NEFT/RTGS)</p>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}>
            {/* Earnings Column */}
            <div style={{ borderRight: '1px solid #cbd5e1' }}>
              <div style={{ background: '#f1f5f9', padding: '8px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>EARNINGS BREAKDOWN</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Salary</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(basic)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>House Rent Allowance (HRA)</span>
                  <span>{formatINR(hra)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Special Allowance</span>
                  <span>{formatINR(specialAllowance)}</span>
                </div>
                {bonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Performance Bonus</span>
                    <span style={{ fontWeight: 600 }}>+{formatINR(bonus)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                  <span>Gross Earnings (A)</span>
                  <span>{formatINR(grossEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div>
              <div style={{ background: '#f1f5f9', padding: '8px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>DEDUCTIONS BREAKDOWN</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Employee Provident Fund (EPF)</span>
                  <span style={{ color: '#dc2626' }}>{formatINR(pfDeduction)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Professional Tax (PT)</span>
                  <span style={{ color: '#dc2626' }}>{formatINR(ptDeduction)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Income Tax (TDS)</span>
                  <span style={{ color: '#dc2626' }}>{formatINR(taxDeduction)}</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#dc2626' }}>
                  <span>Total Deductions (B)</span>
                  <span>{formatINR(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary In-Hand Box */}
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                Net Disbursed Take-Home Salary (A - B)
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={15} /> Credited to Employee Salary Account
              </p>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-heading)' }}>
              {formatINRWithDecimals(netPay)}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#94a3b8' }}>
            <span>This is an authenticated computer-generated payslip and does not require a physical signature.</span>
            <span>Ref: WS-PAY-2026-{payrollItem.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
