// Admin Login Page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setAuthState } from '../services/authStore';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Call login API
            const response = await authAPI.login({ email, password });

            // Check if user has admin/staff role
            const role = response.user?.role || 'member';
            const isAdmin = role === 'admin' || role === 'staff';

            if (!isAdmin) {
                setError('Access denied. Admin or staff credentials required.');
                setLoading(false);
                return;
            }

            // Save auth state
            setAuthState(response.access_token, response.user || null);

            // Navigate to admin dashboard
            navigate('/admin', { replace: true });
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>
                {`
                    .bg-paper-grain {
                        background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                    }
                `}
            </style>

            <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] flex items-center justify-center px-6 py-12 relative overflow-hidden">
                {/* Paper grain texture */}
                <div className="fixed inset-0 pointer-events-none mix-blend-multiply opacity-40 bg-paper-grain"></div>

                {/* Decorative elements */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-[#c16549]/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#c16549]/5 rounded-full blur-3xl"></div>

                <div className="w-full max-w-md relative z-10">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-3 mb-8 group">
                        <span className="material-symbols-outlined text-[#c16549] text-4xl">admin_panel_settings</span>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-[#1E1815] dark:text-white tracking-tight group-hover:text-[#c16549] transition-colors"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                Ohara Admin
                            </h1>
                            <p className="text-xs text-[#6B6560] dark:text-gray-400 tracking-wider"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Administrative Portal
                            </p>
                        </div>
                    </Link>

                    {/* Card */}
                    <div className="bg-white dark:bg-[#1a1614] rounded-2xl shadow-xl p-8 md:p-10 border border-[#E8E4DF] dark:border-white/10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c16549]/10 rounded-full mb-4">
                                <span className="material-symbols-outlined text-[#c16549] text-3xl">shield</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#1E1815] dark:text-white mb-2"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                Admin Access
                            </h2>
                            <p className="text-[#6B6560] dark:text-gray-400"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Enter your admin credentials
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {error}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-[#1E1815] dark:text-white mb-2"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Admin Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="admin@library.com"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-[#1E1815] dark:text-white mb-2"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="••••••••"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#c16549] hover:bg-[#a0523b] text-white py-3 rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                <span className="material-symbols-outlined text-lg">login</span>
                                <span>{loading ? 'Verifying...' : 'Access Admin Panel'}</span>
                            </button>
                        </form>

                        {/* Security Notice */}
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm mt-0.5">info</span>
                                <p className="text-xs text-amber-800 dark:text-amber-200"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    This is a secure area. All login attempts are monitored and logged.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="flex justify-between items-center mt-8 text-sm">
                        <Link
                            to="/login"
                            className="text-[#6B6560] dark:text-gray-400 hover:text-[#c16549] transition-colors inline-flex items-center gap-1"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-sm">person</span>
                            Member Login
                        </Link>
                        <Link
                            to="/"
                            className="text-[#6B6560] dark:text-gray-400 hover:text-[#c16549] transition-colors inline-flex items-center gap-1"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
