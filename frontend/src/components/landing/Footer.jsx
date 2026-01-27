// Footer Component - Exact copy from Stitch landing_page_-_final_footer_section
export default function Footer() {
    return (
        <footer className="w-full border-t border-[#e5e5e5] dark:border-[#3a2d2c] bg-white dark:bg-[#1e1514] pt-16 pb-12"
            style={{ fontFamily: "'Manrope', sans-serif" }}>
            <div className="max-w-[960px] mx-auto px-6 sm:px-8 lg:px-12">
                {/* 3-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 relative">
                    {/* Column 1: The Archives */}
                    <div className="flex flex-col gap-6 md:pr-10 md:border-r md:border-[#e5e5e5] dark:md:border-[#3a2d2c] relative group">
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">The Archives</h3>
                        <ul className="flex flex-col gap-3">
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Search Catalog</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Curated Lists</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Rare Editions</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Borrowing History</a></li>
                        </ul>
                    </div>

                    {/* Column 2: The Community + Newsletter */}
                    <div className="flex flex-col gap-6 md:px-10 md:border-r md:border-[#e5e5e5] dark:md:border-[#3a2d2c] relative group">
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">The Community</h3>
                        <ul className="flex flex-col gap-3">
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Discussion Groups</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Upcoming Readings</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Member Journals</a></li>
                        </ul>
                        {/* Subtle Newsletter Input */}
                        <div className="mt-4 pt-6 border-t border-[#e5e5e5] dark:border-gray-700">
                            <label className="block text-xs font-bold text-[#171312] dark:text-gray-200 mb-2 uppercase tracking-wider">Join the Registry</label>
                            <div className="relative flex items-center">
                                <input
                                    className="w-full bg-transparent border-b border-[#e5e5e5] dark:border-gray-700 focus:border-[#7d2f26] dark:focus:border-[#7d2f26] border-t-0 border-l-0 border-r-0 px-0 py-2 text-sm text-[#171312] placeholder-[#826b68]/50 focus:ring-0 transition-colors"
                                    placeholder="Email address"
                                    type="email"
                                />
                                <button className="absolute right-0 top-1/2 -translate-y-1/2 text-[#7d2f26] hover:text-[#7d2f26]/80 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: The Keepers */}
                    <div className="flex flex-col gap-6 md:pl-10 relative group">
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">The Keepers</h3>
                        <ul className="flex flex-col gap-3">
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">About Us</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Manifesto</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Support / FAQ</a></li>
                            <li><a className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href="#">Contact Librarian</a></li>
                        </ul>
                    </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full h-px bg-[#e5e5e5] dark:bg-[#3a2d2c] my-12"></div>

                {/* Colophon / Bottom Row */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                    <p className="text-xs text-[#826b68] dark:text-gray-500 font-medium">© 2024 Library System. All rights reserved.</p>
                    <div className="flex gap-6 items-center">
                        <a className="text-xs text-[#826b68] dark:text-gray-500 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors" href="#">Privacy Policy</a>
                        <span className="text-[#826b68]/30 dark:text-gray-700">|</span>
                        <a className="text-xs text-[#826b68] dark:text-gray-500 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors" href="#">Terms of Service</a>
                    </div>
                </div>

                {/* Bookmark Icon */}
                <div className="flex justify-center mt-12">
                    <a className="group flex flex-col items-center gap-2 text-[#826b68] hover:text-[#7d2f26] transition-colors duration-300" href="#" title="Back to top">
                        <span className="material-symbols-outlined text-[24px] group-hover:-translate-y-1 transition-transform duration-300">bookmark</span>
                        <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Top</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
