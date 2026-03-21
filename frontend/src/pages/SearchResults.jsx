import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { booksAPI, collectionsAPI, recommendationsAPI } from '../services/api';

const SORT_ORDER = ['relevance', 'title', 'author'];

const normalizeBook = (book) => ({
    ...book,
    id: book.id || book.book_id,
    available_copies: book.available_copies ?? 0,
});

const dedupeBooks = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || '';

    const [searchQuery, setSearchQuery] = useState(query);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [availabilityFilter, setAvailabilityFilter] = useState('available');
    const [sortBy, setSortBy] = useState('relevance');
    const [sectionTitle, setSectionTitle] = useState('Library Catalog');

    useEffect(() => {
        setSearchQuery(query);
    }, [query]);

    useEffect(() => {
        loadResults(query, filter);
    }, [query, filter]);

    const loadResults = async (term, activeFilter) => {
        setLoading(true);

        try {
            let nextBooks = [];
            let nextTitle = 'Library Catalog';

            if (activeFilter === 'staff-picks') {
                nextBooks = (await recommendationsAPI.getPopular(24)).map(normalizeBook);
                nextTitle = 'Staff Picks';
            } else if (activeFilter === 'collections') {
                const collections = await collectionsAPI.getAll();
                nextBooks = collections.flatMap((collection) => collection.books || []).map(normalizeBook);
                nextTitle = 'Curated Collections';
            } else {
                const params = { limit: 40 };
                if (term.trim()) {
                    params.search = term.trim();
                    nextTitle = 'Search Results';
                } else if (activeFilter === 'new') {
                    nextTitle = 'New Arrivals';
                }

                nextBooks = (await booksAPI.getAll(params)).map(normalizeBook);
            }

            setBooks(dedupeBooks(nextBooks));
            setSectionTitle(nextTitle);
        } catch (error) {
            console.error('Search error:', error);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const nextParams = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
            nextParams.set('q', searchQuery.trim());
        } else {
            nextParams.delete('q');
        }
        nextParams.delete('filter');
        setSearchParams(nextParams);
    };

    const handleBookClick = (book) => {
        navigate(`/book/${book.id}`, { state: { book } });
    };

    const handleSortToggle = () => {
        setSortBy((current) => SORT_ORDER[(SORT_ORDER.indexOf(current) + 1) % SORT_ORDER.length]);
    };

    const visibleBooks = [...books]
        .filter((book) => {
            if (availabilityFilter === 'available') return book.available_copies > 0;
            if (availabilityFilter === 'checked_out') return book.available_copies <= 0;
            return true;
        })
        .sort((left, right) => {
            if (sortBy === 'title') return (left.title || '').localeCompare(right.title || '');
            if (sortBy === 'author') return (left.author || '').localeCompare(right.author || '');
            return 0;
        });

    return (
        <>
            <Header />
            <style>
                {`
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

            <div
                className="bg-[#FDFCF8] text-[#181112] min-h-screen flex flex-col overflow-x-hidden pt-24"
                style={{ fontFamily: "'Newsreader', serif" }}
            >
                <main className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full pt-8 pb-20 px-6 gap-8" style={{ minHeight: '600px' }}>
                    <aside className="w-full md:w-72 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-sm border border-[#e6dbdd] p-6 sticky top-28 transform rotate-[-1deg] transition-transform hover:rotate-0 duration-500">
                            <div className="w-4 h-4 rounded-full bg-[#f4f0f1] border border-[#e6dbdd] mx-auto mb-6 shadow-inner"></div>
                            <div className="flex flex-col gap-6">
                                <div className="border-b border-dashed border-[#e6dbdd] pb-4">
                                    <h1 className="text-lg font-bold text-[#181112] tracking-wide mb-1" style={{ fontFamily: "'Courier New', monospace" }}>INDEX_REF: SEARCH</h1>
                                    <p className="text-xs text-[#896168]" style={{ fontFamily: "'Courier New', monospace" }}>Filter by catalog availability</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1" style={{ fontFamily: "'Courier New', monospace" }}>Catalog</p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input checked readOnly className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Library Holdings Only</span>
                                    </label>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1" style={{ fontFamily: "'Courier New', monospace" }}>Availability</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input checked={availabilityFilter === 'available'} onChange={() => setAvailabilityFilter('available')} className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Available Now</span>
                                            <span className="text-[10px] text-[#896168]">Copies on shelf today</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input checked={availabilityFilter === 'checked_out'} onChange={() => setAvailabilityFilter('checked_out')} className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Checked Out</span>
                                            <span className="text-[10px] text-[#896168]">Currently borrowed copies</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input checked={availabilityFilter === 'all'} onChange={() => setAvailabilityFilter('all')} className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Show All</span>
                                            <span className="text-[10px] text-[#896168]">Every catalog record</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 flex flex-col">
                        <div className="mb-12 relative z-20">
                            <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-xl shadow-sm border border-[#e6dbdd] flex items-center max-w-2xl mx-auto">
                                <span className="material-symbols-outlined text-[#896168] px-4">search</span>
                                <input
                                    className="flex-1 border-none focus:ring-0 text-lg placeholder:text-[#896168]/60 bg-transparent text-[#181112]"
                                    placeholder="Search by title, author, or ISBN..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                                <button type="submit" className="bg-[#d41132] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#d41132]/90 transition-colors shadow-sm">
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                            <div className="flex justify-center gap-4 mt-3">
                                <span className="text-xs text-[#896168]">{visibleBooks.length} results found</span>
                                <span className="text-xs text-[#896168]">•</span>
                                <span className="text-xs text-[#896168]">
                                    Sorted by{' '}
                                    <span className="text-[#181112] font-medium border-b border-dotted border-[#181112] cursor-pointer" onClick={handleSortToggle}>
                                        {sortBy === 'relevance' ? 'Relevance' : sortBy === 'title' ? 'Title' : 'Author'}
                                    </span>
                                </span>
                            </div>
                        </div>

                        {loading && (
                            <div className="flex flex-col gap-16 pb-20">
                                <div className="animate-pulse">
                                    <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
                                    <div className="flex gap-8 min-h-[320px]">
                                        {[1, 2, 3, 4].map((item) => (
                                            <div key={item} className="w-[180px] h-[280px] bg-gray-200 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!loading && (
                            <div className="flex flex-col gap-16 pb-20">
                                {visibleBooks.length > 0 && (
                                    <div className="relative">
                                        <div className="absolute -top-10 left-0">
                                            <h3 className="text-xl font-bold text-[#181112] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#d41132] text-xl">local_library</span>
                                                {sectionTitle} ({visibleBooks.length})
                                            </h3>
                                        </div>
                                        <div className="flex items-end gap-2 md:gap-8 px-4 md:px-10 pb-1 border-b-[6px] border-[#e1d5d0] shelf-line min-h-[320px] overflow-x-auto overflow-y-hidden">
                                            {visibleBooks.slice(0, 12).map((book) => (
                                                <div
                                                    key={book.id}
                                                    className="group relative flex-shrink-0 cursor-pointer w-[160px] md:w-[180px] perspective-1000"
                                                    onClick={() => handleBookClick(book)}
                                                >
                                                    <div className="absolute -top-3 left-4 right-4 h-12 bg-[#d41132] rounded-t-sm z-0 transition-all duration-300 group-hover:-top-16 group-hover:shadow-md flex flex-col items-center justify-start pt-2">
                                                        <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                                        <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                                                            {book.available_copies > 0 ? 'Available' : 'Checked Out'}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="relative z-10 w-full aspect-[2/3] rounded-r-md rounded-l-sm transition-all duration-300 bg-white overflow-hidden group-hover:-translate-y-2"
                                                        style={{ boxShadow: '5px 5px 15px rgba(0,0,0,0.15), 2px 2px 5px rgba(0,0,0,0.1)' }}
                                                    >
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
                                                        <p className="text-xs text-[#896168] mt-1">{book.author || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-full h-4 bg-gradient-to-b from-[#000000]/5 to-transparent"></div>
                                    </div>
                                )}

                                {!loading && visibleBooks.length === 0 && (
                                    <div className="text-center py-20">
                                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                                        <h3 className="text-2xl font-bold text-gray-700 mb-2">No books found</h3>
                                        <p className="text-gray-500">Try a different search term or browse another catalog view.</p>
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
