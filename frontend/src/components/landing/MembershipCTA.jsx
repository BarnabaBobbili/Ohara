// Membership CTA Section - Exact copy from Stitch landing_page_-_membership_cta
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cmsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    headline: 'Begin your journey.',
    subtitle: 'Unlock intelligent cataloging and rediscover the art of your collection. Curate your legacy, one volume at a time.',
    button_text: 'Request Access',
};

export default function MembershipCTA() {
    const [content, setContent] = useState(DEFAULT_CONTENT);

    useEffect(() => {
        cmsAPI.getSection('home', 'membership_cta')
            .then((data) => {
                if (data) {
                    setContent({ ...DEFAULT_CONTENT, ...data });
                }
            })
            .catch(() => {});
    }, []);

    return (
        <div className="relative flex flex-col w-full h-auto min-h-[600px] justify-center items-center bg-[#7d2e26] overflow-hidden"
            style={{ fontFamily: "'Newsreader', serif" }}>
            {/* Background "Leather" Lighting Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0.1)_100%)] pointer-events-none"></div>

            {/* Content Container */}
            <div className="relative z-10 px-6 py-20 md:px-12 md:py-32 max-w-4xl mx-auto flex flex-col items-center text-center gap-10">
                {/* Headlines */}
                <div className="flex flex-col gap-6">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-light italic text-[#fdfbf7] tracking-tight leading-tight drop-shadow-sm">
                        {content.headline}
                    </h2>
                    <p className="text-lg md:text-xl text-[#fdfbf7]/90 max-w-2xl mx-auto font-normal leading-relaxed tracking-wide">
                        {content.subtitle}
                    </p>
                </div>

                {/* CTA Button */}
                <div className="mt-4">
                    <Link to="/signup" className="group flex items-center justify-center gap-3 h-14 px-8 bg-[#fdfbf7] hover:bg-white text-[#7d2e26] transition-all duration-300 rounded-none shadow-xl hover:shadow-2xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#fdfbf7] focus:ring-offset-2 focus:ring-offset-[#7d2e26] cursor-pointer min-w-[220px]">
                        <span className="material-symbols-outlined text-[24px] font-normal transition-transform duration-300 group-hover:rotate-12">ink_pen</span>
                        <span className="text-base font-bold uppercase tracking-widest">{content.button_text}</span>
                    </Link>
                </div>
            </div>

            {/* Decorative Border Lines (Book Binding Feel) */}
            <div className="absolute top-0 left-0 w-full h-px bg-white/10"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-black/20"></div>
        </div>
    );
}
