// Header Component - Responsive with Mobile Menu
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 80);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMobileMenuOpen]);

    return (
        <>
            <header
                className={`fixed z-50 transition-all duration-300 ${isScrolled
                    ? 'top-4 left-4 right-4 h-16 bg-[#FAF7F2]/95 dark:bg-[#1e1614]/95 border border-[#E8E4DF] dark:border-white/10 shadow-lg backdrop-blur-sm rounded-2xl'
                    : 'top-0 left-0 right-0 h-20 bg-transparent w-full'
                    }`}
            >
                <div className={`h-full mx-auto flex items-center justify-between ${isScrolled ? 'px-4 md:px-8' : 'px-4 md:px-12'}`}>
                    {/* Left: Logo */}
                    <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
                        <span
                            className={`material-symbols-outlined text-[#c16549] transition-all ${isScrolled ? 'text-[20px] md:text-[24px]' : 'text-[24px] md:text-[28px]'
                                }`}
                        >
                            auto_stories
                        </span>
                        <div>
                            <h1
                                className={`font-display font-bold text-[#1E1815] dark:text-white tracking-tight transition-all ${isScrolled ? 'text-[16px] md:text-[18px]' : 'text-[18px] md:text-[20px]'
                                    }`}
                                style={{ fontFamily: "'Newsreader', serif" }}
                            >
                                Ohara
                            </h1>
                            <p
                                className={`text-[#6B6560] dark:text-gray-400 tracking-wider transition-all ${isScrolled ? 'text-[7px] md:text-[8px]' : 'text-[8px] md:text-[10px]'
                                    }`}
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                Tree of Knowledge
                            </p>
                        </div>
                    </Link>

                    {/* Center: Navigation (Desktop) */}
                    <nav className="hidden lg:flex items-center gap-10">
                        <Link
                            to="/search"
                            className="text-[#4A4540] dark:text-gray-300 text-[14px] font-medium hover:text-[#c16549] transition-colors relative group"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Catalog
                            <span className="absolute bottom-0 left-0 w-0 h-px bg-[#c16549] group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Link
                            to="/search?filter=new"
                            className="text-[#4A4540] dark:text-gray-300 text-[14px] font-medium hover:text-[#c16549] transition-colors relative group"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            New Arrivals
                            <span className="absolute bottom-0 left-0 w-0 h-px bg-[#c16549] group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Link
                            to="/search?filter=staff-picks"
                            className="text-[#4A4540] dark:text-gray-300 text-[14px] font-medium hover:text-[#c16549] transition-colors relative group"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Staff Picks
                            <span className="absolute bottom-0 left-0 w-0 h-px bg-[#c16549] group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Link
                            to="/about"
                            className="text-[#4A4540] dark:text-gray-300 text-[14px] font-medium hover:text-[#c16549] transition-colors relative group"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-px bg-[#c16549] group-hover:w-full transition-all duration-300"></span>
                        </Link>
                    </nav>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Search Icon */}
                        <Link to="/search" className="text-[#1E1815] dark:text-white hover:text-[#c16549] transition-colors">
                            <span className="material-symbols-outlined text-[20px] md:text-[22px]">search</span>
                        </Link>

                        {/* Profile Avatar (Desktop) */}
                        <Link
                            to="/dashboard"
                            className={`hidden sm:flex rounded-full bg-[#c16549]/10 border border-[#c16549]/20 items-center justify-center cursor-pointer hover:scale-105 transition-transform ${isScrolled ? 'w-8 h-8' : 'w-9 h-9'
                                }`}
                        >
                            <span className="text-[#c16549] text-[12px] font-bold">JD</span>
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-[#1E1815] dark:text-white hover:text-[#c16549] transition-colors"
                            aria-label="Toggle menu"
                        >
                            <span className="material-symbols-outlined text-[24px]">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>

                        {/* Menu Button (Desktop) */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="hidden lg:block px-6 py-2 border border-[#1E1815]/20 dark:border-white/20 rounded-full text-[#1E1815] dark:text-white text-[14px] font-medium hover:bg-[#c16549] hover:text-white hover:border-[#c16549] transition-all"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Menu
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Mobile Menu Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-[280px] bg-[#FAF7F2] dark:bg-[#1e1614] shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="p-6">
                    {/* Close Button */}
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 text-[#1E1815] dark:text-white hover:text-[#c16549] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[28px]">close</span>
                        </button>
                    </div>

                    {/* Profile Section */}
                    <Link
                        to="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 mb-8 p-4 rounded-lg border border-[#E8E4DF] dark:border-white/10 hover:bg-[#c16549]/10 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-[#c16549]/10 border border-[#c16549]/20 flex items-center justify-center">
                            <span className="text-[#c16549] text-[16px] font-bold">JD</span>
                        </div>
                        <div>
                            <p className="font-semibold text-[#1E1815] dark:text-white" style={{ fontFamily: "'Newsreader', serif" }}>
                                John Doe
                            </p>
                            <p className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                View Dashboard
                            </p>
                        </div>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="space-y-2">
                        <Link
                            to="/search"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#c16549]/10 transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#c16549]">search</span>
                            Catalog
                        </Link>
                        <Link
                            to="/search?filter=new"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#c16549]/10 transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#c16549]">new_releases</span>
                            New Arrivals
                        </Link>
                        <Link
                            to="/search?filter=staff-picks"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#c16549]/10 transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#c16549]">star</span>
                            Staff Picks
                        </Link>
                        <Link
                            to="/about"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#c16549]/10 transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#c16549]">info</span>
                            About
                        </Link>
                        <div className="border-t border-[#E8E4DF] dark:border-white/10 my-4"></div>
                        <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#1E1815] dark:text-white hover:bg-[#c16549]/10 transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#c16549]">login</span>
                            Admin Login
                        </Link>
                    </nav>
                </div>
            </div>
        </>
    );
}
