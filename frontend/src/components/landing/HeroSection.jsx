// Hero Section - "Ohara Entrance" - Editorial Library Design
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cmsAPI, recommendationsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    headline: "Find the book that's been waiting for you.",
    subtitle: 'Browse 50,000+ titles. Reserve instantly.\nYour reading journey, organized.',
    quick_links: [
        { label: 'Browse Catalog', url: '/search' },
        { label: 'New Arrivals', url: '/search?filter=new' },
        { label: 'Staff Picks', url: '/search?filter=staff-picks' },
        { label: 'My Reservations', url: '/dashboard' },
    ],
    stats: { readers_count: 12847, rating: 4.9, reviews_count: 2340 },
};

const DEFAULT_BOOKS = [
    {
        id: null,
        title: 'The Midnight Library',
        cover_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDvUBRGK59hxvaTxLVEGP8fHKTtqwBjsytyIYbww9U8vMR22DBRBqe7_NNhPY4z0gwaorhEMqsnzre3stA7IPiuWzCuETYxZaqVyy7EKPefWNjaSml0AI9GNYLKu7PtvlLgwYl1Vu-JENHrsPZSxqrKH6Pv5zp5QLb8VOxM8U0L5AeWeIt5RWuBlDQUy8hno56roDxuEBa1kp_tBKcz_h2JqBCLZVh4cNURDMkKxwrmxHmsqLh9qdAmwT-OcUJC9-Qski9EsGRz6Im8",
    },
    {
        id: null,
        title: 'Classic Literature',
        cover_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDMCU_uFcSewu-AAMLV3noc_iacRMHOT_uf831BK2M5zf7-eHNK7hRsbNDBJQAxoe4L-mzQvopAp-Kj3CnNu2967k18fxd0vsvUO27tQMxYajn0MWs-ZZ3g2Vr9Z3XH6H3zXFjwsw3DtkYRYf3PLMaahxREza5wxz03S2IcFUKwOZZDiw7pEbXgFMSXHZSy8Kbo3CqMbjtxNA2h3QbTap3bUEgWU7zne3HN8XJBEwtU9eHcWfZYfh46T8Oays7I6C2OnLAZcG1AbRe",
    },
    {
        id: null,
        title: 'Botanical Studies',
        cover_image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCiuq8EDDqTk3EM1DM0En_QVBxOrIxFV8pR6DEb4XSNT3LYRAexZh6hfpwH08KRNvys1wdnc9AMHrYQAkTUyK-qTBuNk0cyL5mI5RVLiPpArsOvMbf_CXsRscEIsk8sKJBdCiAG0mcBYwWOSBLGUNeSLziCPfrZQRqynD3Ypsbte9PYxPDLjTo9l2eQealGbmuoiabupNnp69Lz_9TsceySK7856enXBcZfO14dt6pZALKKQJdHXexTgJYXqdZjhSgdURFsLsw67JZ1",
    },
];

const splitHeadline = (headline) => {
    if (!headline) return ['Find the book', "that's been", 'waiting for you.'];
    if (headline.includes('\n')) {
        const parts = headline.split('\n').filter(Boolean);
        return [parts[0] || '', parts[1] || '', parts[2] || ''];
    }

    const words = headline.trim().split(/\s+/);
    return [
        words.slice(0, 3).join(' ') || headline,
        words.slice(3, 5).join(' '),
        words.slice(5).join(' '),
    ];
};

