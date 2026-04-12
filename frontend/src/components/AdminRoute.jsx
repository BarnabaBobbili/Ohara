import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthState, hasAnySessionToken } from '../services/authStore';
import { authAPI } from '../services/api';

export default function AdminRoute({ children }) {
    const location = useLocation();

    // Fast-path: if no token at all, go straight to login
    const [status, setStatus] = useState(hasAnySessionToken() ? 'checking' : 'unauthenticated');

    useEffect(() => {
        if (!hasAnySessionToken()) {
            setStatus('unauthenticated');
            return;
        }

        // Also check the cached user role from localStorage first
        // so we don't flash the loader on every navigation
        const { user } = getAuthState();
        if (user?.role === 'admin' || user?.role === 'staff') {
            setStatus('authorized');
            return;
        }

        let cancelled = false;
        const onAuthExpired = () => {
            if (!cancelled) setStatus('unauthenticated');
        };
        window.addEventListener('auth:expired', onAuthExpired);

        const validateAdmin = async () => {
            try {
                // /auth/staff/me returns 200 with role for admin/staff
                // returns 403 for regular members
                const actor = await authAPI.getCurrentStaff();
                if (!cancelled) {
                    const ok = actor?.role === 'admin' || actor?.role === 'staff';
                    setStatus(ok ? 'authorized' : 'forbidden');
                }
            } catch (err) {
                if (!cancelled) {
                    const message = String(err?.message || '').toLowerCase();
                    const isExplicitRoleForbidden = err?.status === 403
                        && message.includes('staff access required');
                    if (isExplicitRoleForbidden) {
                        setStatus('forbidden');
                        return;
                    }
                    setStatus('unauthenticated');
                }
            }
        };

        validateAdmin();

        return () => {
            cancelled = true;
            window.removeEventListener('auth:expired', onAuthExpired);
        };
    }, []);

    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1d1715] text-[#eaddcf]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eaddcf] mx-auto mb-4" />
                    <p>Verifying admin access…</p>
                </div>
            </div>
        );
    }

    if (status === 'forbidden') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#1d1715] text-[#eaddcf] gap-4">
                <span className="material-symbols-outlined text-6xl text-red-400">block</span>
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-[#8a7f75]">Your account does not have admin privileges.</p>
                <a href="/dashboard" className="mt-4 bg-[#c16549] text-white px-6 py-2 rounded-lg hover:bg-[#a0523b] transition-colors">
                    Go to My Dashboard
                </a>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}
