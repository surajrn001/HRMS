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
};
