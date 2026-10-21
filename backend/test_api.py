import sys
sys.path.insert(0, 'backend')
from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== Testing WorkSphere HRMS (India Hub) API ===")

    # 1. Root
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print(" Root health check OK")

    # 2. Login as Admin Rajesh Sharma
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(" Admin (Rajesh Sharma) login successful (JWT received)")

    # 3. Login as Employee Suraj
    r = client.post("/api/auth/login", json={"username": "suraj", "password": "emp123"})
    assert r.status_code == 200, f"Employee login failed: {r.text}"
    emp_token = r.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    print(" Employee (Suraj) login successful")

    # 4. Login as HR Neha Kulkarni
    r = client.post("/api/auth/login", json={"username": "neha_hr", "password": "hr123"})
    assert r.status_code == 200, f"HR login failed: {r.text}"
    hr_token = r.json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_token}"}
    print(" HR (Neha Kulkarni) login successful")

    # 5. List Employees
    r = client.get("/api/employees", headers=admin_headers)
    assert r.status_code == 200, f"List employees failed: {r.text}"
    employees = r.json()
    assert len(employees) >= 5, f"Expected at least 5 employees, got {len(employees)}"
    print(f" Employees list OK ({len(employees)} employees returned)")

    # 6. Dashboard Stats
    r = client.get("/api/dashboard/stats", headers=admin_headers)
    assert r.status_code == 200, f"Dashboard stats failed: {r.text}"
    stats = r.json()
    assert "total_employees" in stats
    assert "attendance_summary" in stats
    assert "leave_stats" in stats
    assert "payroll_overview" in stats
    print(f" Dashboard stats OK: {stats['total_employees']} employees, {stats['payroll_overview']['records_count']} payroll records")

    # 7. Attendance History
    r = client.get("/api/attendance/history", headers=emp_headers)
    assert r.status_code == 200, f"Attendance history failed: {r.text}"
    print(f" Attendance history OK ({len(r.json())} entries for Suraj)")

    # 8. Leaves list
    r = client.get("/api/leaves", headers=admin_headers)
    assert r.status_code == 200, f"Leaves list failed: {r.text}"
    leaves = r.json()
    assert len(leaves) > 0, "No leaves found"
    print(f" Leaves list OK ({len(leaves)} requests found)")

    # 9. Payroll list
    r = client.get("/api/payroll", headers=admin_headers)
    assert r.status_code == 200, f"Payroll list failed: {r.text}"
    payrolls = r.json()
    assert len(payrolls) > 0, "No payroll records found"
    print(f" Payroll list OK ({len(payrolls)} payroll records found)")

    # 10. Notifications
    r = client.get("/api/notifications", headers=emp_headers)
    assert r.status_code == 200, f"Notifications failed: {r.text}"
    print(f" Notifications OK ({len(r.json())} notifications for Suraj)")

    print("\n ALL TESTS PASSED! Indian HRMS setup verified successfully.\n")

if __name__ == "__main__":
    run_tests()
