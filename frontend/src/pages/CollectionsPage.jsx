import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collectionsAPI } from '../services/api';
import Header from '../components/Header';
import { isBookNewArrival } from '../utils/newArrival';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredBookId, setHoveredBookId] = useState(null);
    const [searchParams] = useSearchParams();
    const preselectedId = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;

    useEffect(() => {
        collectionsAPI.getAll()
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                setCollections(list);
                if (list.length > 0) {
                    // Auto-select the id from query param if present
                    const match = preselectedId ? list.find(c => c.id === preselectedId) : null;
                    setSelected(match || list[0]);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setHoveredBookId(null);
    }, [selected?.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center relative overflow-hidden"
                style={{ fontFamily: "'Newsreader', serif" }}>
                {/* Paper grain texture */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
                    <svg className="w-full h-full">
                        <filter id="noise-collections-loading">
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
                        </filter>
                        <rect width="100%" height="100%" filter="url(#noise-collections-loading)"/>
                    </svg>
                </div>
                <div className="text-[#6B6560] text-lg animate-pulse flex items-center gap-2"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    <span className="material-symbols-outlined text-2xl">auto_stories</span>
                    <span>Loading collections…</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .book-stack {
                    position: relative;
                    isolation: isolate;
                    transform-style: preserve-3d;
                    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                    will-change: transform;
                }

                .book-back-cover {
                    position: absolute;
                    top: 10px;
                    left: 8px;
                    right: -6px;
                    bottom: -6px;
                    border-radius: 2px 4px 4px 2px;
                    background: linear-gradient(145deg, #89332a 0%, #c16549 62%, #d88368 100%);
                    box-shadow: -6px 8px 20px rgba(30, 24, 21, 0.18);
                    z-index: 8;
                    transform: translate3d(0, 0, -8px);
                    transition: box-shadow 0.3s ease;
                }

                .book-page-block {
                    position: absolute;
                    top: 8px;
                    right: -5px;
                    bottom: 8px;
                    width: 7px;
                    border-radius: 0 3px 3px 0;
                    background: linear-gradient(to right, #f9f4ea 0%, #efe6d9 55%, #e3d7c7 100%);
                    box-shadow: 1px 0 2px rgba(30, 24, 21, 0.1);
                    z-index: 18;
                    transform: translate3d(0, 0, -2px);
                }

                .book-card-cover {
                    box-shadow: -8px 8px 24px rgba(30, 24, 21, 0.2), -2px 2px 5px rgba(30, 24, 21, 0.1);
                    transform: translate3d(0, 0, 4px);
                    transition: box-shadow 0.3s ease;
                }

                .availability-badge {
                    transform-origin: top center;
                    z-index: 12;
                    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.32s ease;
                }

                .new-arrival-ribbon {
                    position: absolute;
                    top: 12px;
                    right: -34px;
                    width: 132px;
                    background: linear-gradient(90deg, #2f5233 0%, #3c6a42 100%);
                    color: #ffffff;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    text-align: center;
                    padding: 4px 0;
                    transform: rotate(35deg);
                    box-shadow: 0 4px 12px rgba(47, 82, 51, 0.32);
                    z-index: 34;
                    pointer-events: none;
                }

                .book-card {
                    position: relative;
                    z-index: 1;
                    perspective: 1000px;
                    transition: z-index 0s 0.3s, filter 0.24s ease, opacity 0.24s ease;
                }

                .book-card:hover {
                    z-index: 50;
                    transition: z-index 0s 0s;
                }

                .book-card:hover .book-stack {
                    transform: translate3d(0, -10px, 0) rotateX(4deg);
                }

                .book-card:hover .availability-badge {
                    transform: translateY(-22px) scale(1.03);
                    box-shadow: 0 8px 16px rgba(137, 51, 42, 0.26);
                }

                .book-card:hover .book-back-cover {
                    box-shadow: -8px 12px 24px rgba(30, 24, 21, 0.22);
                }

                .book-card:hover .book-card-cover {
                    box-shadow: -12px 16px 32px rgba(30, 24, 21, 0.25), -4px 4px 8px rgba(30, 24, 21, 0.15);
                }
            `}</style>

            <div className="min-h-screen bg-[#FAF7F2] text-[#1E1815] relative overflow-hidden"
                style={{ fontFamily: "'Newsreader', serif" }}>
            
            {/* Paper grain texture overlay */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0">
                <svg className="w-full h-full">
                    <filter id="noise-collections">
                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noise-collections)"/>
                </svg>
            </div>

            <div className="relative z-10">
                <Header />

                {/* Header */}
                <div className="border-b border-[#E8E4DF] pt-24 pb-10 px-6 md:px-16 lg:px-24">
                    <div className="animate-[fadeInUp_0.6s_ease-out]">
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight">All Collections</h1>
                        <p className="text-lg text-[#6B6560] italic mt-3 max-w-xl"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Every collection, curated by our librarians and community.
                        </p>
                    </div>
                    
                    {/* Decorative divider */}
                    <div className="flex items-center gap-3 mt-8">
                        <div className="h-px bg-[#c16549] w-12"></div>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                            <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                            <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                        </div>
                        <div className="h-px bg-[#c16549] flex-1"></div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-24 py-12 gap-10">

                    {/* Left: Collection List */}
                    <aside className="lg:w-80 flex-shrink-0 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
                        <div className="lg:sticky lg:top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-[#c16549] text-xl">collections_bookmark</span>
                                <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6560]"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Collections
                                </h2>
                            </div>
                            <div className="flex flex-col gap-2">
                                {collections.map((col, idx) => (
                                    <button
                                        key={col.id}
                                        onClick={() => setSelected(col)}
                                        style={{
                                            animationDelay: `${0.15 + idx * 0.05}s`,
                                            fontFamily: "'Noto Sans', sans-serif"
                                        }}
                                        className={`animate-[fadeInUp_0.5s_ease-out_both] text-left px-5 py-4 rounded-sm transition-all duration-200 ${
                                            selected?.id === col.id
                                                ? 'bg-[#1E1815] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                                                : 'hover:bg-[#EDEAE5] text-[#1E1815] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                                        }`}
                                    >
                                        <div className="font-semibold text-base mb-1"
                                            style={{ fontFamily: "'Newsreader', serif" }}>
                                            {col.name}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-xs ${
                                                selected?.id === col.id ? 'text-gray-400' : 'text-[#c16549]'
                                            }`}>
                                                auto_stories
                                            </span>
                                            <span className={`text-xs ${
                                                selected?.id === col.id ? 'text-gray-300' : 'text-[#6B6560]'
                                            }`}>
                                                {col.books?.length || 0} {col.books?.length === 1 ? 'book' : 'books'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Right: Books in selected collection */}
                    <main className="flex-1 min-w-0">
                        {selected ? (
                            <>
                                <div className="mb-10 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-2">{selected.name}</h2>
                                    {selected.description && (
                                        <p className="text-[#6B6560] text-lg italic mt-2"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            {selected.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-4 text-sm text-[#6B6560]"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        <span className="material-symbols-outlined text-base">menu_book</span>
                                        <span>{selected.books?.length || 0} {selected.books?.length === 1 ? 'title' : 'titles'} in this collection</span>
                                    </div>
                                </div>

                                {(!selected.books || selected.books.length === 0) ? (
                                    <div className="text-center py-20 animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
                                        <span className="material-symbols-outlined text-5xl text-[#E8E4DF] mb-4">library_books</span>
                                        <p className="text-[#6B6560] italic text-lg"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            No books in this collection yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 md:gap-x-8 gap-y-5 md:gap-y-6">
                                        {selected.books.map((book, idx) => {
                                            const isNewArrival = isBookNewArrival(book);
                                            return (
                                            <Link
                                                to={`/book/${book.id}`}
                                                key={book.id}
                                                style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                                                onMouseEnter={() => setHoveredBookId(book.id)}
                                                onMouseLeave={() => setHoveredBookId(null)}
                                                className={`book-card group cursor-pointer animate-[fadeInUp_0.5s_ease-out_both] ${hoveredBookId !== null && hoveredBookId !== book.id ? 'blur-[1px] opacity-80' : ''}`}
                                            >
                                                <div className="book-stack relative mb-4">
                                                    <div className="availability-badge absolute -top-6 left-3 right-3 h-12 bg-gradient-to-b from-[#c16549] to-[#89332a] rounded-t-sm flex flex-col items-center justify-start pt-2 shadow-md">
                                                        <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                                        <span className="text-[10px] text-white font-bold uppercase tracking-wider"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {book.available_copies > 0 ? 'Available' : 'Checked Out'}
                                                        </span>
                                                    </div>

                                                    <div className="book-back-cover"></div>
                                                    <div className="book-page-block"></div>

                                                    <div className="book-card-cover relative z-20 w-full aspect-[2/3] rounded-r-sm rounded-l-sm bg-[#E8E4DF] border border-[#c16549]/20 overflow-hidden">
                                                        {isNewArrival && (
                                                            <div className="new-arrival-ribbon" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                New Arrival
                                                            </div>
                                                        )}

                                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/30 to-transparent z-30 pointer-events-none"></div>

                                                        {book.cover_image_url ? (
                                                            <>
                                                                <img
                                                                    src={book.cover_image_url}
                                                                    alt={book.title}
                                                                    className="w-full h-full object-cover object-center"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549] flex items-center justify-center p-4">
                                                                <div className="text-center">
                                                                    <span className="material-symbols-outlined text-white/30 text-5xl mb-2 block">
                                                                        auto_stories
                                                                    </span>
                                                                    <p className="text-white/90 text-xs font-bold italic leading-tight"
                                                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                                                        {book.title}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="absolute top-full mt-3 left-0 w-full opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-y-2 group-hover:translate-y-0 text-center px-1 pointer-events-none">
                                                    <h4 className="text-sm font-bold leading-tight line-clamp-2 text-[#1E1815] mb-1"
                                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                                        {book.title}
                                                    </h4>
                                                    <p className="text-xs text-[#6B6560] italic"
                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        {book.author || 'Unknown'}
                                                    </p>
                                                    {book.category && (
                                                        <p className="text-[9px] text-[#c16549] uppercase tracking-wider mt-1 font-semibold"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {book.category}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        )})}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
                                <span className="material-symbols-outlined text-5xl text-[#E8E4DF] mb-4">arrow_back</span>
                                <p className="text-[#6B6560] italic text-lg"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Select a collection from the left.
                                </p>
                            </div>
                        )}
                    </main>

                </div>
            </div>
            </div>
        </>
    );
}
