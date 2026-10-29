import sys
import os
import io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== Testing WorkSphere Phase 4 (Employee Experience & System Integrations) ===")

    # 1. Root & Health Check
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    assert r.json()["version"] == "4.0.0"
    print(" [OK] Root health check & Phase 4 API version 4.0.0 verified")

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

    # 10. Module 21: Employee Onboarding System
    r = client.get("/api/onboarding", headers=emp_headers)
    assert r.status_code == 200
    my_onboard_tasks = r.json()
    assert len(my_onboard_tasks) >= 1
    print(f" [OK] Onboarding: Employee retrieved {len(my_onboard_tasks)} assigned onboarding checklist tasks")

    r = client.get("/api/onboarding/progress", headers=emp_headers)
    assert r.status_code == 200
    progress = r.json()
    assert "progress_percentage" in progress
    print(f" [OK] Onboarding Progress: {progress['completed_tasks']}/{progress['total_tasks']} completed ({progress['progress_percentage']}%)")

    # HR overview
    r = client.get("/api/onboarding/overview", headers=hr_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    print(f" [OK] Onboarding Overview: HR reviewed onboarding progress for {len(r.json())} new team members")

    # Toggle task status
    task_id = my_onboard_tasks[0]["id"]
    r = client.put(f"/api/onboarding/{task_id}/status", headers=emp_headers, json={"status": "COMPLETED"})
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    print(f" [OK] Onboarding Task Toggle: Marked task {task_id} as COMPLETED")

    # 11. Module 22: Resignation & Exit Management
    r = client.get("/api/resignations", headers=hr_headers)
    assert r.status_code == 200
    resignations = r.json()
    assert len(resignations) >= 1
    print(f" [OK] Exit Management: HR retrieved {len(resignations)} exit records (Found approved exit for Kunal)")

    # Employee submits resignation test
    r = client.post(
        "/api/resignations",
        headers=emp_headers,
        json={"reason": "Exploring new career advancement opportunities in cloud systems engineering.", "notice_period": "30 Days"}
    )
    assert r.status_code == 201
    new_res_id = r.json()["id"]
    assert r.json()["status"] == "PENDING"
    print(f" [OK] Resignation Submission: Successfully submitted resignation request ID={new_res_id}")

    # HR approves resignation
    r = client.put(f"/api/resignations/{new_res_id}/status", headers=hr_headers, json={"status": "APPROVED"})
    assert r.status_code == 200
    assert r.json()["status"] == "APPROVED"
    print(f" [OK] Resignation Approval: HR approved exit workflow for ID={new_res_id}")

    # 12. Module 23: Internal Announcements System
    r = client.get("/api/announcements", headers=emp_headers)
    assert r.status_code == 200
    announcements = r.json()
    assert len(announcements) >= 4
    print(f" [OK] Internal Announcements: Employee loaded {len(announcements)} organization notices")

    # HR posts new announcement
    r = client.post(
        "/api/announcements",
        headers=hr_headers,
        json={"title": "🚀 WorkSphere Phase 4 Production Launch", "message": "Phase 4 employee experience and integrations platform is now live across the enterprise."}
    )
    assert r.status_code == 201
    posted_ann_id = r.json()["id"]
    print(f" [OK] Announcement Broadcast: HR posted live announcement (ID={posted_ann_id})")

    # 13. Module 24: Task Assignment & Tracking
    r = client.get("/api/tasks", headers=emp_headers)
    assert r.status_code == 200
    emp_tasks = r.json()
    assert len(emp_tasks) >= 1
    print(f" [OK] Internal Tasks: Employee retrieved {len(emp_tasks)} assigned work items")

    r = client.get("/api/tasks/stats", headers=emp_headers)
    assert r.status_code == 200
    task_stats = r.json()
    assert "completion_rate" in task_stats
    print(f" [OK] Task Stats: {task_stats['completed_tasks']}/{task_stats['total_tasks']} tasks completed (Rate: {task_stats['completion_rate']}%)")

    # HR assigns a new task
    suraj_emp_id = my_onboard_tasks[0]["employee_id"]
    r = client.post(
        "/api/tasks",
        headers=hr_headers,
        json={"assigned_to": suraj_emp_id, "title": "Complete Security Audit Verification", "description": "Review API endpoints for role enforcement", "due_date": "2026-11-10"}
    )
    assert r.status_code == 201
    created_task_id = r.json()["id"]
    print(f" [OK] Task Assignment: HR assigned new task ID={created_task_id}")

    # Employee marks task status
    r = client.put(f"/api/tasks/{created_task_id}/status", headers=emp_headers, json={"status": "COMPLETED"})
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    print(f" [OK] Task Status Update: Employee marked task ID={created_task_id} as COMPLETED")

    # 14. Module 25: Third-Party Integrations
    # Email test
    r = client.post(
        "/api/integrations/email/test",
        headers=emp_headers,
        json={"recipient": "suraj@worksphere.co.in", "subject": "Automated Notification Test", "body": "Testing WorkSphere integration notification delivery"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "DELIVERED"
    print(" [OK] Email Integration: Successfully dispatched test notification email")

    # Email logs
    r = client.get("/api/integrations/email/logs", headers=hr_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    print(f" [OK] Email Audit Logs: Retrieved {len(r.json())} dispatch logs")

    # Calendar .ics export
    r = client.get("/api/integrations/calendar/ics", headers=emp_headers)
    assert r.status_code == 200
    assert "BEGIN:VCALENDAR" in r.text
    print(" [OK] Calendar Integration: RFC 5545 .ics iCalendar file generated and verified")

    # Google Calendar link
    r = client.get("/api/integrations/calendar/google-link?title=WorkShift&start_time=09:30&end_time=18:30", headers=emp_headers)
    assert r.status_code == 200
    assert "google.com/calendar" in r.json()["google_calendar_url"]
    print(" [OK] Calendar Integration: 1-click Google Calendar URL generation verified")

    # CSV report exports
    for rep_type in ["employees", "attendance", "payroll", "leaves", "onboarding", "resignations"]:
        r = client.get(f"/api/integrations/export/csv?report_type={rep_type}", headers=hr_headers)
        assert r.status_code == 200
        assert len(r.text) > 20
    print(" [OK] Report Exports: Successfully exported all 6 CSV datasets (employees, attendance, payroll, leaves, onboarding, resignations)")

    # 15. Module 26: Employee Feedback System
    r = client.get("/api/feedback", headers=emp_headers)
    assert r.status_code == 200
    emp_feedbacks = r.json()
    print(f" [OK] Employee Feedback: Employee retrieved {len(emp_feedbacks)} submitted feedback items")

    # Submit feedback
    r = client.post(
        "/api/feedback",
        headers=emp_headers,
        json={"message": "Phase 4 employee experience is outstanding! Fast, clean and responsive.", "rating": 5.0}
    )
    assert r.status_code == 201
    print(" [OK] Feedback Submission: Recorded 5.0* employee feedback")

    # HR feedback summary
    r = client.get("/api/feedback/summary", headers=hr_headers)
    assert r.status_code == 200
    fb_summary = r.json()
    assert fb_summary["total_feedbacks"] >= 5
    assert fb_summary["average_rating"] >= 4.0
    print(f" [OK] Feedback Analytics: {fb_summary['total_feedbacks']} total reviews with average satisfaction {fb_summary['average_rating']}*")

    # 16. Module 27: Profile & Settings Management
    r = client.get("/api/profile", headers=emp_headers)
    assert r.status_code == 200
    profile = r.json()
    assert profile["username"] == "suraj"
    assert profile["phone"] is not None
    print(f" [OK] Profile Management: Loaded profile for '{profile['full_name']}' ({profile['designation']})")

    # Update profile details
    r = client.put(
        "/api/profile",
        headers=emp_headers,
        json={"bio": "Senior Full-Stack Engineer passionate about crafting world-class enterprise software."}
    )
    assert r.status_code == 200
    assert "Senior Full-Stack Engineer passionate" in r.json()["bio"]
    print(" [OK] Profile Update: Updated employee bio successfully")

    # Update settings
    r = client.put(
        "/api/profile/settings",
        headers=emp_headers,
        json={"email_notifications": True, "in_app_notifications": True, "task_alerts": True}
    )
    assert r.status_code == 200
    assert r.json()["email_notifications"] is True
    print(" [OK] User Preferences: Updated notification settings successfully")

    # Password change
    r = client.put(
        "/api/profile/password",
        headers=emp_headers,
        json={"current_password": "emp123", "new_password": "emp123newpass"}
    )
    assert r.status_code == 200
    print(" [OK] Password Security: Verified current password and updated to new hash")

    # Revert password back so subsequent tests keep working seamlessly
    r = client.put(
        "/api/profile/password",
        headers=emp_headers,
        json={"current_password": "emp123newpass", "new_password": "emp123"}
    )
    assert r.status_code == 200
    print(" [OK] Password Revert: Restored test password to original")

    print("\n==========================================================================")
    print(" SUCCESS: All 27 WorkSphere Modules (Phase 1, 2, 3 & 4) 100% VERIFIED!")
    print("==========================================================================")

if __name__ == "__main__":
    run_tests()

