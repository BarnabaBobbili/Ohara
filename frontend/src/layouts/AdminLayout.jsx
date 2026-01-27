import { Outlet, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';

export default function AdminLayout() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const navItems = [
        { path: '/admin', icon: 'library_books', label: 'The Registry', exact: true },
        { path: '/admin/books', icon: 'inventory_2', label: 'The Archives' },
        { path: '/admin/circulation', icon: 'sync_alt', label: 'Circulation' },
        { path: '/admin/members', icon: 'person_search', label: 'Patrons' },
        { path: '/admin/reports', icon: 'bar_chart', label: 'Analytics' },
        { path: '/admin/settings', icon: 'settings', label: 'Configuration' },
    ];

    return (
        <div className="flex h-screen w-full relative">
            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden w-12 h-12 bg-[#8d4d3f] rounded-md shadow-lg flex items-center justify-center text-white"
            >
                <span className="material-symbols-outlined">
                    {isMobileMenuOpen ? 'close' : 'menu'}
                </span>
            </button>

            {/* SIDE NAVIGATION: THE SPINE */}
            <aside
                className={`
                    fixed lg:relative
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'w-20' : 'w-80'} 
                    h-full bg-[#8d4d3f] z-40 lg:z-20
                    border-r border-white/5 
                    transition-all duration-300 ease-in-out
                    flex flex-col
                `}
                style={{ boxShadow: 'inset -15px 0 30px -5px rgba(0,0,0,0.4)' }}
            >
                {/* Spine Header / Classification */}
                <div className={`pt-10 pb-8 ${isCollapsed ? 'px-4' : 'px-8'} flex flex-col gap-4 border-b border-white/10 relative transition-all`}>
                    {/* Decorative Binding Line */}
                    <div className="absolute top-4 left-0 w-full h-[1px] bg-white/20"></div>
                    <div className="absolute top-5 left-0 w-full h-[1px] bg-white/10"></div>

                    {!isCollapsed && (
                        <div className="flex flex-col items-start gap-1">
                            <div className="border border-[#eaddcf]/40 px-2 py-1 rounded-sm mb-2 backdrop-blur-sm">
                                <span className="text-[#eaddcf] text-[10px] font-bold tracking-[0.25em] uppercase font-sans">LOC-REF-2024</span>
                            </div>
                            <h1 className="text-white text-3xl font-medium italic tracking-tight leading-none" style={{ fontFamily: "'Newsreader', serif" }}>
                                Librarian's<br />Ledger
                            </h1>
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="flex justify-center">
                            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>local_library</span>
                        </div>
                    )}
                </div>

                {/* Navigation Links (Spine Items) */}
                <nav className="flex-1 flex flex-col py-4 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = item.exact
                            ? location.pathname === item.path
                            : isActive(item.path);

                        if (active) {
                            // Active Item: The 'Index Card' look
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`group relative flex items-center ${isCollapsed ? 'pl-4 pr-2 justify-center' : 'pl-8 pr-4'} py-5 mb-1 cursor-pointer transition-all`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {/* The Card Tab Background */}
                                    <div className="absolute inset-y-1 left-2 right-2 bg-[#f2f0e4] rounded-r-md rounded-l-sm z-0 transition-all duration-300"
                                        style={{ boxShadow: '2px 4px 10px rgba(0,0,0,0.2)' }}></div>

                                    {/* Content */}
                                    <div className={`relative z-10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} text-[#8d4d3f] w-full`}>
                                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                                            {item.icon}
                                        </span>
                                        {!isCollapsed && (
                                            <span className="text-xl font-semibold tracking-wide" style={{ fontFamily: "'Newsreader', serif" }}>
                                                {item.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Little arrow hint */}
                                    {!isCollapsed && (
                                        <span className="material-symbols-outlined relative z-10 text-[#8d4d3f]/50 ml-auto text-lg">arrow_right</span>
                                    )}
                                </Link>
                            );
                        } else {
                            // Inactive Item
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`group relative flex items-center ${isCollapsed ? 'gap-0 pl-4 pr-2 justify-center' : 'gap-4 pl-10 pr-6'} py-5 border-b border-white/10 cursor-pointer hover:bg-black/10 transition-colors`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="material-symbols-outlined text-[#eaddcf] text-[26px] opacity-70 group-hover:opacity-100 transition-opacity">
                                        {item.icon}
                                    </span>
                                    {!isCollapsed && (
                                        <span className="text-[#eaddcf] text-lg font-normal tracking-wide opacity-80 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Newsreader', serif" }}>
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        }
                    })}
                </nav>

                {/* Spine Footer / User Profile */}
                <div className="p-6 bg-[#753e32]/40 border-t border-white/10" style={{ boxShadow: 'inset -15px 0 30px -5px rgba(0,0,0,0.4)' }}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="h-10 w-10 rounded-full bg-[#eaddcf] flex items-center justify-center text-[#8d4d3f] shadow-inner border border-white/20">
                                <span className="material-symbols-outlined">account_circle</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#eaddcf] leading-tight">Admin User</span>
                                <span className="text-xs text-[#eaddcf]/60 uppercase tracking-wider font-sans">Head Librarian</span>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="flex justify-center">
                            <div className="h-10 w-10 rounded-full bg-[#eaddcf] flex items-center justify-center text-[#8d4d3f] shadow-inner border border-white/20">
                                <span className="material-symbols-outlined">account_circle</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Toggle Handle (Desktop Only) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#8d4d3f] border border-white/20 shadow-lg rounded-r-md items-center justify-center cursor-pointer hover:w-8 transition-all z-30"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className="material-symbols-outlined text-white/70 text-sm">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 relative flex flex-col bg-[#1d1715] overflow-auto w-full"
                onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}>
                {/* Background Texture/Gradient hint */}
                <div className="absolute inset-0 bg-gradient-radial from-[#2a2220] via-[#1d1715] to-[#1d1715] pointer-events-none"></div>

                <div className="relative z-10 h-full">
                    <Outlet />
                </div>
            </main>

            <style>{`
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: #1d1715; 
                }
                ::-webkit-scrollbar-thumb {
                    background: #444; 
                    border-radius: 3px;
                }
                
                .bg-gradient-radial {
                    background: radial-gradient(ellipse at top right, #2a2220, #1d1715 50%, #1d1715);
                }
            `}</style>
        </div>
    );
}
