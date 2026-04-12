import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userData, setUserData] = useState({ name: 'Admin User', role: 'Head Librarian' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        authAPI.getCurrentStaff()
            .then(user => {
                if (user) {
                    setUserData({
                        name: user.name || 'Admin User',
                        role: user.role === 'admin' ? 'Head Librarian' : 'Staff'
                    });
                }
            })
            .catch(() => {});
    }, []);

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const navItems = [
        { path: '/admin', icon: 'dashboard', label: 'Registry', exact: true },
        { path: '/admin/books', icon: 'auto_stories', label: 'Archives' },
        { path: '/admin/circulation', icon: 'sync_alt', label: 'Circulation' },
        { path: '/admin/members', icon: 'groups', label: 'Patrons' },
        { path: '/admin/cms', icon: 'edit_note', label: 'CMS Studio' },
        { path: '/admin/content', icon: 'campaign', label: 'News & Alerts' },
        { path: '/admin/ebooks', icon: 'menu_book', label: 'Digital Library' },
        { path: '/admin/reviews', icon: 'rate_review', label: 'Reviews' },
        { path: '/admin/reports', icon: 'analytics', label: 'Analytics' },
        { path: '/admin/audit-trail', icon: 'history', label: 'Audit Trail' },
        { path: '/admin/settings', icon: 'tune', label: 'Settings' },
    ];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Noto+Sans:wght@300;400;500;600;700&display=swap');
                
                .bg-paper-grain {
                    background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                }
                
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #E8E4DF; }
                ::-webkit-scrollbar-thumb { background: #c16549; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #a14d39; }
            `}</style>

            <div className="flex h-screen w-full relative bg-[#FAF7F2] overflow-hidden" style={{ fontFamily: "'Newsreader', serif" }}>
                {/* Paper grain texture overlay */}
                <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-30 bg-paper-grain"></div>

                {/* Mobile Backdrop */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-[#1E1815]/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                )}

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="fixed top-5 left-5 z-50 lg:hidden w-11 h-11 bg-[#c16549] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                    <span className="material-symbols-outlined text-xl">
                        {isMobileMenuOpen ? 'close' : 'menu'}
                    </span>
                </button>

                {/* SIDEBAR: Editorial Minimalist */}
                <aside
                    className={`
                        fixed lg:relative z-40 lg:z-20
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        ${isCollapsed ? 'w-20' : 'w-64'}
                        h-full bg-white border-r-2 border-[#E8E4DF]
                        transition-all duration-300 ease-in-out
                        flex flex-col shadow-2xl lg:shadow-none
                    `}
                >
                    {/* Header: Ohara Branding */}
                    <div className={`${isCollapsed ? 'px-4 pt-8 pb-6' : 'px-6 pt-10 pb-8'} border-b border-[#E8E4DF] transition-all`}>
                        {!isCollapsed ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-[#c16549] rounded-full flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_library</span>
                                    </div>
                                    <div>
                                        <h1 className="text-[#1E1815] text-[26px] font-bold tracking-tight leading-none">Ohara</h1>
                                        <p className="text-[#6B6560] text-[9px] font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "'Noto Sans', sans-serif" }}>Admin Portal</p>
                                    </div>
                                </div>
                                <div className="h-[1px] bg-[#E8E4DF]"></div>
                                <div className="flex items-center gap-2 text-[10px] font-medium tracking-widest uppercase text-[#6B6560]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    <span className="material-symbols-outlined text-[14px] text-[#c16549]">verified</span>
                                    Authenticated
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="w-11 h-11 bg-[#c16549] rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_library</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 overflow-y-auto" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {navItems.map((item) => {
                            const active = item.exact ? location.pathname === item.path : isActive(item.path);
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        group relative flex items-center gap-3
                                        ${isCollapsed ? 'justify-center px-4' : 'px-6'}
                                        py-3 mb-1
                                        ${active 
                                            ? 'bg-[#c16549] text-white shadow-sm' 
                                            : 'text-[#1E1815] hover:bg-[#FAF7F2] hover:text-[#c16549]'
                                        }
                                        transition-all duration-200
                                        border-l-4 ${active ? 'border-[#a14d39]' : 'border-transparent hover:border-[#E8E4DF]'}
                                    `}
                                >
                                    <span className={`material-symbols-outlined text-[22px] transition-all ${active ? '' : 'group-hover:scale-110'}`}
                                        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                                        {item.icon}
                                    </span>
                                    {!isCollapsed && (
                                        <span className="text-[15px] font-medium tracking-wide">{item.label}</span>
                                    )}
                                    {!isCollapsed && active && (
                                        <span className="material-symbols-outlined text-sm ml-auto">arrow_forward_ios</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className={`${isCollapsed ? 'px-3 py-4' : 'px-6 py-5'} border-t border-[#E8E4DF] bg-[#F8F6F4]`}>
                        {!isCollapsed ? (
                            <div 
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={() => navigate('/admin/settings')}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c16549] to-[#a14d39] flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                                    <span className="text-sm font-bold">{userData.name.charAt(0)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[#1E1815] text-sm font-semibold truncate leading-tight">{userData.name}</p>
                                    <p className="text-[#6B6560] text-[10px] uppercase tracking-wider font-medium" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{userData.role}</p>
                                </div>
                                <span className="material-symbols-outlined text-[#6B6560] text-lg group-hover:text-[#c16549] transition-colors">settings</span>
                            </div>
                        ) : (
                            <div className="flex justify-center cursor-pointer" onClick={() => navigate('/admin/settings')}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c16549] to-[#a14d39] flex items-center justify-center text-white shadow-sm hover:shadow-md transition-shadow">
                                    <span className="text-sm font-bold">{userData.name.charAt(0)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block absolute -right-3 top-20 w-6 h-6 bg-white border-2 border-[#E8E4DF] rounded-full shadow-md hover:bg-[#c16549] hover:border-[#c16549] hover:text-white transition-all z-30 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-[14px]">
                            {isCollapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                    </button>
                </aside>

                {/* MAIN CONTENT */}
                <main 
                    className="flex-1 relative flex flex-col bg-[#FAF7F2] overflow-auto"
                    onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
                >
                    {/* Top Bar */}
                    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E4DF] px-6 py-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            {/* Breadcrumb & Title */}
                            <div className="flex items-center gap-4">
                                <div className="hidden md:block text-[10px] font-bold tracking-[0.2em] uppercase text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {navItems.find(item => item.exact ? location.pathname === item.path : isActive(item.path))?.label || 'Dashboard'}
                                </div>
                                <span className="hidden md:block text-[#E8E4DF]">|</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#c16549] text-lg">folder_open</span>
                                    <span className="text-sm text-[#6B6560]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Clock, Notifications */}
                            <div className="flex items-center gap-4">
                                {/* Clock */}
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg">
                                    <span className="material-symbols-outlined text-[#c16549] text-[18px]">schedule</span>
                                    <span className="text-[#1E1815] text-sm font-mono font-semibold tabular-nums">
                                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>

                                {/* Notifications */}
                                <button className="relative p-2 hover:bg-[#FAF7F2] rounded-full transition-colors group">
                                    <span className="material-symbols-outlined text-[#6B6560] text-[22px] group-hover:text-[#c16549] transition-colors">notifications</span>
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c16549] rounded-full animate-pulse"></span>
                                </button>

                                {/* Home */}
                                <button 
                                    onClick={() => navigate('/')}
                                    className="p-2 hover:bg-[#FAF7F2] rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[#6B6560] text-[22px]">home</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </>
    );
}
