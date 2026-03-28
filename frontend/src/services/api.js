/**
 * API Service Layer
 * Handles all HTTP requests to the backend
 */
import { API_BASE_URL, BACKEND_ORIGIN } from '../config/api';
import { getAuthToken, getSupabaseSessionToken } from './authStore';

/**
 * Generic fetch wrapper with error handling.
 * Pass `adminToken` in options.headers or rely on the global supabase session.
 */
async function fetchAPI(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const config = {
        ...options,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const body = await response.json().catch(() => ({ detail: 'Request failed' }));
            const err = new Error(body.detail || 'API request failed');
            err.status = response.status;
            throw err;
        }

        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

const toBearerHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});
const getMemberAuthHeaders = () => toBearerHeader(getAuthToken() || getSupabaseSessionToken());
const getAdminAuthHeaders = () => toBearerHeader(getSupabaseSessionToken() || getAuthToken());

// ============= Books API =============

export const booksAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/books?${queryParams}`);
    },
    getById:    (id) => fetchAPI(`/books/${id}`),
    getByISBN:  (isbn) => fetchAPI(`/books/isbn/${isbn}`),
    create: (bookData) => fetchAPI('/books', {
        method: 'POST', body: JSON.stringify(bookData),
        headers: getAdminAuthHeaders(),
    }),
    update: (id, bookData) => fetchAPI(`/books/${id}`, {
        method: 'PUT', body: JSON.stringify(bookData),
        headers: getAdminAuthHeaders(),
    }),
    delete: (id) => fetchAPI(`/books/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

// ============= Members API =============

export const membersAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/members?${queryParams}`, { headers: getMemberAuthHeaders() });
    },
    getById:    (id) => fetchAPI(`/members/${id}`, { headers: getMemberAuthHeaders() }),
    getByCardId:(cardId) => fetchAPI(`/members/card/${cardId}`, { headers: getMemberAuthHeaders() }),
    create: (memberData) => fetchAPI('/members', {
        method: 'POST', body: JSON.stringify(memberData),
        headers: getMemberAuthHeaders(),
    }),
    update: (id, memberData) => fetchAPI(`/members/${id}`, {
        method: 'PUT', body: JSON.stringify(memberData),
        headers: getMemberAuthHeaders(),
    }),
    delete: (id) => fetchAPI(`/members/${id}`, {
        method: 'DELETE',
        headers: getMemberAuthHeaders(),
    }),
};

// ============= Circulation API =============

export const circulationAPI = {
    checkout: (transactionData) => fetchAPI('/circulation/checkout', {
        method: 'POST', body: JSON.stringify(transactionData),
        headers: getAdminAuthHeaders(),
    }),
    checkin: (transactionId, returnData) => fetchAPI(`/circulation/checkin/${transactionId}`, {
        method: 'POST', body: JSON.stringify(returnData),
        headers: getAdminAuthHeaders(),
    }),
    getActive: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/circulation/active?${queryParams}`, { headers: getAdminAuthHeaders() });
    },
    getMyLoans:    () => fetchAPI('/circulation/my',         { headers: getMemberAuthHeaders() }),
    getMyHistory:  (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/circulation/my-history?${queryParams}`, { headers: getMemberAuthHeaders() });
    },
    getOverdue:            () => fetchAPI('/circulation/overdue', { headers: getAdminAuthHeaders() }),
    getRecentReturns: (limit = 12) => fetchAPI(`/circulation/recent-returns?limit=${limit}`, { headers: getAdminAuthHeaders() }),
    getMemberTransactions: (memberId) => fetchAPI(`/circulation/member/${memberId}`, { headers: getAdminAuthHeaders() }),
};

// ============= Dashboard API =============

export const dashboardAPI = {
    getStats: () => fetchAPI('/dashboard/stats', { headers: getMemberAuthHeaders() }),
};

// ============= Reports API =============

export const reportsAPI = {
    getStats: () => fetchAPI('/dashboard/stats', { headers: getAdminAuthHeaders() }), // Alias for reports
    getActivityLogs: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/activity-logs?${queryParams}`, { headers: getAdminAuthHeaders() });
    },
    getCirculationStats:   () => fetchAPI('/reports/circulation-stats',   { headers: getAdminAuthHeaders() }),
    getPopularBooks: (limit = 10) => fetchAPI(`/reports/popular-books?limit=${limit}`, { headers: getAdminAuthHeaders() }),
    getCategoryDistribution: () => fetchAPI('/reports/category-distribution', { headers: getAdminAuthHeaders() }),
    getMemberStats:          () => fetchAPI('/reports/member-stats',           { headers: getAdminAuthHeaders() }),
    getFineReport:           () => fetchAPI('/reports/fines',                  { headers: getAdminAuthHeaders() }),
    getMonthlyTrend:         () => fetchAPI('/reports/monthly-trend',          { headers: getAdminAuthHeaders() }),
};

// ============= Analytics API (Advanced) =============

