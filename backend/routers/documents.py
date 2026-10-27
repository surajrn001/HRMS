import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[schemas.DocumentOut])
def list_documents(
    employee_id: Optional[int] = None,
    document_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Document).join(models.Employee)

    # RBAC: Employees can only view their own documents
    if current_user.role.value == "EMPLOYEE":
        if not current_user.employee:
            return []
        query = query.filter(models.Document.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(models.Document.employee_id == employee_id)

    if document_type:
        query = query.filter(models.Document.document_type == document_type)

    docs = query.order_by(models.Document.uploaded_at.desc()).all()
    results = []
    for d in docs:
        results.append(schemas.DocumentOut(
            id=d.id,
            employee_id=d.employee_id,
            employee_name=d.employee.full_name if d.employee else None,
            title=d.title,
            document_type=d.document_type,
            file_name=d.file_name,
            file_url=f"/api/documents/{d.id}/download",
            file_size=d.file_size,
            uploaded_at=d.uploaded_at
        ))
    return results

@router.post("/upload", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    employee_id: int = Form(...),
    title: str = Form(...),
    document_type: str = Form("General"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # RBAC: Employees can only upload documents for themselves
    if current_user.role.value == "EMPLOYEE":
        if not current_user.employee or current_user.employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Employees can only upload documents for their own profile")

    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Secure filename creation
    file_ext = os.path.splitext(file.filename)[1]
    safe_stored_name = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_stored_name)

    content = await file.read()
    file_size = len(content)

    with open(file_path, "wb") as f:
        f.write(content)

    doc = models.Document(
        employee_id=emp.id,
        title=title,
        document_type=document_type,
        file_name=file.filename,
        file_url=safe_stored_name,
        file_size=file_size
    )
    db.add(doc)

    # Notification
    if current_user.role.value in ["ADMIN", "HR"] and emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title="New Document Uploaded",
            message=f"A new document '{title}' ({document_type}) was added to your profile by HR.",
            category="DOCUMENT"
        )
        db.add(notif)
    elif current_user.role.value == "EMPLOYEE":
        # Alert admin/HR users
        admin_users = db.query(models.User).filter(models.User.role.in_([models.UserRole.ADMIN, models.UserRole.HR])).all()
        for u in admin_users:
            notif = models.Notification(
                user_id=u.id,
                title="Employee Document Uploaded",
                message=f"{emp.full_name} submitted a new document '{title}' ({document_type}).",
                category="DOCUMENT"
            )
            db.add(notif)

    db.commit()
    db.refresh(doc)

    return schemas.DocumentOut(
        id=doc.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        title=doc.title,
        document_type=doc.document_type,
        file_name=doc.file_name,
        file_url=f"/api/documents/{doc.id}/download",
        file_size=doc.file_size,
        uploaded_at=doc.uploaded_at
    )

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # RBAC check
    if current_user.role.value == "EMPLOYEE":
        if not current_user.employee or current_user.employee.id != doc.employee_id:
            raise HTTPException(status_code=403, detail="Access denied to this document")

    file_path = os.path.join(UPLOAD_DIR, doc.file_url)
    if not os.path.exists(file_path):
        # Fallback if mock file or file missing
        raise HTTPException(status_code=404, detail="Physical document file not found on server")

    return FileResponse(
        path=file_path,
        filename=doc.file_name,
        media_type="application/octet-stream"
    )

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # RBAC check
    if current_user.role.value == "EMPLOYEE":
        if not current_user.employee or current_user.employee.id != doc.employee_id:
            raise HTTPException(status_code=403, detail="Permission denied")

    # Remove file
    file_path = os.path.join(UPLOAD_DIR, doc.file_url)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
