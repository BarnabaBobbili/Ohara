/**
 * Authentication State Management
 * Simple localStorage-based auth state
 */

// Get auth state from localStorage
export const getAuthState = () => {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');

    if (!token || !userJson) {
        return { isAuthenticated: false, user: null, token: null };
    }

    try {
        const user = JSON.parse(userJson);
        return { isAuthenticated: true, user, token };
    } catch (error) {
        console.error('Failed to parse user data:', error);
        clearAuthState();
        return { isAuthenticated: false, user: null, token: null };
    }
};

// Save auth state to localStorage
export const setAuthState = (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
};

// Clear auth state from localStorage
export const clearAuthState = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
    return getAuthState().isAuthenticated;
};

// Get current user
export const getCurrentUser = () => {
    return getAuthState().user;
};

// Get auth token
export const getAuthToken = () => {
    return getAuthState().token;
};

// Logout
export const logout = () => {
    clearAuthState();
    // Navigation is handled by the calling component
};

export default {
    getAuthState,
    setAuthState,
    clearAuthState,
    isAuthenticated,
    getCurrentUser,
    getAuthToken,
    logout,
};