export const analyticsAPI = {
    getActivitySummary: (days = 30) =>
        fetchAPI(`/analytics/activity/summary?days=${days}`, { headers: getAdminAuthHeaders() }),
    getActivityDashboard: (params = 7) => {
        const query = new URLSearchParams();

        if (typeof params === 'number') {
            query.set('days', String(params));
        } else {
            const { days = 7, startDate, endDate } = params || {};
            if (startDate) query.set('startDate', startDate);
            if (endDate) query.set('endDate', endDate);
            if (!startDate && !endDate) query.set('days', String(days));
        }

        return fetchAPI(`/analytics/activity/dashboard?${query.toString()}`, { headers: getAdminAuthHeaders() });
    },
    getCollectionPopularBooks: (days = 90, limit = 20) =>
        fetchAPI(`/analytics/collection/popular-books?days=${days}&limit=${limit}`, { headers: getAdminAuthHeaders() }),
    getOverview: (days = 30) =>
        fetchAPI(`/analytics/overview?days=${days}`, { headers: getAdminAuthHeaders() }),
};

// ============= Audit Trail API =============

export const auditAPI = {
    getBookAudit:    (bookId, limit = 100) => fetchAPI(`/audit/books/${bookId}?limit=${limit}`, { headers: getAdminAuthHeaders() }),
    getAllAudits:    (limit = 100, offset = 0) => fetchAPI(`/audit/all?limit=${limit}&offset=${offset}`, { headers: getAdminAuthHeaders() }),
    getAuditsByAction: (action, limit = 100) => fetchAPI(`/audit/action/${action}?limit=${limit}`, { headers: getAdminAuthHeaders() }),
};

// ============= CMS API =============

export const cmsAPI = {
    getPage:      (page) => fetchAPI(`/cms/pages/${page}`),
    getSection:   (page, section) => fetchAPI(`/cms/pages/${page}/${section}`),
    updatePage:   (page, content) => fetchAPI(`/cms/pages/${page}`, {
        method: 'PUT', body: JSON.stringify({ content }),
        headers: getAdminAuthHeaders(),
    }),
    updateSection: (page, section, content) => fetchAPI(`/cms/pages/${page}/${section}`, {
        method: 'PUT', body: JSON.stringify(content),
        headers: getAdminAuthHeaders(),
    }),
    resetSection: (page, section) => fetchAPI(`/cms/pages/${page}/${section}/reset`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
    }),
};

// ============= Site Settings API =============

export const settingsAPI = {
    getAll:        ()           => fetchAPI('/settings'),
    getFull:       ()           => fetchAPI('/settings/full', { headers: getAdminAuthHeaders() }),
    getByCategory: (category)  => fetchAPI(`/settings/by-category/${category}`),
    update: (key, value, category, description) => fetchAPI(`/settings/${key}`, {
        method: 'PUT', body: JSON.stringify({ value, category, description }),
        headers: getAdminAuthHeaders(),
    }),
    bulkUpdate: (settings) => fetchAPI('/settings/bulk', {
        method: 'POST', body: JSON.stringify({ settings }),
        headers: getAdminAuthHeaders(),
    }),
    remove: (key) => fetchAPI(`/settings/${key}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

// ============= Reservations API =============

export const reservationsAPI = {
    create: (reservationData) => fetchAPI('/reservations', {
        method: 'POST', body: JSON.stringify(reservationData),
        headers: getMemberAuthHeaders(),
    }),
    getMy: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/reservations/my${queryParams ? `?${queryParams}` : ''}`, { headers: getMemberAuthHeaders() });
    },
    cancel: (id, cancellation_note = '') => fetchAPI(`/reservations/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify(cancellation_note ? { cancellation_note } : {}),
        headers: getMemberAuthHeaders(),
    }),
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/reservations${queryParams ? `?${queryParams}` : ''}`, { headers: getAdminAuthHeaders() });
    },
};

// ============= Collections API =============

