/**
 * API Service Layer
 * Handles all HTTP requests to the backend
 */
import { API_BASE_URL, BACKEND_ORIGIN } from '../config/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============= Books API =============

export const booksAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/books?${queryParams}`);
    },

    getById: (id) => fetchAPI(`/books/${id}`),

    getByISBN: (isbn) => fetchAPI(`/books/isbn/${isbn}`),

    create: (bookData) => fetchAPI('/books', {
        method: 'POST',
        body: JSON.stringify(bookData),
    }),

    update: (id, bookData) => fetchAPI(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bookData),
    }),

    delete: (id) => fetchAPI(`/books/${id}`, {
        method: 'DELETE',
    }),
};

// ============= Members API =============

export const membersAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/members?${queryParams}`);
    },

    getById: (id) => fetchAPI(`/members/${id}`),

    getByCardId: (cardId) => fetchAPI(`/members/card/${cardId}`),

    create: (memberData) => fetchAPI('/members', {
        method: 'POST',
        body: JSON.stringify(memberData),
    }),

    update: (id, memberData) => fetchAPI(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(memberData),
    }),

    delete: (id) => fetchAPI(`/members/${id}`, {
        method: 'DELETE',
    }),
};

// ============= Circulation API =============

export const circulationAPI = {
    checkout: (transactionData) => fetchAPI('/circulation/checkout', {
        method: 'POST',
        body: JSON.stringify(transactionData),
    }),

    checkin: (transactionId, returnData) => fetchAPI(`/circulation/checkin/${transactionId}`, {
        method: 'POST',
        body: JSON.stringify(returnData),
    }),

    getActive: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/circulation/active?${queryParams}`);
    },

    getOverdue: () => fetchAPI('/circulation/overdue'),

    getMemberTransactions: (memberId) => fetchAPI(`/circulation/member/${memberId}`),
};

// ============= Dashboard API =============

export const dashboardAPI = {
    getStats: () => fetchAPI('/dashboard/stats'),
};

// ============= Reports API =============

export const reportsAPI = {
    getActivityLogs: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/activity-logs?${queryParams}`);
    },

    getCirculationStats: () => fetchAPI('/reports/circulation-stats'),

    getPopularBooks: (limit = 10) => fetchAPI(`/reports/popular-books?limit=${limit}`),

    getCategoryDistribution: () => fetchAPI('/reports/category-distribution'),

    getMemberStats: () => fetchAPI('/reports/member-stats'),

    getFineReport: () => fetchAPI('/reports/fines'),

    getMonthlyTrend: () => fetchAPI('/reports/monthly-trend'),
};

// ============= Audit Trail API =============

export const auditAPI = {
    getBookAudit: (bookId, limit = 100) => fetchAPI(`/audit/books/${bookId}?limit=${limit}`),

    getAllAudits: (limit = 100, offset = 0) => fetchAPI(`/audit/all?limit=${limit}&offset=${offset}`),

    getAuditsByAction: (action, limit = 100) => fetchAPI(`/audit/action/${action}?limit=${limit}`),
};

// ============= Health Check =============

export const healthAPI = {
    check: () => fetch(`${BACKEND_ORIGIN}/health`).then(r => r.json()),
};

// ============= Authentication API =============

export const authAPI = {
    signup: (userData) => fetchAPI('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    login: (credentials) => fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    getCurrentUser: () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('Not authenticated');
        }
        return fetchAPI('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    },
};

export default {
    books: booksAPI,
    members: membersAPI,
    circulation: circulationAPI,
    dashboard: dashboardAPI,
    reports: reportsAPI,
    audit: auditAPI,
    health: healthAPI,
    auth: authAPI,
};
