// Login Page - Editorial Design
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: Implement authentication logic
        console.log('Login:', { email, password });
        // Temporary: Navigate to dashboard
        navigate('/dashboard');
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
                                Welcome Back
                            </h2>
                            <p className="text-[#6B6560] dark:text-gray-400"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Enter your sanctuary
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all"
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
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#FAF7F2] dark:bg-[#1e1614] border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all"
                                    placeholder="••••••••"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                />
                            </div>

                            {/* Remember & Forgot */}
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-[#E8E4DF] text-[#c16549] focus:ring-[#c16549]/20"
                                    />
                                    <span className="text-[#6B6560] dark:text-gray-400 group-hover:text-[#1E1815] dark:group-hover:text-white transition-colors"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Remember me
                                    </span>
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-[#c16549] hover:underline"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full bg-[#c16549] hover:bg-[#a0523b] text-white py-3 rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                <span>Sign In</span>
                                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
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
                                    New to Ohara?
                                </span>
                            </div>
                        </div>

                        {/* Sign Up Link */}
                        <Link
                            to="/signup"
                            className="w-full block text-center py-3 border border-[#E8E4DF] dark:border-white/10 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#1e1614] font-medium transition-all"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Create an Account
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
