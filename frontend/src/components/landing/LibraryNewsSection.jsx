// Library News Section - Infinite Marquee with Modal and Images (MySQL)
import { useEffect, useState, useRef } from 'react';
import { newsAPI } from '../../services/api';

const CATEGORY_STYLES = {
    event: { icon: 'event', color: 'text-indigo-600', bg: 'bg-indigo-50', accent: '#4f46e5' },
    update: { icon: 'campaign', color: 'text-[#c16549]', bg: 'bg-orange-50', accent: '#c16549' },
    collection: { icon: 'collections_bookmark', color: 'text-emerald-600', bg: 'bg-emerald-50', accent: '#059669' },
    hours: { icon: 'schedule', color: 'text-amber-600', bg: 'bg-amber-50', accent: '#d97706' },
    program: { icon: 'groups', color: 'text-purple-600', bg: 'bg-purple-50', accent: '#9333ea' },
    general: { icon: 'article', color: 'text-gray-600', bg: 'bg-gray-50', accent: '#4b5563' },
};

const DEFAULT_NEWS = [
    {
        id: 1,
        title: 'Summer Reading Program Begins',
        summary: 'Join our annual summer reading challenge and win prizes while exploring new worlds through books.',
        content: 'We are excited to announce the start of our annual Summer Reading Program! This year\'s theme is "Explore New Worlds" and we have amazing prizes waiting for participants of all ages.\n\nThe program runs from June 1st through August 31st. Sign up at the front desk or online through your library account.\n\nPrizes include:\n- Gift cards to local bookstores\n- Library merchandise\n- Free book of your choice\n- Grand prize: Kindle e-reader\n\nJoin us for the kick-off event on June 1st at 10 AM in the main reading room!',
        category: 'program',
        author: 'Library Staff',
        image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop',
        published_at: new Date().toISOString(),
        is_featured: true,
    },
    {
        id: 2,
        title: 'Extended Hours This Month',
        summary: 'We\'re staying open late every Thursday this month to better serve our community.',
        content: 'Great news for our patrons! Starting this month, the library will extend its hours every Thursday evening.\n\nNew Thursday Hours: 9 AM - 9 PM\n\nThis initiative is in response to community feedback requesting more evening access. Take advantage of the quiet evening hours for studying, research, or simply enjoying a good book.\n\nAll library services will be available during extended hours, including:\n- Book checkout and returns\n- Computer lab access\n- Research assistance\n- Children\'s programs (until 7 PM)',
        category: 'hours',
        author: 'Administration',
        image_url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&h=400&fit=crop',
        published_at: new Date(Date.now() - 86400000).toISOString(),
        is_featured: false,
    },
    {
        id: 3,
        title: 'New Rare Books Collection',
        summary: 'Discover our newly acquired collection of first-edition classics and rare manuscripts.',
        content: 'The Ohara Library is proud to unveil our newest acquisition: The Morrison Collection of Rare Books and Manuscripts.\n\nThis extraordinary collection includes:\n- First edition prints from the 18th and 19th centuries\n- Original manuscripts from renowned authors\n- Historic maps and documents\n- Rare illustrated volumes\n\nThe collection will be housed in our newly renovated Special Collections room on the third floor. Viewing is by appointment only to ensure proper preservation.\n\nA public exhibition showcasing highlights from the collection will run from the 15th to the 30th of this month in the main gallery.',
        category: 'collection',
        author: 'Archivist',
        image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=400&fit=crop',
        published_at: new Date(Date.now() - 172800000).toISOString(),
        is_featured: false,
    },
    {
        id: 4,
        title: 'Author Meet & Greet Event',
        summary: 'Meet bestselling author Jane Morrison this Saturday for a book signing and Q&A session.',
        content: 'We are thrilled to host bestselling author Jane Morrison at Ohara Library!\n\nJane Morrison, author of the acclaimed "Whispers in the Wind" series, will be visiting us for an exclusive meet and greet event.\n\nEvent Details:\n- Date: This Saturday\n- Time: 2 PM - 5 PM\n- Location: Main Auditorium\n\nThe event will include:\n- Reading from her latest novel\n- Q&A session with the audience\n- Book signing (books available for purchase)\n- Photo opportunities\n\nSeating is limited. Please register at the front desk or online to reserve your spot.',
        category: 'event',
        author: 'Events Team',
        image_url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop',
        published_at: new Date(Date.now() - 259200000).toISOString(),
        is_featured: false,
    },
    {
        id: 5,
        title: 'Digital Resources Workshop',
        summary: 'Learn how to access thousands of e-books, audiobooks, and digital magazines with your library card.',
        content: 'Unlock the full potential of your library membership with our Digital Resources Workshop!\n\nMany patrons don\'t realize that their library card gives them free access to:\n- Over 50,000 e-books\n- 20,000+ audiobooks\n- 500+ digital magazines\n- Academic databases and journals\n- Language learning platforms\n\nIn this hands-on workshop, you\'ll learn:\n- How to download and use library apps\n- Setting up your devices for borrowing\n- Tips for finding the best digital content\n- Troubleshooting common issues\n\nBring your smartphone, tablet, or laptop. All skill levels welcome!',
        category: 'program',
        author: 'Digital Services',
        image_url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop',
        published_at: new Date(Date.now() - 345600000).toISOString(),
        is_featured: false,
    },
];

