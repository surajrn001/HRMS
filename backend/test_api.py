import sys
sys.path.insert(0, 'backend')
from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== Testing WorkSphere Phase 2 (RBAC & Advanced HR Workflows) ===")

    # 1. Root & Health Check
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    assert r.json()["version"] == "2.0.0"
    print(" Root health check & Phase 2 API version OK")

    # 2. Login as Admin
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(" Admin (Rajesh Sharma) login successful (JWT received with ADMIN role)")

    # 3. Login as HR
    r = client.post("/api/auth/login", json={"username": "neha_hr", "password": "hr123"})
    assert r.status_code == 200, f"HR login failed: {r.text}"
    hr_token = r.json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_token}"}
    print(" HR (Neha Kulkarni) login successful")

    # 4. Login as Employee
    r = client.post("/api/auth/login", json={"username": "suraj", "password": "emp123"})
    assert r.status_code == 200, f"Employee login failed: {r.text}"
    emp_token = r.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print(" Employee (Suraj) login successful")

    # 5. Security: Deactivated User Login Check
    r = client.post("/api/auth/login", json={"username": "kunal_contractor", "password": "emp123"})
    assert r.status_code == 403, f"Deactivated user should be rejected with 403, got {r.status_code}"
    print(" Security: Deactivated user (kunal_contractor) correctly rejected with 403 Forbidden")

    # 6. Security: RBAC Endpoint Protection
    # Employee cannot access employee management list
    r = client.get("/api/employees", headers=emp_headers)
    assert r.status_code == 403, f"Employee should not access /api/employees, got {r.status_code}"
    print(" RBAC: Employee blocked from HR/Admin employee directory with 403")

    # Employee cannot access Admin Controls
    r = client.get("/api/admin/users", headers=emp_headers)
    assert r.status_code == 403, f"Employee should not access /api/admin/users, got {r.status_code}"
    print(" RBAC: Employee blocked from Admin Controls with 403")

    # HR cannot access Admin Controls
    r = client.get("/api/admin/users", headers=hr_headers)
    assert r.status_code == 403, f"HR should not access /api/admin/users, got {r.status_code}"
    print(" RBAC: HR blocked from Admin Controls with 403")

    # Admin CAN access Admin Controls
    r = client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200, f"Admin failed to access /api/admin/users: {r.text}"
    admin_users = r.json()
    assert len(admin_users) >= 7
    print(f" Admin Controls: User directory OK ({len(admin_users)} users returned)")

    # Admin System Stats
    r = client.get("/api/admin/system-stats", headers=admin_headers)
    assert r.status_code == 200
    sys_stats = r.json()
    assert "role_distribution" in sys_stats
    print(f" Admin Controls: System security stats OK (Active: {sys_stats['active_users']}, Inactive: {sys_stats['deactivated_users']})")

    # 7. Attendance: Duplicate Check-In Prevention & Late Status
    # Suraj is already checked in for today in seed data
    r = client.post("/api/attendance/check-in", headers=emp_headers)
    assert r.status_code == 400, f"Multiple check-in should be rejected with 400, got {r.status_code}"
    print(" Attendance: Multiple check-ins per day prevented with 400 Bad Request")

    # Check today's punch for Suraj (Late check-in at 09:48)
    r = client.get("/api/attendance/today", headers=emp_headers)
    assert r.status_code == 200
    today_rec = r.json()
    assert today_rec is not None
    assert today_rec["is_late"] is True
    assert today_rec["late_minutes"] > 0
    print(f" Attendance: Late entry tracking OK (Marked late: {today_rec['is_late']}, {today_rec['late_minutes']} mins late)")

    # 8. Leave Policies & Balances
    r = client.get("/api/leaves/policies", headers=emp_headers)
    assert r.status_code == 200
    policies = r.json()
    assert len(policies) >= 3
    print(f" Leave Policies: Policies OK ({len(policies)} policies configured)")

    r = client.get("/api/leaves/balances", headers=emp_headers)
    assert r.status_code == 200
    balances = r.json()
    assert len(balances) >= 3
    print(f" Leave Balances: Balances OK ({len(balances)} leave types tracked for employee)")

    # Test Over-usage prevention: apply 50 days of leave
    r = client.post("/api/leaves", json={
        "leave_type": "CASUAL",
        "start_date": "2026-11-01",
        "end_date": "2026-12-20",
        "reason": "Exceeding available balance test"
    }, headers=emp_headers)
    assert r.status_code == 400, f"Over-usage should be prevented with 400, got {r.status_code}"
    print(" Leave Validation: Over-usage successfully prevented with 400 Bad Request")

    # 9. Payroll: Detailed Breakdown & Summary
    r = client.get("/api/payroll/summary", headers=admin_headers)
    assert r.status_code == 200
    summary = r.json()
    assert "total_net_disbursed" in summary
    assert "total_basic" in summary
    assert "total_allowances" in summary
    assert "total_deductions" in summary
    print(f" Payroll Summary: Monthly breakdown OK (Gross: Rs. {summary['total_gross_disbursed']:,}, Net: Rs. {summary['total_net_disbursed']:,})")

    r = client.get("/api/payroll", headers=emp_headers)
    assert r.status_code == 200
    emp_payslips = r.json()
    assert len(emp_payslips) > 0
    first_ps = emp_payslips[0]
    assert "hra" in first_ps
    assert "special_allowance" in first_ps
    assert "pf_deduction" in first_ps
    assert "tax_deduction" in first_ps
    print(f" Payroll Payslip Breakdown OK (Basic: Rs. {first_ps['basic_salary']:,}, HRA: Rs. {first_ps['hra']:,}, PF: Rs. {first_ps['pf_deduction']:,})")

    # 10. Dashboard & ESS Personal Stats
    r = client.get("/api/dashboard/stats", headers=emp_headers)
    assert r.status_code == 200
    dash = r.json()
    assert "personal_stats" in dash
    assert "leave_balances" in dash["personal_stats"]
    assert "today_punch" in dash["personal_stats"]
    print(f" ESS Portal: Personal telemetry & leave balances OK for employee dashboard")

    print("\n ALL PHASE 2 BACKEND MODULES VERIFIED & PASSING WITH FLYING COLORS!\n")

if __name__ == "__main__":
    run_tests()