export default function HeroSection() {
    const [searchQuery, setSearchQuery] = useState('');
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [featuredBooks, setFeaturedBooks] = useState(DEFAULT_BOOKS);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch hero section CMS content
        cmsAPI.getSection('home', 'hero')
            .then((data) => {
                if (data) {
                    setContent({ ...DEFAULT_CONTENT, ...data });
                }
            })
            .catch(() => {});

        // Fetch featured books from CMS (heroBooks)
        cmsAPI.getSection('home', 'content')
            .then((data) => {
                if (data?.heroBooks && Array.isArray(data.heroBooks) && data.heroBooks.length > 0) {
                    // Use CMS-configured hero books (up to 3)
                    const cmsBooks = data.heroBooks.slice(0, 3);
                    setFeaturedBooks([
                        { ...DEFAULT_BOOKS[0], ...cmsBooks[0] },
                        cmsBooks[1] ? { ...DEFAULT_BOOKS[1], ...cmsBooks[1] } : DEFAULT_BOOKS[1],
                        cmsBooks[2] ? { ...DEFAULT_BOOKS[2], ...cmsBooks[2] } : DEFAULT_BOOKS[2],
                    ]);
                } else {
                    // Fallback to popular books if no CMS books configured
                    recommendationsAPI.getPopular(3)
                        .then((books) => {
                            if (Array.isArray(books) && books.length) {
                                setFeaturedBooks([
                                    { ...DEFAULT_BOOKS[0], ...books[0] },
                                    { ...DEFAULT_BOOKS[1], ...books[1] },
                                    { ...DEFAULT_BOOKS[2], ...books[2] },
                                ]);
                            }
                        })
                        .catch(() => {});
                }
            })
            .catch(() => {
                // Fallback to popular books on error
                recommendationsAPI.getPopular(3)
                    .then((books) => {
                        if (Array.isArray(books) && books.length) {
                            setFeaturedBooks([
                                { ...DEFAULT_BOOKS[0], ...books[0] },
                                { ...DEFAULT_BOOKS[1], ...books[1] },
                                { ...DEFAULT_BOOKS[2], ...books[2] },
                            ]);
                        }
                    })
                    .catch(() => {});
            });
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const headlineLines = splitHeadline(content.headline);
    const quickLinks = content.quick_links?.length === 4 ? content.quick_links : DEFAULT_CONTENT.quick_links;

    return (
        <>
            <style>
                {`
          /* Custom Styles for specific editorial touches */
          .editorial-shadow {
              box-shadow: 0 4px 20px -2px rgba(30, 24, 21, 0.08);
          }
          .book-shadow {
              box-shadow: -10px 10px 30px rgba(0,0,0,0.25), 
                          -2px 2px 5px rgba(0,0,0,0.1);
          }
          .dotted-underline {
              text-decoration: underline;
              text-decoration-style: dotted;
              text-decoration-color: #c16549;
              text-underline-offset: 4px;
          }
          .dotted-underline:hover {
              text-decoration-style: solid;
          }
          
          /* Paper grain texture */
          .bg-paper-grain {
              background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
          }
        `}
            </style>

            <div className="bg-[#FAF7F2] dark:bg-[#1e1614] text-[#1E1815] dark:text-[#FAF7F2] min-h-screen flex flex-col font-display antialiased relative pt-20"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Grain Texture Overlay */}
                <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>

                {/* Main Hero Content */}
                <main className="relative z-30 flex-grow flex flex-col justify-center w-full px-6 md:px-12 lg:px-20 py-10 lg:py-0">
                    <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center h-full">

                        {/* Left Column: Editorial Text & Search (7 Cols) */}
                        <div className="lg:col-span-7 flex flex-col justify-center space-y-10 lg:pr-12">
                            {/* Headlines */}
                            <div className="space-y-6">
                                <h1 className="text-5xl md:text-6xl lg:text-[72px] font-bold leading-[1.05] tracking-tight text-[#1E1815] dark:text-white">
                                    <span className="block">{headlineLines[0] || 'Find the book'}</span>
                                    <span className="block ml-0 lg:ml-16">{headlineLines[1] || "that's been"}</span>
                                    <span className="block">{headlineLines[2] || 'waiting for you.'}</span>
                                </h1>
                                <p className="font-sans italic text-lg md:text-xl text-[#6B6560] dark:text-gray-400 max-w-lg leading-relaxed ml-1"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {content.subtitle?.split('\n')[0] || 'Browse 50,000+ titles. Reserve instantly.'}
                                    <br className="hidden md:block" />
                                    {' '}
                                    {content.subtitle?.split('\n')[1] || 'Your reading journey, organized.'}
                                </p>
                            </div>

                            {/* Editorial Search Bar */}
                            <form onSubmit={handleSearch} className="w-full max-w-[520px]">
                                <div className="relative group">
                                    <input
                                        className="w-full h-[64px] pl-14 pr-6 bg-white dark:bg-white/10 border border-[#E8E4DF] dark:border-white/20 rounded-full text-base font-sans text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all editorial-shadow"
                                        placeholder="Search by title, author, or ISBN..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                    />
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#c16549]">
                                        <span className="material-symbols-outlined text-2xl">search</span>
                                    </div>
                                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#c16549]/10 hover:bg-[#c16549]/20 text-[#c16549] p-2 rounded-full transition-colors dark:bg-white/10 dark:hover:bg-white/20">
                                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                    </button>
                                </div>
                            </form>

                            {/* Pill Links */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm md:text-base font-medium text-[#1E1815] dark:text-gray-200"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                <Link to={quickLinks[0]?.url || '/search'} className="dotted-underline transition-all">{quickLinks[0]?.label || 'Browse Catalog'}</Link>
                                <span className="text-[#c16549]/40">•</span>
                                <Link to={quickLinks[1]?.url || '/search?filter=new'} className="dotted-underline transition-all">{quickLinks[1]?.label || 'New Arrivals'}</Link>
                                <span className="text-[#c16549]/40">•</span>
                                <Link to={quickLinks[2]?.url || '/search?filter=staff-picks'} className="dotted-underline transition-all">{quickLinks[2]?.label || 'Staff Picks'}</Link>
                                <span className="text-[#c16549]/40">•</span>
                                <Link to={quickLinks[3]?.url || '/dashboard'} className="dotted-underline transition-all">{quickLinks[3]?.label || 'My Reservations'}</Link>
                            </div>

                            {/* Social Proof Footer */}
                            <div className="pt-8 lg:pt-16">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1e1614] bg-gray-200 bg-center bg-cover"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDl8r6aduuMeMhWiXLar-sh8RxQST2Ys261KzjzH9A6PUujNRfAdfw8CYI7Ofr6NCD7jYcOSpaNHl0A3c6jLCnbjrKLcyGHuhT5m5S_1oQQskku7-NtRRzCTD8h17AG1DoPf83SOl5gGgBtSYf7vP9LzJ3gd5QcRmXeUY359go45VE0-3UjK3Wc7YMYM6_1lzXy0bPwTfHvC5KYlcF25563h9TPkWH7TLWrSEeGhOLhUFJJDNOKHTRH4PjcifPiPRWjszkb8xiWpQ-X')" }}>
                                        </div>
                                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1e1614] bg-gray-300 bg-center bg-cover"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_hyIdBIPlVabJX1aCRDtf1vd32PHxUN61pCu36eITHnkMDOgcotH55EvJ7JwlqOJlWEgbEKJtsmUx47EIzgnsTEBh96yzVOeDXvpLvyP4nS6M1oM4C7i8g95qznSNEGLukKLUYYKOGBm_SA0pzreRSeX4XxDpBJEdOlBFdQd1is6MryS0xQeeNO_Hyz9clgDSrn8eDtYgV3UGES7S9mLEFCXCTPMq9gWjsMZIBnPkSnkzr3PFJwHJGOVet16PQO9Iery0mEAG0DpK')" }}>
                                        </div>
                                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1e1614] bg-gray-400 bg-center bg-cover"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB2BU10hCsrAJkxjYSlCUuG3IYrbpE4MeLfKw9fOqb1St31uqyO7Y5DdaEdz4cYYQaHG_FK3n06O8HW6WswHfiBnIUjApmejHnbVc6X7EyFfoySXUUYOWXltQQ9IncuaDqkBiL3BDWBiItJPyUoyu_KCyuS7TBghQi2arh64ZTD9YHFBPo5NpWvxT--whSVqJ41TbTmIe-5bwh__J_X0VfSajlsHkeQZbWqVsFH93EFS3YSY-inxpe6NvO6cMaqnokVCbEIVQeiqML4')" }}>
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-bold tracking-widest uppercase text-[#6B6560] dark:text-gray-400"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Currently serving {content.stats?.readers_count || DEFAULT_CONTENT.stats.readers_count} readers · <span className="text-[#c16549]">{(content.stats?.rating || DEFAULT_CONTENT.stats.rating).toFixed(1)}★</span> from {content.stats?.reviews_count || DEFAULT_CONTENT.stats.reviews_count} reviews
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Visual Book Stack (5 Cols) */}
                        <div className="lg:col-span-5 relative h-[500px] lg:h-[800px] flex items-center justify-center lg:justify-end" style={{ perspective: '1000px' }}>
                            <div className="relative w-full max-w-md h-full flex flex-col items-center justify-center space-y-[-140px] lg:space-y-[-180px]">

                                {/* Book 1 (Bottom) */}
                                <Link to={featuredBooks[0]?.id ? `/book/${featuredBooks[0].id}` : '/catalog'} className="relative w-[280px] lg:w-[340px] aspect-[3/4] rounded-r-2xl rounded-l-sm bg-[#1e293b] book-shadow transform rotate-[3deg] z-10 transition-transform hover:scale-105 duration-500 overflow-hidden border-l-8 border-[#334155]">
                                    {featuredBooks[0]?.cover_image_url ? (
                                        <img 
                                            src={featuredBooks[0].cover_image_url} 
                                            alt={featuredBooks[0]?.title}
                                            className="absolute inset-0 w-full h-full object-cover object-center"
                                        />
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800"></div>
                                            <div className="absolute top-10 right-8 text-right">
                                                <h3 className="text-slate-200 font-display text-2xl italic">
                                                    {featuredBooks[0]?.title?.split(' ').slice(0, 2).join(' ') || 'The Midnight'}
                                                    <br />
                                                    {featuredBooks[0]?.title?.split(' ').slice(2).join(' ') || 'Library'}
                                                </h3>
                                            </div>
                                        </>
                                    )}
                                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/20 to-transparent"></div>
                                </Link>

                                {/* Book 2 (Middle) */}
                                <Link to={featuredBooks[1]?.id ? `/book/${featuredBooks[1].id}` : '/catalog'} className="relative w-[270px] lg:w-[330px] aspect-[3/4] rounded-r-2xl rounded-l-sm bg-[#4a1c1c] book-shadow transform -rotate-[2deg] z-20 transition-transform hover:scale-105 duration-500 overflow-hidden border-l-8 border-[#6b2626]">
                                    {featuredBooks[1]?.cover_image_url ? (
                                        <img 
                                            src={featuredBooks[1].cover_image_url} 
                                            alt={featuredBooks[1]?.title}
                                            className="absolute inset-0 w-full h-full object-cover object-center"
                                        />
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-red-950"></div>
                                            <div className="absolute bottom-12 left-8">
                                                <h3 className="text-orange-100 font-display text-3xl font-bold tracking-tight">
                                                    {(featuredBooks[1]?.title || 'Classic Literature').split(' ').slice(0, 1).join(' ')}
                                                    <br />
                                                    {(featuredBooks[1]?.title || 'Classic Literature').split(' ').slice(1).join(' ')}
                                                </h3>
                                            </div>
                                        </>
                                    )}
                                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/20 to-transparent"></div>
                                </Link>

                                {/* Book 3 (Top) */}
                                <Link to={featuredBooks[2]?.id ? `/book/${featuredBooks[2].id}` : '/catalog'} className="relative w-[260px] lg:w-[320px] aspect-[3/4] rounded-r-2xl rounded-l-sm bg-[#143d28] book-shadow transform rotate-[4deg] z-30 transition-transform hover:scale-105 duration-500 overflow-hidden border-l-8 border-[#1e573a]">
                                    {featuredBooks[2]?.cover_image_url ? (
                                        <img 
                                            src={featuredBooks[2].cover_image_url} 
                                            alt={featuredBooks[2]?.title}
                                            className="absolute inset-0 w-full h-full object-cover object-center"
                                        />
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-green-950"></div>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-3/4 p-4 border border-green-100/30">
                                                <h3 className="text-green-50 font-display text-xl uppercase tracking-widest">
                                                    {(featuredBooks[2]?.title || 'Botanical Studies').split(' ').slice(0, 1).join(' ')}
                                                    <br />
                                                    {(featuredBooks[2]?.title || 'Botanical Studies').split(' ').slice(1).join(' ')}
                                                </h3>
                                                <p className="text-green-100/70 text-xs mt-2 font-sans">Vol. IV</p>
                                            </div>
                                        </>
                                    )}
                                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/20 to-transparent"></div>
                                </Link>

                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </>
    );
}