function NewsCard({ news, onClick }) {
    const categoryStyle = CATEGORY_STYLES[news.category] || CATEGORY_STYLES.general;
    const formattedDate = news.published_at
        ? new Date(news.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
          })
        : 'Recent';

    return (
        <article 
            onClick={() => onClick(news)}
            className="group relative flex-shrink-0 w-[340px] bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#E8E4DF] cursor-pointer mx-4"
        >
            {/* Image Section */}
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#1E1815] to-[#3d322c]">
                {news.image_url ? (
                    <img 
                        src={news.image_url} 
                        alt={news.title}
                        className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-white/40">
                                {categoryStyle.icon}
                            </span>
                        </div>
                    </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Category badge on image */}
                <div className="absolute top-3 left-3">
                    <span className={`
                        inline-flex items-center gap-1.5 px-3 py-1 
                        bg-white/95 backdrop-blur-sm ${categoryStyle.color}
                        text-[10px] font-bold tracking-wider uppercase rounded-full shadow-md
                    `}
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        <span className="material-symbols-outlined text-xs">{categoryStyle.icon}</span>
                        {news.category || 'News'}
                    </span>
                </div>
                
                {/* Date badge on image */}
                <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium rounded-full"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        {formattedDate}
                    </span>
                </div>
                
                {/* Accent bar at bottom of image */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: categoryStyle.accent }}
                />
            </div>
            
            {/* Content */}
            <div className="p-5">
                {/* Title */}
                <h3 className="text-lg font-bold text-[#1E1815] leading-tight mb-2 group-hover:text-[#c16549] transition-colors line-clamp-2"
                    style={{ fontFamily: "'Newsreader', serif" }}
                >
                    {news.title}
                </h3>

                {/* Summary */}
                <p className="text-sm text-[#6B6560] leading-relaxed line-clamp-2 mb-4"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                    {news.summary || news.content?.substring(0, 100) + '...'}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E8E4DF]">
                    {news.author ? (
                        <div className="flex items-center gap-2 text-xs text-[#6B6560]"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-sm">person</span>
                            {news.author}
                        </div>
                    ) : (
                        <div />
                    )}
                    <span className="inline-flex items-center gap-1 text-[#c16549] text-xs font-semibold group-hover:gap-2 transition-all"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        Read More
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                </div>
            </div>

            {/* Hover glow effect */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ 
                    boxShadow: `inset 0 0 0 2px ${categoryStyle.accent}40`
                }}
            />
        </article>
    );
}

