import { API_BASE_URL } from '../config/api';
import { getAuthToken, getSupabaseSessionToken } from './authStore';

async function fetchReviewAPI(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const config = {
        ...options,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed' }));
        const error = new Error(body.detail || 'API request failed');
        error.status = response.status;
        throw error;
    }

    if (response.status === 204) return null;
    return response.json();
}

const toBearerHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});
const getMemberAuthHeaders = () => toBearerHeader(getAuthToken() || getSupabaseSessionToken());
const getAdminAuthHeaders = () => toBearerHeader(getSupabaseSessionToken() || getAuthToken());

export const reviewsAPI = {
    getForBook: (bookId, params = {}) => {
        const query = new URLSearchParams(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
        ).toString();
        return fetchReviewAPI(`/reviews/book/${bookId}${query ? `?${query}` : ''}`, {
            headers: getMemberAuthHeaders(),
        });
    },
    getSummary: (bookId) => fetchReviewAPI(`/reviews/book/${bookId}/summary`, {
        headers: getMemberAuthHeaders(),
    }),
    create: (data) => fetchReviewAPI('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: getMemberAuthHeaders(),
    }),
    update: (reviewId, data) => fetchReviewAPI(`/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: getMemberAuthHeaders(),
    }),
    delete: (reviewId) => fetchReviewAPI(`/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getMemberAuthHeaders(),
    }),
    addComment: (reviewId, data) => fetchReviewAPI(`/reviews/${reviewId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: getMemberAuthHeaders(),
    }),
    addReply: (reviewId, commentId, data) => fetchReviewAPI(`/reviews/${reviewId}/comments/${commentId}/replies`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: getMemberAuthHeaders(),
    }),
    deleteComment: (reviewId, commentId) => fetchReviewAPI(`/reviews/${reviewId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getMemberAuthHeaders(),
    }),
    like: (reviewId) => fetchReviewAPI(`/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: getMemberAuthHeaders(),
    }),
    flag: (reviewId, reason) => fetchReviewAPI(`/reviews/${reviewId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: getMemberAuthHeaders(),
    }),
    getMy: () => fetchReviewAPI('/reviews/my', { headers: getMemberAuthHeaders() }),
    adminGetAll: (params = {}) => {
        const query = new URLSearchParams(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
        ).toString();
        return fetchReviewAPI(`/reviews/admin/all${query ? `?${query}` : ''}`, { headers: getAdminAuthHeaders() });
    },
    adminGetStats: () => fetchReviewAPI('/reviews/admin/stats', { headers: getAdminAuthHeaders() }),
    adminSetStatus: (reviewId, data) => fetchReviewAPI(`/reviews/admin/${reviewId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: getAdminAuthHeaders(),
    }),
    adminDelete: (reviewId) => fetchReviewAPI(`/reviews/admin/${reviewId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
    adminDeleteComment: (reviewId, commentId) => fetchReviewAPI(`/reviews/admin/${reviewId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
    }),
};

export const giphyAPI = {
    search: (q, limit = 12) => fetchReviewAPI(`/giphy/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
        headers: getMemberAuthHeaders(),
    }),
    trending: (limit = 12) => fetchReviewAPI(`/giphy/trending?limit=${limit}`, {
        headers: getMemberAuthHeaders(),
    }),
};
