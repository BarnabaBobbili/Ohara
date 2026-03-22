// Footer Component - Exact copy from Stitch landing_page_-_final_footer_section
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsAPI, settingsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    columns: [
        {
            title: 'The Archives',
            links: [
                { label: 'Search Catalog', url: '/search' },
                { label: 'Curated Lists', url: '/search?q=collections' },
                { label: 'Rare Editions', url: '/catalog' },
                { label: 'Borrowing History', url: '/dashboard' },
            ],
        },
        {
            title: 'The Community',
            links: [
                { label: 'Discussion Groups', url: '/about' },
                { label: 'Upcoming Readings', url: '/about' },
                { label: 'Member Journals', url: '/dashboard' },
            ],
        },
        {
            title: 'The Keepers',
            links: [
                { label: 'About Us', url: '/about' },
                { label: 'Manifesto', url: '/about' },
                { label: 'Support / FAQ', url: '/about' },
                { label: 'Contact Librarian', url: '/about' },
            ],
        },
    ],
    newsletter_label: 'Join the Registry',
    copyright_text: '© 2024 Library System. All rights reserved.',
};

const renderLink = (link, key) => {
    if (link.url?.startsWith('/')) {
        return (
            <Link key={key} className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" to={link.url}>
                {link.label}
            </Link>
        );
    }

    return (
        <a key={key} className="text-sm font-medium text-[#826b68] dark:text-gray-400 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors duration-200" href={link.url || '#'}>
            {link.label}
        </a>
    );
};

export default function Footer() {
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        cmsAPI.getSection('home', 'footer')
            .then((data) => {
                if (data) {
                    setContent({ ...DEFAULT_CONTENT, ...data });
                }
            })
            .catch(() => {});

        settingsAPI.getAll()
            .then((data) => setSettings(data || {}))
            .catch(() => {});
    }, []);

    const columns = content.columns?.length === 3 ? content.columns : DEFAULT_CONTENT.columns;
    const copyrightText =
        content.copyright_text ||
        `© ${new Date().getFullYear()} ${settings.library_name || 'Library System'}. All rights reserved.`;

    return (
        <footer className="w-full border-t border-[#e5e5e5] dark:border-[#3a2d2c] bg-white dark:bg-[#1e1514] pt-16 pb-12"
            style={{ fontFamily: "'Manrope', sans-serif" }}>
            <div className="max-w-[960px] mx-auto px-6 sm:px-8 lg:px-12">
                {/* 3-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 relative">
                    {/* Column 1: The Archives */}
                    <div className="flex flex-col gap-6 md:pr-10 md:border-r md:border-[#e5e5e5] dark:md:border-[#3a2d2c] relative group">
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">{columns[0]?.title || DEFAULT_CONTENT.columns[0].title}</h3>
                        <ul className="flex flex-col gap-3">
                            {(columns[0]?.links || DEFAULT_CONTENT.columns[0].links).map((link, index) => (
                                <li key={`archives-${index}`}>{renderLink(link, `archives-link-${index}`)}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 2: The Community + Newsletter */}
                    <div className="flex flex-col gap-6 md:px-10 md:border-r md:border-[#e5e5e5] dark:md:border-[#3a2d2c] relative group">
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">{columns[1]?.title || DEFAULT_CONTENT.columns[1].title}</h3>
                        <ul className="flex flex-col gap-3">
                            {(columns[1]?.links || DEFAULT_CONTENT.columns[1].links).map((link, index) => (
                                <li key={`community-${index}`}>{renderLink(link, `community-link-${index}`)}</li>
                            ))}
                        </ul>
                        {/* Subtle Newsletter Input */}
                        <div className="mt-4 pt-6 border-t border-[#e5e5e5] dark:border-gray-700">
                            <label className="block text-xs font-bold text-[#171312] dark:text-gray-200 mb-2 uppercase tracking-wider">{content.newsletter_label}</label>
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
                        <h3 className="text-[#7d2f26] font-bold text-base tracking-wide uppercase">{columns[2]?.title || DEFAULT_CONTENT.columns[2].title}</h3>
                        <ul className="flex flex-col gap-3">
                            {(columns[2]?.links || DEFAULT_CONTENT.columns[2].links).map((link, index) => (
                                <li key={`keepers-${index}`}>{renderLink(link, `keepers-link-${index}`)}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full h-px bg-[#e5e5e5] dark:bg-[#3a2d2c] my-12"></div>

                {/* Colophon / Bottom Row */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                    <p className="text-xs text-[#826b68] dark:text-gray-500 font-medium">{copyrightText}</p>
                    <div className="flex gap-6 items-center">
                        <Link className="text-xs text-[#826b68] dark:text-gray-500 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors" to="/about">Privacy Policy</Link>
                        <span className="text-[#826b68]/30 dark:text-gray-700">|</span>
                        <Link className="text-xs text-[#826b68] dark:text-gray-500 hover:text-[#7d2f26] dark:hover:text-[#7d2f26] transition-colors" to="/about">Terms of Service</Link>
                    </div>
                </div>

                {/* Bookmark Icon */}
                <div className="flex justify-center mt-12">
                    <a className="group flex flex-col items-center gap-2 text-[#826b68] hover:text-[#7d2f26] transition-colors duration-300" href="#hero" title="Back to top">
                        <span className="material-symbols-outlined text-[24px] group-hover:-translate-y-1 transition-transform duration-300">bookmark</span>
                        <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Top</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
