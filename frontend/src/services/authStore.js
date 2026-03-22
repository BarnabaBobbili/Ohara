/**
 * Authentication State Management
 * Simple localStorage-based auth state
 */

const parseSupabaseSession = (raw) => {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) return parsed;
        if (parsed?.currentSession?.access_token) return parsed.currentSession;
        if (parsed?.session?.access_token) return parsed.session;
    } catch (error) {
        console.error('Failed to parse Supabase session:', error);
    }

    return null;
};

export const getSupabaseSession = () => {
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !/^sb-.*-auth-token$/.test(key)) continue;

        const session = parseSupabaseSession(localStorage.getItem(key));
        if (session?.access_token) {
            return session;
        }
    }

    return parseSupabaseSession(localStorage.getItem('supabase.auth.token'));
};

export const getSupabaseSessionToken = () => getSupabaseSession()?.access_token || null;

// Get auth state from localStorage
export const getAuthState = () => {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');

    if (token && !userJson) {
        return { isAuthenticated: true, user: null, token };
    }

    if (!token || !userJson) {
        const supabaseSession = getSupabaseSession();
        if (!supabaseSession?.access_token) {
            return { isAuthenticated: false, user: null, token: null };
        }

        return {
            isAuthenticated: true,
            user: supabaseSession.user || null,
            token: supabaseSession.access_token,
        };
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

export const hasAnySessionToken = () => {
    return Boolean(localStorage.getItem('auth_token') || getSupabaseSessionToken());
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
    getSupabaseSession,
    getSupabaseSessionToken,
    hasAnySessionToken,
    logout,
};