function NewsModal({ news, onClose }) {
    const categoryStyle = CATEGORY_STYLES[news?.category] || CATEGORY_STYLES.general;
    const formattedDate = news?.published_at
        ? new Date(news.published_at).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          })
        : 'Recent';

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    if (!news) return null;

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#1E1815]/80 backdrop-blur-sm" />
            
            {/* Modal */}
            <div 
                className="relative bg-[#FAF7F2] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: "'Newsreader', serif" }}
            >
                {/* Close button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-[#6B6560] hover:text-[#c16549] hover:scale-110 transition-all z-20"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Hero Image */}
                {news.image_url && (
                    <div className="relative h-56 md:h-72 flex-shrink-0 overflow-hidden">
                        <img 
                            src={news.image_url} 
                            alt={news.title}
                            className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1815]/80 via-[#1E1815]/20 to-transparent" />
                        
                        {/* Category badge on image */}
                        <div className="absolute top-4 left-4">
                            <span className={`
                                inline-flex items-center gap-2 px-4 py-2 
                                bg-white/95 backdrop-blur-sm ${categoryStyle.color}
                                text-sm font-semibold rounded-full shadow-lg
                            `}
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                <span className="material-symbols-outlined text-lg">{categoryStyle.icon}</span>
                                {news.category?.charAt(0).toUpperCase() + news.category?.slice(1) || 'News'}
                            </span>
                        </div>
                        
                        {/* Title overlay on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg">
                                {news.title}
                            </h2>
                        </div>
                    </div>
                )}
                
                {/* If no image, show header differently */}
                {!news.image_url && (
                    <div 
                        className="h-2 w-full flex-shrink-0"
                        style={{ backgroundColor: categoryStyle.accent }}
                    />
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {/* Title (if no image) */}
                    {!news.image_url && (
                        <>
                            <div className="mb-4">
                                <span className={`
                                    inline-flex items-center gap-2 px-4 py-2 
                                    ${categoryStyle.bg} ${categoryStyle.color}
                                    text-sm font-semibold rounded-full
                                `}
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                >
                                    <span className="material-symbols-outlined text-lg">{categoryStyle.icon}</span>
                                    {news.category?.charAt(0).toUpperCase() + news.category?.slice(1) || 'News'}
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[#1E1815] leading-tight mb-6">
                                {news.title}
                            </h2>
                        </>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-[#E8E4DF]">
                        <div className="flex items-center gap-2 text-sm text-[#6B6560]"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-lg text-[#c16549]">calendar_today</span>
                            {formattedDate}
                        </div>
                        {news.author && (
                            <div className="flex items-center gap-2 text-sm text-[#6B6560]"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                                <span className="material-symbols-outlined text-lg text-[#c16549]">person</span>
                                {news.author}
                            </div>
                        )}
                    </div>

                    {/* Article content */}
                    <div 
                        className="prose prose-lg max-w-none"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        {(news.content || news.summary || '').split('\n').map((paragraph, idx) => (
                            paragraph.trim() ? (
                                <p key={idx} className="mb-4 leading-relaxed text-[#3d3530]">
                                    {paragraph}
                                </p>
                            ) : <br key={idx} />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 md:px-8 py-4 bg-white border-t border-[#E8E4DF]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#6B6560] uppercase tracking-wider"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-sm text-[#c16549]">local_library</span>
                            Ohara Library News
                        </div>
                        <button 
                            onClick={onClose}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-[#1E1815] text-white rounded-full text-sm font-medium hover:bg-[#c16549] transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            Close
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LibraryNewsSection() {
    const [news, setNews] = useState(DEFAULT_NEWS);
    const [selectedNews, setSelectedNews] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        newsAPI.getAll()
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setNews(data);
                }
            })
            .catch((err) => {
                console.log('News API error, using defaults:', err.message);
            });
    }, []);

    // Intersection Observer for fade-in animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Duplicate news for seamless infinite scroll
    const marqueeNews = [...news, ...news, ...news];

    return (
        <>
            <style>{`
                @keyframes marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.333%);
                    }
                }
                
                .animate-marquee {
                    animation: marquee 45s linear infinite;
                }
                
                .animate-marquee:hover,
                .animate-marquee.paused {
                    animation-play-state: paused;
                }
            `}</style>

            <section
                ref={sectionRef}
                className="relative bg-[#FAF7F2] dark:bg-[#1e1614] py-20 md:py-28 overflow-hidden"
                style={{ fontFamily: "'Newsreader', serif" }}
            >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#c16549]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c16549]/3 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                {/* Section Header */}
                <div className={`
                    relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 text-center mb-12 md:mb-16
                    transform transition-all duration-700
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                `}>
                    <p className="text-[#c16549] text-sm font-medium tracking-widest uppercase mb-4">
                        03 — News
                    </p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E1815] dark:text-white mb-4">
                        Library News & Updates
                    </h2>
                    <p className="text-lg text-[#6B6560] dark:text-gray-400 italic max-w-2xl mx-auto"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        Stay informed about events, programs, and the latest happenings at Ohara Library
                    </p>
                </div>

                {/* Infinite Marquee */}
                <div 
                    className={`
                        relative z-10 overflow-hidden
                        transform transition-all duration-700 delay-200
                        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                    `}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* Gradient masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#FAF7F2] to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#FAF7F2] to-transparent z-10 pointer-events-none" />
                    
                    {/* Marquee track */}
                    <div 
                        className={`flex py-4 animate-marquee ${isPaused ? 'paused' : ''}`}
                        style={{ width: 'fit-content' }}
                    >
                        {marqueeNews.map((item, idx) => (
                            <NewsCard 
                                key={`${item.id}-${idx}`} 
                                news={item} 
                                onClick={setSelectedNews}
                            />
                        ))}
                    </div>
                </div>

                {/* Hint text */}
                <div className={`
                    relative z-10 text-center mt-8
                    transform transition-all duration-700 delay-300
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                `}>
                    <p className="text-sm text-[#6B6560] flex items-center justify-center gap-2"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        <span className="material-symbols-outlined text-lg text-[#c16549]">touch_app</span>
                        Click on any card to read the full article
                    </p>
                </div>
            </section>

            {/* News Modal */}
            {selectedNews && (
                <NewsModal 
                    news={selectedNews} 
                    onClose={() => setSelectedNews(null)} 
                />
            )}
        </>
    );
}
