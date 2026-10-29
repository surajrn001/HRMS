const API_BASE = '/api';

function getAuthHeaders(isMultipart = false) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const isMultipart = options.body instanceof FormData;
  const headers = {
    ...getAuthHeaders(isMultipart),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Unauthorized: token might be expired
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-expired'));
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => request('/auth/me'),

  // Employees (Module 9 & Module 20: Advanced Search & Multi-Filters)
  getEmployees: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.department) searchParams.append('department', params.department);
    if (params.role) searchParams.append('role', params.role);
    if (params.status) searchParams.append('status', params.status);
    if (params.shift_id) searchParams.append('shift_id', params.shift_id);
    if (params.attendance_today) searchParams.append('attendance_today', params.attendance_today);
    if (params.min_rating) searchParams.append('min_rating', params.min_rating);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/employees${queryString}`);
  },

  getEmployee: (id) => request(`/employees/${id}`),

  createEmployee: (empData) =>
    request('/employees', {
      method: 'POST',
      body: JSON.stringify(empData),
    }),

  updateEmployee: (id, empData) =>
    request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(empData),
    }),

  deleteEmployee: (id) =>
    request(`/employees/${id}`, {
      method: 'DELETE',
    }),

  // Attendance (Module 10 & Module 14)
  getTodayAttendance: () => request('/attendance/today'),

  checkIn: () =>
    request('/attendance/check-in', {
      method: 'POST',
    }),

  checkOut: () =>
    request('/attendance/check-out', {
      method: 'POST',
    }),

  getAttendanceHistory: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.only_late) searchParams.append('only_late', 'true');
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/attendance/history${queryString}`);
  },

  logManualAttendance: (data) =>
    request('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  autoMarkAbsent: (targetDate) => {
    const query = targetDate ? `?target_date=${targetDate}` : '';
    return request(`/attendance/auto-mark-absent${query}`, {
      method: 'POST',
    });
  },

  // Shifts (Module 14: Shift Management)
  getShifts: () => request('/shifts'),

  createShift: (shiftData) =>
    request('/shifts', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    }),

  updateShift: (id, shiftData) =>
    request(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    }),

  deleteShift: (id) =>
    request(`/shifts/${id}`, {
      method: 'DELETE',
    }),

  getShiftAssignments: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params.shift_id) searchParams.append('shift_id', params.shift_id);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/shifts/assignments${queryString}`);
  },

  assignShift: (payload) =>
    request('/shifts/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyShift: () => request('/shifts/my-shift'),

  // Leaves & Balances (Module 11 & Module 15: Leave Calendar)
  getLeaves: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/leaves${queryString}`);
  },

  applyLeave: (leaveData) =>
    request('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    }),

  updateLeaveStatus: (leaveId, status) =>
    request(`/leaves/${leaveId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getLeavePolicies: () => request('/leaves/policies'),

  updateLeavePolicy: (policyData) =>
    request('/leaves/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    }),

  getLeaveBalances: (employeeId) => {
    const query = employeeId ? `?employee_id=${employeeId}` : '';
    return request(`/leaves/balances${query}`);
  },

  getLeaveCalendar: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.department) searchParams.append('department', params.department);
    if (params.month) searchParams.append('month', params.month);
    if (params.year) searchParams.append('year', params.year);
    if (params.status) searchParams.append('status', params.status);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/leaves/calendar${queryString}`);
  },

  checkLeaveConflicts: (employeeId, startDate, endDate) => {
    return request(`/leaves/conflicts?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`);
  },

  getTeamAvailability: (targetDate) => {
    const query = targetDate ? `?target_date=${targetDate}` : '';
    return request(`/leaves/team-availability${query}`);
  },

  // Document Management System (Module 16)
  getDocuments: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params.document_type) searchParams.append('document_type', params.document_type);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/documents${queryString}`);
  },

  uploadDocument: (formData) =>
    request('/documents/upload', {
      method: 'POST',
      body: formData,
    }),

  downloadDocumentUrl: (id) => `/api/documents/${id}/download`,

  deleteDocument: (id) =>
    request(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Performance Management (Module 17)
  getPerformanceReviews: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params.review_period) searchParams.append('review_period', params.review_period);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/performance${queryString}`);
  },

  createPerformanceReview: (data) =>
    request('/performance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePerformanceReview: (id, data) =>
    request(`/performance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePerformanceReview: (id) =>
    request(`/performance/${id}`, {
      method: 'DELETE',
    }),

  getPerformanceStats: () => request('/performance/stats'),

  // Advanced Analytics & Reports (Module 18)
  getAnalyticsOverview: (days = 7) => request(`/analytics/overview?days=${days}`),

  exportReport: async (reportType) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/analytics/export?report_type=${reportType}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok) throw new Error("Failed to export report");
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Payroll (Module 12)
  getPayrollList: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.month) searchParams.append('month', params.month);
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/payroll${queryString}`);
  },

  getPayrollItem: (id) => request(`/payroll/${id}`),

  getPayrollSummary: (month) => {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return request(`/payroll/summary${query}`);
  },

  generatePayroll: (payrollData) =>
    request('/payroll/generate', {
      method: 'POST',
      body: JSON.stringify(payrollData),
    }),

  // Dashboard & Analytics
  getDashboardStats: () => request('/dashboard/stats'),

  // Admin Controls (Module 13)
  getAdminUsers: () => request('/admin/users'),

  createAdminUser: (userData) =>
    request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUserRole: (userId, role) =>
    request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  toggleUserStatus: (userId, isActive) =>
    request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    }),

  resetUserPassword: (userId, newPassword) =>
    request(`/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    }),

  deleteUser: (userId) =>
    request(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  getAdminSystemStats: () => request('/admin/system-stats'),

  // Smart Notifications & Alerts (Module 19)
  getNotifications: (category = 'ALL') => {
    const query = category && category !== 'ALL' ? `?category=${category}` : '';
    return request(`/notifications${query}`);
  },

  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PUT',
    }),

  deleteNotification: (id) =>
    request(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  clearAllNotifications: () =>
    request('/notifications/clear/all', {
      method: 'DELETE',
    }),

  // --- Module 21: Employee Onboarding System ---
  getOnboarding: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params.status) searchParams.append('status_filter', params.status);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/onboarding${qs}`);
  },
  getOnboardingProgress: (employeeId) => {
    const qs = employeeId ? `?employee_id=${employeeId}` : '';
    return request(`/onboarding/progress${qs}`);
  },
  getOnboardingOverview: () => request('/onboarding/overview'),
  createOnboardingTask: (taskData) =>
    request('/onboarding', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),
  assignDefaultOnboarding: (employeeId) =>
    request(`/onboarding/assign-defaults/${employeeId}`, {
      method: 'POST',
    }),
  updateOnboardingStatus: (taskId, status) =>
    request(`/onboarding/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteOnboardingTask: (taskId) =>
    request(`/onboarding/${taskId}`, {
      method: 'DELETE',
    }),

  // --- Module 22: Resignation & Exit Management ---
  getResignations: (statusFilter) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : '';
    return request(`/resignations${qs}`);
  },
  getResignation: (id) => request(`/resignations/${id}`),
  submitResignation: (data) =>
    request('/resignations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResignationStatus: (id, status) =>
    request(`/resignations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // --- Module 23: Internal Announcements System ---
  getAnnouncements: (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/announcements${qs}`);
  },
  getAnnouncement: (id) => request(`/announcements/${id}`),
  createAnnouncement: (data) =>
    request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAnnouncement: (id) =>
    request(`/announcements/${id}`, {
      method: 'DELETE',
    }),

  // --- Module 24: Task Assignment & Tracking ---
  getTasks: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.assigned_to) searchParams.append('assigned_to', params.assigned_to);
    if (params.status) searchParams.append('status_filter', params.status);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/tasks${qs}`);
  },
  getTaskStats: (assignedTo) => {
    const qs = assignedTo ? `?assigned_to=${assignedTo}` : '';
    return request(`/tasks/stats${qs}`);
  },
  createTask: (data) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTaskStatus: (taskId, status) =>
    request(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // --- Module 25: Third-Party Integrations ---
  sendTestEmail: (data) =>
    request('/integrations/email/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEmailLogs: () => request('/integrations/email/logs'),
  getGoogleCalendarLink: (title, startTime, endTime, dateStr) => {
    const p = new URLSearchParams({ title, start_time: startTime, end_time: endTime });
    if (dateStr) p.append('event_date', dateStr);
    return request(`/integrations/calendar/google-link?${p.toString()}`);
  },
  getCalendarIcsUrl: () => {
    const token = localStorage.getItem('token');
    return `${API_BASE}/integrations/calendar/ics${token ? `?token=${token}` : ''}`;
  },
  downloadCalendarIcs: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/integrations/calendar/ics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to download calendar .ics feed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worksphere_schedule.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  downloadExportCsv: async (reportType) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/integrations/export/csv?report_type=${reportType}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to export ${reportType} report`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worksphere_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // --- Module 26: Employee Feedback System ---
  getFeedback: () => request('/feedback'),
  getFeedbackSummary: () => request('/feedback/summary'),
  submitFeedback: (data) =>
    request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // --- Module 27: Profile & Settings Management ---
  getProfile: () => request('/profile'),
  updateProfile: (data) =>
    request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data) =>
    request('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getUserSettings: () => request('/profile/settings'),
  updateUserSettings: (data) =>
    request('/profile/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
