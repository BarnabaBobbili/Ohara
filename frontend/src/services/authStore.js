/**
 * Authentication State Management
 * Simple localStorage-based auth state
 */

const TOKEN_EXPIRY_SKEW_SECONDS = 30;

const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
};

const isTokenExpired = (token, skewSeconds = TOKEN_EXPIRY_SKEW_SECONDS) => {
    const payload = decodeJwtPayload(token);
    const exp = Number(payload?.exp);

    // If exp is missing, treat token as non-expiring/unknown and let backend validate.
    if (!Number.isFinite(exp)) return false;

    const now = Math.floor(Date.now() / 1000);
    return exp <= now + Math.max(0, Number(skewSeconds) || 0);
};

const parseSupabaseSession = (raw) => {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && !isTokenExpired(parsed.access_token)) return parsed;
        if (parsed?.currentSession?.access_token && !isTokenExpired(parsed.currentSession.access_token)) return parsed.currentSession;
        if (parsed?.session?.access_token && !isTokenExpired(parsed.session.access_token)) return parsed.session;
    } catch (error) {
        console.error('Failed to parse Supabase session:', error);
    }

    return null;
};

const getStoredAuthToken = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    if (isTokenExpired(token)) return null;
    return token;
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
    const token = getStoredAuthToken();
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
    return getStoredAuthToken() || getSupabaseSessionToken();
};

export const hasAnySessionToken = () => {
    return Boolean(getStoredAuthToken() || getSupabaseSessionToken());
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
