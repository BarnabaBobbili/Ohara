// Live Bookshelf Section - Exact copy from Stitch landing_page_-_live_bookshelf_section
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cmsAPI, recommendationsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    headline: 'The Living Library',
    subtitle: 'Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now.',
};

const DEFAULT_BOOKS = [
    { id: null, title: 'The Goldfinch' },
    { id: null, title: 'Dune' },
    { id: null, title: 'Norwegian Wood' },
    { id: null, title: 'Babel' },
    { id: null, title: 'Circe' },
    { id: null, title: 'Infinite Jest' },
    { id: null, title: 'Educated' },
    { id: null, title: 'Tomorrow' },
    { id: null, title: '1984' },
];

const BOOK_LAYOUTS = [
    { className: 'w-12 h-80 bg-[#7d2f26] rounded-sm transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: 'star' },
    { className: 'w-14 h-64 bg-[#2a2a2a] rounded-sm ml-1 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: 'note' },
    { className: 'w-10 h-60 bg-[#d6cfc7] rounded-sm origin-bottom-left -ml-1 transform -rotate-3 hover:rotate-0 hover:-translate-y-2 transition-all duration-500 cursor-pointer z-0 hover:z-20', extra: null },
    { className: 'w-16 h-72 bg-[#5c5c4f] rounded-sm ml-3 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: null },
    { className: 'w-11 h-56 bg-[#2c3e50] rounded-sm ml-0.5 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: 'audio' },
    { className: 'w-20 h-[340px] bg-[#5D4037] rounded-sm ml-1 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: 'bookmark' },
    { className: 'w-8 h-64 bg-[#9c3e34] rounded-sm ml-0.5 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: null },
    { className: 'w-12 h-60 bg-[#78909c] rounded-sm origin-bottom-right ml-4 transform rotate-6 hover:rotate-0 hover:-translate-y-2 transition-all duration-500 cursor-pointer z-0 hover:z-20', extra: null },
    { className: 'w-14 h-72 bg-[#1a1a1a] rounded-sm ml-2 transition-transform duration-300 hover:-translate-y-4 cursor-pointer', extra: null },
];

export default function LiveBookshelf() {
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [books, setBooks] = useState(DEFAULT_BOOKS);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch bookshelf section CMS content
        cmsAPI.getSection('home', 'bookshelf')
            .then((data) => {
                if (data) {
                    setContent({ ...DEFAULT_CONTENT, ...data });
                }
            })
            .catch(() => {});

        // Fetch shelf books from CMS (shelfBooks)
        cmsAPI.getSection('home', 'content')
            .then((data) => {
                if (data?.shelfBooks && Array.isArray(data.shelfBooks) && data.shelfBooks.length > 0) {
                    // Use CMS-configured shelf books (up to 9)
                    const cmsBooks = data.shelfBooks.slice(0, 9);
                    setBooks(DEFAULT_BOOKS.map((fallbackBook, index) => ({
                        ...fallbackBook,
                        ...(cmsBooks[index] || {}),
                    })));
                } else {
                    // Fallback to popular books if no CMS books configured
                    recommendationsAPI.getPopular(9)
                        .then((popularBooks) => {
                            if (Array.isArray(popularBooks) && popularBooks.length) {
                                setBooks(DEFAULT_BOOKS.map((fallbackBook, index) => ({
                                    ...fallbackBook,
                                    ...(popularBooks[index] || {}),
                                })));
                            }
                        })
                        .catch(() => {});
                }
            })
            .catch(() => {
                // Fallback to popular books on error
                recommendationsAPI.getPopular(9)
                    .then((popularBooks) => {
                        if (Array.isArray(popularBooks) && popularBooks.length) {
                            setBooks(DEFAULT_BOOKS.map((fallbackBook, index) => ({
                                ...fallbackBook,
                                ...(popularBooks[index] || {}),
                            })));
                        }
                    })
                    .catch(() => {});
            });
    }, []);

    const handleBookClick = (book) => {
        if (book?.id || book?.book_id) {
            navigate(`/book/${book.id || book.book_id}`, { state: { book, isExternal: false } });
        }
    };

    return (
        <>
            <style>
                {`
          /* Custom scrollbar hiding for clean UI */
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
            </style>

            <div className="bg-[#f8f6f6] dark:bg-[#1e1514] text-[#171312] dark:text-gray-100 transition-colors duration-300"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Section Content */}
                <div className="layout-container flex h-full grow flex-col px-6 lg:px-40 py-12 lg:py-20 relative">
                    {/* Header Section */}
                    <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center max-w-4xl mx-auto">
                        <h1 className="text-[#171312] dark:text-white tracking-tight text-4xl md:text-6xl font-black leading-[1.1] mb-6">
                            {content.headline}
                        </h1>
                        <p className="text-[#826b68] dark:text-gray-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            {content.subtitle}
                        </p>
                    </section>

                    {/* The Bookshelf (Live Feed) */}
                    <section className="w-full relative py-10 overflow-hidden group/shelf">
                        {/* Section Title (Absolute positioned or floating) */}
                        <div className="absolute top-4 left-6 md:left-20 z-10">
                            <div className="flex items-center gap-2 bg-white/80 dark:bg-[#1e1514]/80 backdrop-blur px-3 py-1 rounded-full border border-[#e5e0df] dark:border-[#332524]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7d2f26] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7d2f26]"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#7d2f26]">Live Feed</span>
                            </div>
                        </div>

                        {/* Scroll Container */}
                        <div className="overflow-x-auto no-scrollbar pb-4 pt-16 px-6 md:px-20 w-full flex items-end min-h-[420px]">
                            {/* The Shelf Surface (Visual line) */}
                            <div className="absolute bottom-4 left-0 w-full h-4 bg-gradient-to-r from-[#e3dcd2] via-[#f0ebe5] to-[#e3dcd2] dark:from-[#3e2b29] dark:via-[#4a3634] dark:to-[#3e2b29] shadow-sm z-0"></div>

                            {/* Books Flex Container */}
                            <div className="flex items-end gap-1 px-4 pb-4 z-10 w-max mx-auto md:mx-0">
                                {books.map((book, index) => {
                                    const layout = BOOK_LAYOUTS[index];
                                    const mutedText = index === 2 ? 'text-[#4a4a4a]' : index === 4 ? 'text-blue-100' : index === 6 ? 'text-red-100' : index === 8 ? 'text-white' : 'text-white/90';
                                    const fontSize = index === 5 ? 'text-2xl tracking-tight' : index === 0 || index === 3 || index === 8 ? 'text-lg' : 'text-sm';

                                    return (
                                        <div
                                            key={`${book.title}-${index}`}
                                            className={`group relative ${layout.className}`}
                                            style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}
                                            onClick={() => handleBookClick(book)}
                                        >
                                            {/* Cover image thumbnail if available */}
                                            {book.cover_image_url && (
                                                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[80%] opacity-30 group-hover:opacity-50 transition-opacity overflow-hidden rounded-sm">
                                                    <img 
                                                        src={book.cover_image_url} 
                                                        alt={book.title}
                                                        className="w-full h-full object-cover -rotate-90"
                                                        style={{ transformOrigin: 'center' }}
                                                    />
                                                </div>
                                            )}
                                            
                                            {layout.extra === 'star' && (
                                                <div className="absolute -top-3 right-2 text-yellow-600 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                </div>
                                            )}
                                            {layout.extra === 'note' && (
                                                <div className="absolute -top-2 left-2 w-6 h-4 bg-yellow-100 shadow-sm rounded-t-sm flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[10px] text-gray-800">sticky_note_2</span>
                                                </div>
                                            )}
                                            {layout.extra === 'audio' && (
                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                                                    <span className="material-symbols-outlined text-white/50 text-[14px]">headphones</span>
                                                </div>
                                            )}
                                            {layout.extra === 'bookmark' && (
                                                <>
                                                    <div className="absolute top-8 left-0 right-0 h-16 border-y border-[#4e342e] bg-[#553a32]"></div>
                                                    <div className="absolute -top-4 right-4 w-4 h-8 bg-[#7d2f26] shadow-sm rounded-b-sm"></div>
                                                </>
                                            )}
                                            
                                            {/* Title text on spine */}
                                            <span className={`absolute inset-0 flex items-center justify-center -rotate-90 font-bold ${mutedText} ${fontSize} whitespace-nowrap overflow-hidden px-2 uppercase z-10`}
                                                style={{ fontFamily: "'Newsreader', serif", textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                                                {book.title}
                                            </span>
                                            
                                            {/* Tooltip on hover */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1e1514] text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                <div className="font-bold">{book.title}</div>
                                                {book.author && <div className="text-gray-300">{book.author}</div>}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Your Book CTA */}
                                <div className="ml-8 flex flex-col items-center justify-center h-48 w-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-[#7d2f26] hover:bg-[#7d2f26]/5 cursor-pointer transition-colors group/add"
                                    onClick={() => navigate('/catalog')}>
                                    <div className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/add:bg-[#7d2f26] group-hover/add:text-white transition-colors">
                                        <span className="material-symbols-outlined">add</span>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-gray-500 text-center">Browse the<br />catalog</p>
                                </div>
                            </div>
                        </div>

                        {/* Left/Right Fade Gradient for Scroll hint */}
                        <div className="absolute top-0 bottom-0 left-0 w-8 md:w-20 bg-gradient-to-r from-[#f8f6f6] dark:from-[#1e1514] to-transparent pointer-events-none z-20"></div>
                        <div className="absolute top-0 bottom-0 right-0 w-8 md:w-20 bg-gradient-to-l from-[#f8f6f6] dark:from-[#1e1514] to-transparent pointer-events-none z-20"></div>
                    </section>
                </div>
            </div>
        </>
    );
}
