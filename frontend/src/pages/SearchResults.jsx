// Enhanced Search Results Page - Integrates local + external books
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BACKEND_ORIGIN } from '../config/api';

const BACKEND_URL = BACKEND_ORIGIN;

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [externalBooks, setExternalBooks] = useState([]);
    const [localBooks, setLocalBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState(['Fiction']);
    const [sortBy, setSortBy] = useState('relevance');

    useEffect(() => {
        if (searchQuery) {
            handleSearch(searchQuery);
        }
    }, []);

    const handleSearch = async (query) => {
        if (!query.trim()) return;

        setLoading(true);
        try {
            // Search external books
            const externalRes = await fetch(
                `${BACKEND_URL}/api/external-books/search?q=${encodeURIComponent(query)}`
            );
            if (externalRes.ok) {
                const externalData = await externalRes.json();
                setExternalBooks(externalData.results || []);
            }

            // Search local books
            const localRes = await fetch(
                `${BACKEND_URL}/api/books?search=${encodeURIComponent(query)}`
            );
            if (localRes.ok) {
                const localData = await localRes.json();
                setLocalBooks(localData || []);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleSearch(searchQuery);
    };

    const handleBookClick = (book) => {
        if (book.source) {
            // External book - use source-sourceId format
            const bookId = `${book.source}-${book.source_id}`;
            navigate(`/book/${bookId}`, { state: { book, isExternal: true } });
        } else {
            // Local book - use regular ID
            navigate(`/book/${book.id}`, { state: { book, isExternal: false } });
        }
    };

    const totalResults = externalBooks.length + localBooks.length;

    return (
        <>
            <Header />
            <style>
                {`
          /* Custom Scrollbar for a cleaner look */
          ::-webkit-scrollbar {
            width: 8px
          }
          ::-webkit-scrollbar-track {
            background: transparent
          }
          ::-webkit-scrollbar-thumb {
            background: #e5e5e5;
            border-radius: 4px
          }
          .shelf-line {
            background: linear-gradient(90deg, rgba(215, 192, 165, 0.2) 0%, rgba(137, 97, 104, 0.4) 50%, rgba(215, 192, 165, 0.2) 100%)
          }
        `}
            </style>

            <div className="bg-[#FDFCF8] text-[#181112] min-h-screen flex flex-col overflow-x-hidden pt-24"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Main Layout - Fixed heights to prevent jumping */}
                <main className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full pt-8 pb-20 px-6 gap-8" style={{ minHeight: '600px' }}>
                    {/* Sidebar (Index Card Style) */}
                    <aside className="w-full md:w-72 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-sm border border-[#e6dbdd] p-6 sticky top-28 transform rotate-[-1deg] transition-transform hover:rotate-0 duration-500">
                            {/* Index Card Hole */}
                            <div className="w-4 h-4 rounded-full bg-[#f4f0f1] border border-[#e6dbdd] mx-auto mb-6 shadow-inner"></div>
                            <div className="flex flex-col gap-6">
                                <div className="border-b border-dashed border-[#e6dbdd] pb-4">
                                    <h1 className="text-lg font-bold text-[#181112] tracking-wide mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>INDEX_REF: SEARCH</h1>
                                    <p className="text-xs text-[#896168]"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Filter by properties</p>
                                </div>

                                {/* Source Filter */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Source</p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input checked className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">📚 Library Catalog</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input defaultChecked className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">🌍 Free Books</span>
                                    </label>
                                </div>

                                {/* Availability */}
                                <div className="flex flex-col gap-3 pt-2">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Availability</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input defaultChecked className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">🟢 Instant Read</span>
                                            <span className="text-[10px] text-[#896168]">Free & public domain</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">🟡 Borrowable</span>
                                            <span className="text-[10px] text-[#896168]">14-day lending</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Show All</span>
                                            <span className="text-[10px] text-[#896168]">Including purchase</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col">
                        {/* Search Header */}
                        <div className="mb-12 relative z-20">
                            <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-xl shadow-sm border border-[#e6dbdd] flex items-center max-w-2xl mx-auto">
                                <span className="material-symbols-outlined text-[#896168] px-4">search</span>
                                <input
                                    className="flex-1 border-none focus:ring-0 text-lg placeholder:text-[#896168]/60 bg-transparent text-[#181112]"
                                    placeholder="Search by title, author, or ISBN..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button type="submit" className="bg-[#d41132] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#d41132]/90 transition-colors shadow-sm">
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                            <div className="flex justify-center gap-4 mt-3">
                                <span className="text-xs text-[#896168]">{totalResults} results found</span>
                                <span className="text-xs text-[#896168]">•</span>
                                <span className="text-xs text-[#896168]">Sorted by <span className="text-[#181112] font-medium border-b border-dotted border-[#181112] cursor-pointer">{sortBy === 'relevance' ? 'Relevance' : 'Title'}</span></span>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col gap-16 pb-20">
                                <div className="animate-pulse">
                                    <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
                                    <div className="flex gap-8 min-h-[320px]">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-[180px] h-[280px] bg-gray-200 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content: The Shelves */}
                        {!loading && (
                            <div className="flex flex-col gap-16 pb-20">
                                {/* Shelf 1: External Free Books */}
                                {externalBooks.length > 0 && (
                                    <div className="relative">
                                        <div className="absolute -top-10 left-0">
                                            <h3 className="text-xl font-bold text-[#181112] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#d41132] text-xl">public</span>
                                                Free Books ({externalBooks.length})
                                            </h3>
                                        </div>
                                        {/* Shelf Surface */}
                                        <div className="flex items-end gap-2 md:gap-8 px-4 md:px-10 pb-1 border-b-[6px] border-[#e1d5d0] shelf-line min-h-[320px] overflow-x-auto overflow-y-hidden">
                                            {externalBooks.slice(0, 8).map((book, idx) => (
                                                <div
                                                    key={`external-${idx}`}
                                                    className="group relative flex-shrink-0 cursor-pointer w-[160px] md:w-[180px] perspective-1000"
                                                    onClick={() => handleBookClick(book)}
                                                >
                                                    {/* Bookmark Tab */}
                                                    <div className={`absolute -top-3 left-4 right-4 h-12 rounded-t-sm z-0 transition-all duration-300 group-hover:-top-16 group-hover:shadow-md flex flex-col items-center justify-start pt-2 ${book.is_public_domain ? 'bg-green-600' : book.can_borrow ? 'bg-yellow-600' : 'bg-gray-600'
                                                        }`}>
                                                        <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                                        <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                                                            {book.is_public_domain ? 'Free' : book.can_borrow ? 'Borrow' : 'Preview'}
                                                        </span>
                                                    </div>
                                                    {/* Book Cover */}
                                                    <div className="relative z-10 w-full aspect-[2/3] rounded-r-md rounded-l-sm transition-all duration-300 bg-white overflow-hidden group-hover:-translate-y-2"
                                                        style={{ boxShadow: '5px 5px 15px rgba(0,0,0,0.15), 2px 2px 5px rgba(0,0,0,0.1)' }}>
                                                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
                                                        {book.cover_url ? (
                                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-6xl text-gray-400">auto_stories</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Tooltip Info */}
                                                    <div className="absolute top-full mt-4 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 text-center">
                                                        <h4 className="text-sm font-bold leading-tight line-clamp-2">{book.title}</h4>
                                                        <p className="text-xs text-[#896168] mt-1">{book.author || 'Unknown'}</p>
                                                        <p className="text-[10px] text-[#896168] mt-1">
                                                            {book.source === 'gutenberg' ? 'Gutenberg' :
                                                                book.source === 'internet_archive' ? 'Archive.org' :
                                                                    book.source === 'openlibrary' ? 'Open Library' : 'Google Books'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Shelf Shadow underneath */}
                                        <div className="w-full h-4 bg-gradient-to-b from-[#000000]/5 to-transparent"></div>
                                    </div>
                                )}

                                {/* Shelf 2: Local Library Books */}
                                {localBooks.length > 0 && (
                                    <div className="relative">
                                        <div className="absolute -top-10 left-0">
                                            <h3 className="text-xl font-bold text-[#181112] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#d41132] text-xl">local_library</span>
                                                Library Catalog ({localBooks.length})
                                            </h3>
                                        </div>
                                        <div className="flex items-end gap-2 md:gap-8 px-4 md:px-10 pb-1 border-b-[6px] border-[#e1d5d0] shelf-line min-h-[320px] overflow-x-auto overflow-y-hidden">
                                            {localBooks.slice(0, 8).map((book, idx) => (
                                                <div
                                                    key={`local-${idx}`}
                                                    className="group relative flex-shrink-0 cursor-pointer w-[160px] md:w-[180px] perspective-1000"
                                                    onClick={() => handleBookClick(book)}
                                                >
                                                    <div className={`absolute -top-3 left-4 right-4 h-12 bg-[#d41132] rounded-t-sm z-0 transition-all duration-300 group-hover:-top-16 group-hover:shadow-md flex flex-col items-center justify-start pt-2`}>
                                                        <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                                        <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                                                            {book.available_copies > 0 ? 'Available' : 'Checked Out'}
                                                        </span>
                                                    </div>
                                                    <div className="relative z-10 w-full aspect-[2/3] rounded-r-md rounded-l-sm transition-all duration-300 bg-white overflow-hidden group-hover:-translate-y-2"
                                                        style={{ boxShadow: '5px 5px 15px rgba(0,0,0,0.15), 2px 2px 5px rgba(0,0,0,0.1)' }}>
                                                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
                                                        {book.cover_image_url ? (
                                                            <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-6xl text-gray-400">book</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute top-full mt-4 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 text-center">
                                                        <h4 className="text-sm font-bold leading-tight line-clamp-2">{book.title}</h4>
                                                        <p className="text-xs text-[#896168] mt-1">{book.author}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-full h-4 bg-gradient-to-b from-[#000000]/5 to-transparent"></div>
                                    </div>
                                )}

                                {/* No Results */}
                                {!loading && totalResults === 0 && searchQuery && (
                                    <div className="text-center py-20">
                                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                                        <h3 className="text-2xl font-bold text-gray-700 mb-2">No books found</h3>
                                        <p className="text-gray-500">Try a different search term or browse our catalog</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
