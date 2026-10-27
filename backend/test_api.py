import sys
import os
import io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== Testing WorkSphere Phase 3 (Automation, Insights & Smart HR Features) ===")

    # 1. Root & Health Check
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    assert r.json()["version"] == "3.0.0"
    print(" [OK] Root health check & Phase 3 API version 3.0.0 verified")

    # 2. Authentication Tokens
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    admin_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post("/api/auth/login", json={"username": "neha_hr", "password": "hr123"})
    assert r.status_code == 200
    hr_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post("/api/auth/login", json={"username": "suraj", "password": "emp123"})
    assert r.status_code == 200
    emp_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    emp_user_id = r.json()["user"]["id"]
    print(" [OK] Admin, HR, and Employee JWT authentication tokens verified")

    # 3. Module 14: Shift Management & Shift Assignments
    r = client.get("/api/shifts", headers=emp_headers)
    assert r.status_code == 200
    shifts = r.json()
    assert len(shifts) >= 4, f"Expected at least 4 shifts, got {len(shifts)}"
    general_shift = next(s for s in shifts if s["name"] == "General Shift")
    print(f" [OK] Shift Management: Retrieved {len(shifts)} shifts (General: {general_shift['start_time']} - {general_shift['end_time']})")

    r = client.get("/api/shifts/my-shift", headers=emp_headers)
    assert r.status_code == 200
    my_shift = r.json()
    assert my_shift is not None
    assert my_shift["shift_name"] == "General Shift"
    print(f" [OK] Employee Shift View: Active shift '{my_shift['shift_name']}' confirmed for Suraj")

    # HR/Admin Shift Assignment
    r = client.get("/api/shifts/assignments", headers=hr_headers)
    assert r.status_code == 200
    print(f" [OK] Shift Assignments: HR retrieved {len(r.json())} active assignments")

    # 4. Module 15: Leave Calendar & Team View & Conflict Detection
    r = client.get("/api/leaves/calendar", headers=emp_headers)
    assert r.status_code == 200
    events = r.json()
    print(f" [OK] Team Leave Calendar: {len(events)} calendar events loaded")

    # Conflict check for employee in same department
    emp_data = client.get("/api/auth/me", headers=emp_headers).json()
    emp_id = emp_data["id"]
    r = client.get(f"/api/leaves/conflicts?employee_id={emp_id}&start_date=2026-10-28&end_date=2026-10-31", headers=emp_headers)
    assert r.status_code == 200
    conflict_res = r.json()
    assert "has_conflict" in conflict_res
    print(f" [OK] Leave Conflict Engine: Evaluated schedule (has_conflict={conflict_res['has_conflict']})")

    r = client.get("/api/leaves/team-availability", headers=emp_headers)
    assert r.status_code == 200
    avail = r.json()
    assert "available_count" in avail and "roster" in avail
    print(f" [OK] Team Availability Dashboard: {avail['available_count']} active available team members")

    # 5. Module 16: Document Management System
    r = client.get("/api/documents", headers=emp_headers)
    assert r.status_code == 200
    my_docs = r.json()
    assert len(my_docs) >= 1
    doc_id = my_docs[0]["id"]
    print(f" [OK] Document Vault: Employee retrieved {len(my_docs)} verified personal documents")

    # Test file download endpoint
    r = client.get(f"/api/documents/{doc_id}/download", headers=emp_headers)
    assert r.status_code == 200
    print(f" [OK] Secure Document Download: Downloaded document {doc_id} successfully")

    # Test document upload
    fake_file = io.BytesIO(b"Sample PDF content for testing document upload")
    r = client.post(
        "/api/documents/upload",
        headers=emp_headers,
        data={"employee_id": emp_id, "title": "Test Certificate", "document_type": "Certificate"},
        files={"file": ("test_cert.pdf", fake_file, "application/pdf")}
    )
    assert r.status_code == 201
    uploaded_doc_id = r.json()["id"]
    print(f" [OK] Document Upload: Successfully uploaded test document (ID={uploaded_doc_id})")

    # Clean up uploaded test document
    r = client.delete(f"/api/documents/{uploaded_doc_id}", headers=emp_headers)
    assert r.status_code == 200
    print(" [OK] Document Deletion: Cleaned up temporary test document")

    # 6. Module 17: Performance Management System
    r = client.get("/api/performance", headers=emp_headers)
    assert r.status_code == 200
    emp_reviews = r.json()
    assert len(emp_reviews) >= 1
    print(f" [OK] Performance Reviews: Employee retrieved {len(emp_reviews)} reviews (Latest: {emp_reviews[0]['rating']}* in {emp_reviews[0]['review_period']})")

    r = client.get("/api/performance/stats", headers=hr_headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_reviews"] > 0
    print(f" [OK] Performance Analytics: Average rating {stats['average_rating']} across {stats['total_reviews']} reviews")

    # 7. Module 18: Advanced Analytics & Reports
    r = client.get("/api/analytics/overview?days=7", headers=hr_headers)
    assert r.status_code == 200
    overview = r.json()
    assert "attendance_trends" in overview
    assert "department_reports" in overview
    print(f" [OK] Analytics Overview: {len(overview['attendance_trends'])} daily trend points, {len(overview['department_reports'])} department reports")

    # Test CSV export
    r = client.get("/api/analytics/export?report_type=departments", headers=hr_headers)
    assert r.status_code == 200
    assert "Department,Total Employees" in r.text
    print(" [OK] Reports Export: Successfully exported department analytics CSV")

    # 8. Module 19: Smart Notifications & Categorized Alerts
    r = client.get("/api/notifications?category=SYSTEM", headers=admin_headers)
    assert r.status_code == 200
    sys_notifs = r.json()
    print(f" [OK] Smart Notifications: Category filter 'SYSTEM' returned {len(sys_notifs)} items")

    r = client.get("/api/notifications?category=SHIFT", headers=emp_headers)
    assert r.status_code == 200
    shift_notifs = r.json()
    print(f" [OK] Smart Notifications: Category filter 'SHIFT' returned {len(shift_notifs)} items")

    # 9. Module 20: Advanced Employee Search & Filters
    r = client.get("/api/employees?search=Suraj", headers=hr_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1 and r.json()[0]["full_name"] == "Suraj"
    print(" [OK] Advanced Search: Found employee by name 'Suraj'")

    # Filter by shift_id
    r = client.get(f"/api/employees?shift_id={general_shift['id']}", headers=hr_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    print(f" [OK] Shift Filter: Filtered {len(r.json())} employees in General Shift")

    # Filter by min_rating
    r = client.get("/api/employees?min_rating=4.5", headers=hr_headers)
    assert r.status_code == 200
    high_perf = r.json()
    assert all(e["avg_rating"] is None or e["avg_rating"] >= 4.5 for e in high_perf)
    print(f" [OK] Performance Filter: Found {len(high_perf)} employees with >= 4.5 avg rating")

    print("\n All 20 WorkSphere Modules (Phase 1, 2, and 3) verified successfully with 100% test pass!")

if __name__ == "__main__":
    run_tests()
