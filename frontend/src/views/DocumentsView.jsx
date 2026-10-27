import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const DOC_TYPES = [
  'All Types',
  'Identity Document',
  'Offer Letter',
  'Academic',
  'Certificate',
  'Tax & Statutory',
  'General',
];

export default function DocumentsView({ user }) {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    employee_id: user?.employee?.id || '',
    title: '',
    document_type: 'Identity Document',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'HR';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedType !== 'All Types') {
        params.document_type = selectedType;
      }
      if (isPrivileged && selectedEmployeeId) {
        params.employee_id = selectedEmployeeId;
      }

      const docs = await api.getDocuments(params);
      setDocuments(docs || []);

      if (isPrivileged) {
        const emps = await api.getEmployees();
        setEmployees(emps || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType, selectedEmployeeId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      setError('Please select a document file to upload');
      return;
    }

    const empId = isPrivileged ? uploadData.employee_id : user?.employee?.id;
    if (!empId) {
      setError('Employee profile association missing');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('employee_id', empId);
      formData.append('title', uploadData.title);
      formData.append('document_type', uploadData.document_type);

      await api.uploadDocument(formData);
      setSuccess('Document successfully uploaded and encrypted in vault');
      setShowUploadModal(false);
      setUploadData({
        employee_id: user?.employee?.id || '',
        title: '',
        document_type: 'Identity Document',
        file: null,
      });
      loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteDocument(docId);
      setSuccess(`Document "${title}" removed from repository`);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${docId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('File download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message || 'Could not download file');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Document Management System
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {isPrivileged
              ? 'Centralized secure vault for verified employee records, credentials, and contracts.'
              : 'Securely access and submit your verified employment records, certificates, and ID proofs.'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          Upload Document
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius)', color: '#059669', fontSize: '14px' }}>
          {success}
        </div>
      )}

      {/* Filter Controls */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Category:</span>
          {DOC_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                background: selectedType === type ? 'var(--primary)' : 'var(--surface-muted)',
                color: selectedType === type ? '#ffffff' : 'var(--text-main)',
                border: '1px solid ' + (selectedType === type ? 'var(--primary)' : 'var(--border)'),
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {isPrivileged && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Employee:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: '#ffffff',
                fontSize: '13px',
                color: 'var(--text-main)',
              }}
            >
              <option value="">All Team Members</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.department})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading document repository...
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
            No documents found
          </div>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            There are no verified documents matching the current filter criteria. Click "Upload Document" to add files.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--primary)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {doc.document_type}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatSize(doc.file_size)}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  {doc.title}
                </h3>

                {isPrivileged && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Owner: <strong style={{ color: 'var(--text-main)' }}>{doc.employee_name}</strong>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  File: {doc.file_name} • Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⬇</span> Download
                </button>

                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '6px',
                  }}
                  title="Remove document"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg, 12px)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                Upload New Document
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isPrivileged && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Select Employee <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={uploadData.employee_id}
                    onChange={(e) => setUploadData({ ...uploadData, employee_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  >
                    <option value="">Choose Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Document Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Aadhaar Card Copy, Degree Certificate"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Document Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={uploadData.document_type}
                  onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    background: '#fff',
                  }}
                >
                  {DOC_TYPES.filter((t) => t !== 'All Types').map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Select File <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius)',
                    border: '1px dashed var(--border)',
                    fontSize: '13px',
                    background: 'var(--surface-muted)',
                  }}
                />
                {uploadData.file && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Selected: {uploadData.file.name} ({formatSize(uploadData.file.size)})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    padding: '9px 16px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
