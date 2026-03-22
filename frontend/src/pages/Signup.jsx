// Signup Page - Editorial Design
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setAuthState } from '../services/authStore';

export default function Signup() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        memberType: 'public',
        agreeToTerms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match!');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (!formData.agreeToTerms) {
            setError('You must agree to the Terms of Service and Privacy Policy');
            return;
        }

        setLoading(true);

        try {
            // Prepare user data for API
            const userData = {
                name: formData.fullName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone || null,
                address: formData.address || null,
                member_type: formData.memberType,
            };

            // Call signup API
            const response = await authAPI.signup(userData);

            // Save auth state
            setAuthState(response.access_token, response.user || null);

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
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
                <div className="absolute top-20 left-20 w-64 h-64 bg-[#c16549]/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#c16549]/5 rounded-full blur-3xl"></div>

                <div className="w-full max-w-md relative z-10">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-3 mb-8 group">
                        <span className="material-symbols-outlined text-[#c16549] text-4xl">auto_stories</span>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-[#1E1815] dark:text-white tracking-tight group-hover:text-[#c16549] transition-colors"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                Ohara
                            </h1>
                            <p className="text-xs text-[#6B6560] dark:text-gray-400 tracking-wider"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Tree of Knowledge
                            </p>
                        </div>
                    </Link>

                    {/* Card */}
                    <div className="bg-white dark:bg-[#1a1614] rounded-2xl shadow-xl p-8 md:p-10 border border-[#E8E4DF] dark:border-white/10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-[#1E1815] dark:text-white mb-2"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                Join Us
                            </h2>
                            <p className="text-[#6B6560] dark:text-gray-400"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Begin your literary journey
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {error}
                                </div>
                            )}

                            {/* Full Name */}
                            <div>
                                <label
                                    htmlFor="fullName"
                                    className="block text-sm font-medium text-[#1E1815] dark:text-white mb-2"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Full Name
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="Jane Austen"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-[#1E1815] dark:text-white mb-2"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="reader@example.com"
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
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="••••••••"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-[#1E1815] dark:text-white mb-2"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all disabled:opacity-50"
                                    placeholder="••••••••"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Terms Checkbox */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="agreeToTerms"
                                    name="agreeToTerms"
                                    required
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-4 h-4 mt-1 rounded border-[#E8E4DF] text-[#c16549] focus:ring-[#c16549]/20"
                                />
                                <label
                                    htmlFor="agreeToTerms"
                                    className="text-sm text-[#6B6560] dark:text-gray-400"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    I agree to the <Link to="/terms" className="text-[#c16549] hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-[#c16549] hover:underline">Privacy Policy</Link>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#c16549] hover:bg-[#a0523b] text-white py-3 rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                                {!loading && (
                                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#E8E4DF] dark:border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-[#1a1614] text-[#6B6560] dark:text-gray-400"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        {/* Login Link */}
                        <Link
                            to="/login"
                            className="w-full block text-center py-3 border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#1e1614] font-medium transition-all"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Sign In Instead
                        </Link>
                    </div>

                    {/* Footer Link */}
                    <div className="text-center mt-8">
                        <Link
                            to="/"
                            className="text-sm text-[#6B6560] dark:text-gray-400 hover:text-[#c16549] transition-colors inline-flex items-center gap-1"
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
