// frontend/src/services/api.js

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Course API
export const courseAPI = {
  // Get all courses
  getAllCourses: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/courses?${queryString}`);
  },

  // Get course by ID
  getCourseById: (id) => {
    return apiCall(`/courses/${id}`);
  },

  // Search courses
  searchCourses: (query, page = 1, limit = 10) => {
    return apiCall(`/courses/search?q=${query}&page=${page}&limit=${limit}`);
  },

  // Get my courses
  getMyCourses: () => {
    return apiCall('/courses/my/courses');
  },

  // Enroll in course
  enrollCourse: (courseId) => {
    return apiCall(`/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },

  // Get course lessons
  getCourseLessons: (courseId) => {
    return apiCall(`/courses/${courseId}/lessons`);
  },
};

// Auth API
export const authAPI = {
  // Register
  register: (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login
  login: (credentials) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Get current user
  getCurrentUser: () => {
    return apiCall('/auth/me');
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve();
  },
};

// Home API
export const homeAPI = {
  getDashboardData: () => {
    return apiCall('/home/dashboard');
  },
};

// Enrollment API
export const enrollmentAPI = {
  getMyEnrollments: (status) => {
    const query = status ? `?status=${status}` : '';
    return apiCall(`/enrollments/my-enrollments${query}`);
  },

  updateProgress: (enrollmentId, progress) => {
    return apiCall(`/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  },

  completeLesson: (enrollmentId, lessonId) => {
    return apiCall(`/enrollments/${enrollmentId}/complete-lesson`, {
      method: 'POST',
      body: JSON.stringify({ lessonId }),
    });
  },
};

// Notification API
export const notificationAPI = {
  getAllNotifications: (page = 1, limit = 20) => {
    return apiCall(`/notifications?page=${page}&limit=${limit}`);
  },

  getUnreadCount: () => {
    return apiCall('/notifications/unread-count');
  },

  markAsRead: (notificationId) => {
    return apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  markAllAsRead: () => {
    return apiCall('/notifications/mark-all-read', {
      method: 'PUT',
    });
  },
};

// Schedule API
export const scheduleAPI = {
  getMySchedule: () => {
    return apiCall('/schedules/my-schedule');
  },

  getUpcomingSchedules: (limit = 10) => {
    return apiCall(`/schedules/upcoming?limit=${limit}`);
  },
};