export const collectionsAPI = {
    getAll:   ()   => fetchAPI('/collections'),
    getAllAdmin: () => fetchAPI('/collections/admin/all', { headers: getAdminAuthHeaders() }),
    getPinned: ()  => fetchAPI('/collections/pinned'),  // for landing page (max 3)
    getById:  (id) => fetchAPI(`/collections/${id}`),
    create: (data) => fetchAPI('/collections', {
        method: 'POST', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    update: (id, data) => fetchAPI(`/collections/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    pin: (id, is_pinned) => fetchAPI(`/collections/${id}/pin`, {
        method: 'PATCH', body: JSON.stringify({ is_pinned }),
        headers: getAdminAuthHeaders(),
    }),
    remove: (id) => fetchAPI(`/collections/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
    addBook: (collectionId, bookId, displayOrder = 0) =>
        fetchAPI(`/collections/${collectionId}/books`, {
            method: 'POST', body: JSON.stringify({ book_id: bookId, display_order: displayOrder }),
            headers: getAdminAuthHeaders(),
        }),
    removeBook: (collectionId, bookId) =>
        fetchAPI(`/collections/${collectionId}/books/${bookId}`, {
            method: 'DELETE',
            headers: getAdminAuthHeaders(),
        }),
};


// ============= Recommendations API =============

export const recommendationsAPI = {
    getPopular:       (limit = 10)    => fetchAPI(`/recommendations/popular?limit=${limit}`),
    getRelated:       (bookId, limit = 8) => fetchAPI(`/recommendations/related/${bookId}?limit=${limit}`),
    getForMember:     (memberId, limit = 10) => fetchAPI(`/recommendations/for-member/${memberId}?limit=${limit}`),
};

// ============= Financial API (Admin) =============

export const financialAPI = {
    processPayment: (member_id, amount) => fetchAPI('/financial/process-payment', {
        method: 'POST', body: JSON.stringify({ member_id, amount }),
        headers: getAdminAuthHeaders(),
    }),
    getMyTransactions: (limit = 20) => fetchAPI(`/financial/my-transactions?limit=${limit}`, { headers: getMemberAuthHeaders() }),
    getRecentTransactions: (limit = 15) => fetchAPI(`/financial/recent-transactions?limit=${limit}`, { headers: getAdminAuthHeaders() }),
    getDashboardStats: () => fetchAPI('/financial/dashboard-stats', { headers: getAdminAuthHeaders() }),
    getOverdueSummary: () => fetchAPI('/financial/overdue-summary',  { headers: getAdminAuthHeaders() }),
    getMonthlySummary: (year, month) => fetchAPI(`/financial/monthly-summary?year=${year}&month=${month}`, { headers: getAdminAuthHeaders() }),
};

// ============= Staff Board API (Admin) =============

export const staffBoardAPI = {
    getAll:   ()       => fetchAPI('/staff-board', { headers: getAdminAuthHeaders() }),
    getPosts: ()       => fetchAPI('/staff-board', { headers: getAdminAuthHeaders() }), // Alias for getAll
    create:   (data)   => fetchAPI('/staff-board', { method: 'POST', body: JSON.stringify(data), headers: getAdminAuthHeaders() }),
    update:   (id, data) => fetchAPI(`/staff-board/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: getAdminAuthHeaders() }),
    remove:   (id)     => fetchAPI(`/staff-board/${id}`, { method: 'DELETE', headers: getAdminAuthHeaders() }),
};

// ============= Ebooks API (Admin) =============

export const ebooksAPI = {
    getAll:  () => fetchAPI('/ebooks', { headers: getAdminAuthHeaders() }),
    create:  (formData) => fetchAPI('/ebooks', {
        method: 'POST',
        body: formData,
        headers: getAdminAuthHeaders(),
    }),
    update:  (id, data) => fetchAPI(`/ebooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    remove:  (id) => fetchAPI(`/ebooks/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

// ============= Health Check =============

export const healthAPI = {
    check: () => fetch(`${BACKEND_ORIGIN}/health`).then(r => r.json()),
};

// ============= Authentication API =============

export const authAPI = {
    signup: (userData) => fetchAPI('/auth/signup', {
        method: 'POST', body: JSON.stringify(userData),
    }),
    login: (credentials) => fetchAPI('/auth/login', {
        method: 'POST', body: JSON.stringify(credentials),
    }),
    getCurrentUser: () => {
        return fetchAPI('/auth/me', { headers: getMemberAuthHeaders() });
    },
    getCurrentStaff: () => {
        return fetchAPI('/auth/staff/me', { headers: getAdminAuthHeaders() });
    },
};

// ============= Announcements API (MongoDB) =============

export const announcementsAPI = {
    getAll: () => fetchAPI('/announcements'),
    getAllAdmin: () => fetchAPI('/announcements/admin/all', { headers: getAdminAuthHeaders() }),
    getById: (id) => fetchAPI(`/announcements/${id}`),
    create: (data) => fetchAPI('/announcements', {
        method: 'POST', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    update: (id, data) => fetchAPI(`/announcements/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    remove: (id) => fetchAPI(`/announcements/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

// ============= News API (MySQL) =============

export const newsAPI = {
    getAll: () => fetchAPI('/news'),
    getFeatured: () => fetchAPI('/news/featured'),
    getAllAdmin: () => fetchAPI('/news/admin/all', { headers: getAdminAuthHeaders() }),
    getById: (id) => fetchAPI(`/news/${id}`),
    create: (data) => fetchAPI('/news', {
        method: 'POST', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    update: (id, data) => fetchAPI(`/news/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    remove: (id) => fetchAPI(`/news/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

export default {
    books:           booksAPI,
    members:         membersAPI,
    circulation:     circulationAPI,
    dashboard:       dashboardAPI,
    reports:         reportsAPI,
    analytics:       analyticsAPI,
    audit:           auditAPI,
    cms:             cmsAPI,
    settings:        settingsAPI,
    reservations:    reservationsAPI,
    collections:     collectionsAPI,
    recommendations: recommendationsAPI,
    financial:       financialAPI,
    staffBoard:      staffBoardAPI,
    ebooks:          ebooksAPI,
    health:          healthAPI,
    auth:            authAPI,
    announcements:   announcementsAPI,
    news:            newsAPI,
};
