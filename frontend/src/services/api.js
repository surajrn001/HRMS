const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
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

  // Employees
  getEmployees: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.department) searchParams.append('department', params.department);
    if (params.status) searchParams.append('status', params.status);
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

  // Attendance
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

  // Leaves & Balances
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

  // Payroll
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

  // Notifications
  getNotifications: () => request('/notifications'),

  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PUT',
    }),
};
