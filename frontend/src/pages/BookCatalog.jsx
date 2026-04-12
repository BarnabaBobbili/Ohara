import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import WishlistButton from '../components/books/WishlistButton';
import StarRating from '../components/reviews/StarRating';
import { booksAPI, collectionsAPI, recommendationsAPI } from '../services/api';
import { isBookNewArrival } from '../utils/newArrival';

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

export default function BookCatalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [hoveredBookId, setHoveredBookId] = useState(null);
    const [sortBy, setSortBy] = useState('title');
    const [filterCategory, setFilterCategory] = useState('all');
    const [availabilityFilter, setAvailabilityFilter] = useState('available');
    const [sectionTitle, setSectionTitle] = useState('Library Catalog');
    const [allCategories, setAllCategories] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const navigate = useNavigate();

    useEffect(() => {
        const query = searchParams.get('q') || '';
        const activeFilter = searchParams.get('filter') || '';
        setSearchQuery(query);
        if (activeFilter === 'new') {
            setSortBy('year');
        }
        setCurrentPage(1);
    }, [searchParams]);

    useEffect(() => {
        booksAPI.getCategories()
            .then((categories) => {
                if (Array.isArray(categories)) {
                    setAllCategories(categories.filter(Boolean));
                }
            })
            .catch(() => {
                setAllCategories([]);
            });
    }, []);

    const loadBooks = useCallback(async ({ search = '', activeFilter = '', page = 1, perPage = 50 } = {}) => {
        setLoading(true);
        try {
            let loadedBooks = [];
            let nextTitle = 'Library Catalog';
            let nextPagination = {
                page,
                limit: perPage,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: page > 1,
            };

            const applyLocalPresetFilters = (items) => {
                const filtered = items.filter((book) => {
                    if (filterCategory !== 'all' && (book.category || 'Uncategorized') !== filterCategory) {
                        return false;
                    }
                    if (availabilityFilter === 'available') return book.available_copies > 0;
                    if (availabilityFilter === 'checked_out') return book.available_copies <= 0;
                    return true;
                });

                return filtered.sort((left, right) => {
                    if (sortBy === 'popular') {
                        const leftPopularity = Number(left.borrow_count ?? left.score ?? left.rating_count ?? 0);
                        const rightPopularity = Number(right.borrow_count ?? right.score ?? right.rating_count ?? 0);
                        if (rightPopularity !== leftPopularity) {
                            return rightPopularity - leftPopularity;
                        }
                    }
                    if (sortBy === 'author') return (left.author || '').localeCompare(right.author || '');
                    if (sortBy === 'year') return (right.publication_year || 0) - (left.publication_year || 0);
                    return (left.title || '').localeCompare(right.title || '');
                });
            };

            if (activeFilter === 'staff-picks') {
                const allStaffPicks = applyLocalPresetFilters(
                    dedupeBooks((await recommendationsAPI.getPopular(400)).map(normalizeBook))
                );
                const total = allStaffPicks.length;
                const totalPages = total > 0 ? Math.ceil(total / perPage) : 0;
                const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
                const start = (safePage - 1) * perPage;
                loadedBooks = allStaffPicks.slice(start, start + perPage);
                nextPagination = {
                    page: safePage,
                    limit: perPage,
                    total,
                    total_pages: totalPages,
                    has_next: totalPages > 0 && safePage < totalPages,
                    has_prev: safePage > 1,
                };
                nextTitle = 'Staff Picks';
            } else if (activeFilter === 'collections') {
                const collections = await collectionsAPI.getAll();
                const allCollectionBooks = applyLocalPresetFilters(
                    dedupeBooks(
                        collections.flatMap((collection) => collection.books || []).map(normalizeBook)
                    )
                );
                const total = allCollectionBooks.length;
                const totalPages = total > 0 ? Math.ceil(total / perPage) : 0;
                const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
                const start = (safePage - 1) * perPage;
                loadedBooks = allCollectionBooks.slice(start, start + perPage);
                nextPagination = {
                    page: safePage,
                    limit: perPage,
                    total,
                    total_pages: totalPages,
                    has_next: totalPages > 0 && safePage < totalPages,
                    has_prev: safePage > 1,
                };
                nextTitle = 'Curated Collections';
            } else {
                const params = {
                    paginate: 'true',
                    page,
                    limit: perPage,
                    sort_by: sortBy === 'author'
                        ? 'author'
                        : sortBy === 'year'
                            ? 'publication_year'
                            : sortBy === 'popular'
                                ? 'popular'
                                : 'title',
                    sort_order: (sortBy === 'year' || sortBy === 'popular') ? 'desc' : 'asc',
                };
                if (search.trim()) {
                    params.search = search.trim();
                    nextTitle = 'Search Results';
                } else if (activeFilter === 'new') {
                    nextTitle = 'New Arrivals';
                    params.new_only = 'true';
                }

                if (filterCategory !== 'all') {
                    params.category = filterCategory;
                }

                if (availabilityFilter !== 'all') {
                    params.availability = availabilityFilter;
                }

                const response = await booksAPI.getAll(params);
                loadedBooks = (Array.isArray(response?.items) ? response.items : []).map(normalizeBook);
                nextPagination = {
                    page: Number(response?.pagination?.page || page),
                    limit: Number(response?.pagination?.limit || perPage),
                    total: Number(response?.pagination?.total || 0),
                    total_pages: Number(response?.pagination?.total_pages || 0),
                    has_next: Boolean(response?.pagination?.has_next),
                    has_prev: Boolean(response?.pagination?.has_prev),
                };
            }

            setBooks(dedupeBooks(loadedBooks));
            setSectionTitle(nextTitle);
            setPagination(nextPagination);

            if (nextPagination.total_pages > 0 && page > nextPagination.total_pages) {
                setCurrentPage(nextPagination.total_pages);
            }
        } catch (error) {
            console.error('Error loading books:', error);
            setBooks([]);
            setSectionTitle('Library Catalog');
            setPagination({
                page: 1,
                limit: perPage,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false,
            });
        } finally {
            setLoading(false);
        }
    }, [availabilityFilter, filterCategory, sortBy]);

    useEffect(() => {
        const query = searchParams.get('q') || '';
        const activeFilter = searchParams.get('filter') || '';
        loadBooks({ search: query, activeFilter, page: currentPage, perPage: pageSize });
    }, [searchParams, currentPage, pageSize, loadBooks]);

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
        setCurrentPage(1);
    };

    const handleBookClick = (book) => {
        navigate(`/book/${book.id}`, { state: { book } });
    };

    const handlePageSizeChange = (event) => {
        const nextSize = Number.parseInt(event.target.value, 10);
        setPageSize(nextSize === 100 ? 100 : 50);
        setCurrentPage(1);
    };

    const goToPreviousPage = () => {
        setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prevPage) => (
            pagination.total_pages > 0
                ? Math.min(prevPage + 1, pagination.total_pages)
                : prevPage + 1
        ));
    };

    // Apply all filters
    const sortedBooks = books;

    const categoriesSource = allCategories.length > 0
        ? allCategories
        : books.map((book) => book.category || 'Uncategorized');
    const categories = ['all', ...new Set(categoriesSource)];
    const showingFrom = pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0;
    const showingTo = pagination.total > 0 ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

    if (loading && books.length === 0) {
        return (
            <>
                <style>{`
                    .bg-paper-grain {
                        background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                    }
                `}</style>
                <Header />
                <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] flex items-center justify-center pt-24 relative"
                    style={{ fontFamily: "'Newsreader', serif" }}>
                    {/* Paper Grain Texture Overlay */}
                    <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>
                    
                    <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-2 border-[#E8E4DF] border-t-[#c16549]"></div>
                        <p className="text-[#6B6560] dark:text-gray-400 text-lg italic"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Loading the collection...
                        </p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <style>{`
                /* Editorial Design System Styles */
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background-color: #d4cec7; border-radius: 20px; }
                ::-webkit-scrollbar-thumb:hover { background-color: #c16549; }
                
                /* Paper grain texture */
                .bg-paper-grain {
                    background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                }
                
                /* Editorial shadows */
                .editorial-shadow {
                    box-shadow: 0 4px 20px -2px rgba(30, 24, 21, 0.08);
                }
                
                .editorial-shadow-lg {
                    box-shadow: 0 10px 40px -4px rgba(30, 24, 21, 0.12);
                }
                
                /* Layered book effect: front cover + back cover + page edge */
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

                .book-card:hover .book-stack {
                    transform: translate3d(0, -10px, 0) rotateX(4deg);
                }

                .book-card:hover .book-back-cover {
                    box-shadow: -8px 12px 24px rgba(30, 24, 21, 0.22);
                }

                .book-card:hover .book-card-cover {
                    box-shadow: -12px 16px 32px rgba(30, 24, 21, 0.25), -4px 4px 8px rgba(30, 24, 21, 0.15);
                }
                
                /* Fade-in animation */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s ease-out forwards;
                }
                
                /* Stagger delays */
                .delay-100 { animation-delay: 0.1s; opacity: 0; }
                .delay-200 { animation-delay: 0.2s; opacity: 0; }
                .delay-300 { animation-delay: 0.3s; opacity: 0; }
                
                /* Availability badge pop-up on hover */
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
                
                .book-card:hover .availability-badge {
                    transform: translateY(-22px) scale(1.03);
                    box-shadow: 0 8px 16px rgba(137, 51, 42, 0.26);
                }
                
                /* Book card hover z-index fix - ensures hover content isn't hidden behind next row */
                .book-card {
                    position: relative;
                    z-index: 1;
                    perspective: 1000px;
                    transition: z-index 0s 0.3s, filter 0.24s ease, opacity 0.24s ease, transform 0.24s ease; /* Delay z-index reset on mouse leave */
                }
                
                .book-card:hover {
                    z-index: 50;
                    transition: z-index 0s 0s; /* Immediate z-index increase on hover */
                }

                /* Subtle focus effect: blur only non-hovered books */
                .book-card.is-dimmed {
                    filter: blur(1px);
                    opacity: 0.78;
                }
            `}</style>

            <Header />
            <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] pt-24 pb-20 relative"
                style={{ fontFamily: "'Newsreader', serif" }}>
                
                {/* Paper Grain Texture Overlay */}
                <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>
                
                {/* Main Container with Sidebar Layout */}
                <main className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full pt-8 pb-20 px-6 gap-8 relative z-10">
                    
                    {/* Left Sidebar - Filter Panel (from SearchResults) */}
                    <aside className="w-full md:w-80 flex-shrink-0 animate-fade-in-up delay-100">
                        <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935] p-6 sticky top-28">
                            {/* Sidebar Header */}
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E8E4DF] dark:border-[#3d3935]">
                                <span className="material-symbols-outlined text-[#c16549] text-xl">filter_list</span>
                                <h2 className="text-sm font-bold text-[#1E1815] dark:text-white uppercase tracking-wider"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Filter & Sort
                                </h2>
                            </div>

                            <div className="flex flex-col gap-6">
                                {/* Availability Filter */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs uppercase tracking-widest text-[#c16549] mb-1 font-semibold"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Availability
                                    </p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            checked={availabilityFilter === 'available'}
                                            onChange={() => {
                                                setAvailabilityFilter('available');
                                                setCurrentPage(1);
                                            }}
                                            className="mt-0.5 w-4 h-4 border-[#E8E4DF] text-[#c16549] focus:ring-[#c16549]/20 rounded"
                                            name="availability"
                                            type="radio"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-[#1E1815] dark:text-white group-hover:text-[#c16549] transition-colors"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Available Now
                                            </span>
                                            <span className="text-[10px] text-[#6B6560] dark:text-gray-400"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Copies on shelf today
                                            </span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            checked={availabilityFilter === 'checked_out'}
                                            onChange={() => {
                                                setAvailabilityFilter('checked_out');
                                                setCurrentPage(1);
                                            }}
                                            className="mt-0.5 w-4 h-4 border-[#E8E4DF] text-[#c16549] focus:ring-[#c16549]/20 rounded"
                                            name="availability"
                                            type="radio"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-[#1E1815] dark:text-white group-hover:text-[#c16549] transition-colors"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Checked Out
                                            </span>
                                            <span className="text-[10px] text-[#6B6560] dark:text-gray-400"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Currently borrowed
                                            </span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            checked={availabilityFilter === 'all'}
                                            onChange={() => {
                                                setAvailabilityFilter('all');
                                                setCurrentPage(1);
                                            }}
                                            className="mt-0.5 w-4 h-4 border-[#E8E4DF] text-[#c16549] focus:ring-[#c16549]/20 rounded"
                                            name="availability"
                                            type="radio"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-[#1E1815] dark:text-white group-hover:text-[#c16549] transition-colors"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Show All
                                            </span>
                                            <span className="text-[10px] text-[#6B6560] dark:text-gray-400"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Every catalog record
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                {/* Category Filter */}
                                <div className="flex flex-col gap-3 pt-2 border-t border-[#E8E4DF] dark:border-[#3d3935]">
                                    <p className="text-xs uppercase tracking-widest text-[#c16549] mb-1 font-semibold"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Category
                                    </p>
                                    <div className="relative">
                                        <select
                                            value={filterCategory}
                                            onChange={(event) => {
                                                setFilterCategory(event.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="appearance-none w-full px-4 py-2.5 pr-10 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] bg-[#FAF7F2] dark:bg-[#1e1614] text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all cursor-pointer text-sm font-medium"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                        >
                                            {categories.map((category) => (
                                                <option key={category} value={category}>
                                                    {category === 'all' ? 'All Categories' : category}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#c16549] pointer-events-none text-[18px]">
                                            expand_more
                                        </span>
                                    </div>
                                </div>

                                {/* Sort Options */}
                                <div className="flex flex-col gap-3 pt-2 border-t border-[#E8E4DF] dark:border-[#3d3935]">
                                    <p className="text-xs uppercase tracking-widest text-[#c16549] mb-1 font-semibold"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Sort By
                                    </p>
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(event) => {
                                                setSortBy(event.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="appearance-none w-full px-4 py-2.5 pr-10 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] bg-[#FAF7F2] dark:bg-[#1e1614] text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all cursor-pointer text-sm font-medium"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                        >
                                            <option value="title">By Title</option>
                                            <option value="author">By Author</option>
                                            <option value="year">By Year</option>
                                            <option value="popular">Most Popular</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#c16549] pointer-events-none text-[18px]">
                                            expand_more
                                        </span>
                                    </div>
                                </div>

                                {/* Results Counter */}
                                <div className="pt-4 border-t border-[#E8E4DF] dark:border-[#3d3935]">
                                    <div className="flex items-center gap-2 text-xs text-[#6B6560] dark:text-gray-400"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        <span className="material-symbols-outlined text-base">library_books</span>
                                        <span className="font-medium">
                                            {pagination.total} {pagination.total === 1 ? 'book' : 'books'} found
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Content - Search Bar + Books Grid */}
                    <div className="flex-1 flex flex-col min-w-0">
                        
                        {/* Header with Search Bar */}
                        <div className="mb-10 animate-fade-in-up delay-200">
                            <div className="mb-6">
                                {/* Main headline */}
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E1815] dark:text-white leading-[1.1] tracking-tight mb-4">
                                    {sectionTitle}
                                </h1>
                                
                                {/* Subtitle */}
                                <p className="text-[#6B6560] dark:text-gray-400 text-base leading-relaxed max-w-2xl"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Explore our carefully curated collection. Search by title, author, or ISBN.
                                </p>
                                
                                {/* Decorative divider */}
                                <div className="flex items-center gap-3 mt-6">
                                    <div className="h-px bg-[#c16549] w-12"></div>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                                        <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                                        <div className="w-1 h-1 rounded-full bg-[#c16549]"></div>
                                    </div>
                                    <div className="h-px bg-[#c16549] flex-1 max-w-xs"></div>
                                </div>
                            </div>

                            {/* Search Bar (from SearchResults style) */}
                            <form onSubmit={handleSearchSubmit} className="max-w-3xl">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Search by title, author, or ISBN..."
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        className="w-full h-[64px] pl-14 pr-32 bg-white dark:bg-white/10 border border-[#E8E4DF] dark:border-white/20 rounded-sm text-base text-[#1E1815] dark:text-white placeholder:text-[#6B6560]/60 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c16549]/20 focus:border-[#c16549] transition-all editorial-shadow"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                    />
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#c16549]">
                                        <span className="material-symbols-outlined text-2xl">search</span>
                                    </div>
                                    <button
                                        type="submit"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#c16549] hover:bg-[#89332a] text-white px-6 py-3 rounded-sm transition-all duration-300 font-medium text-sm tracking-wide"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                    >
                                        {loading ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Books Grid or Empty State */}
                        {loading && books.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-16 w-16 border-2 border-[#E8E4DF] border-t-[#c16549] mb-6"></div>
                                <p className="text-[#6B6560] dark:text-gray-400 text-lg italic"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Searching the collection...
                                </p>
                            </div>
                        ) : sortedBooks.length === 0 ? (
                            <div className="text-center py-20 md:py-32 animate-fade-in-up delay-300">
                                <div className="mb-6">
                                    <span className="material-symbols-outlined text-7xl md:text-8xl text-[#E8E4DF] dark:text-[#3d3935]">
                                        search_off
                                    </span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-[#1E1815] dark:text-white mb-3">
                                    No books found
                                </h3>
                                <p className="text-[#6B6560] dark:text-gray-400 max-w-md mx-auto"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Try adjusting your search or filters to discover more titles.
                                </p>
                            </div>
                        ) : (
                            <div className="books-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 md:gap-x-8 gap-y-5 md:gap-y-6 animate-fade-in-up delay-300">
                                {sortedBooks.map((book, idx) => {
                                    const isNewArrival = isBookNewArrival(book);
                                    return (
                                    <div
                                        key={book.id}
                                        className={`book-card cursor-pointer group ${hoveredBookId !== null && hoveredBookId !== book.id ? 'is-dimmed' : ''}`}
                                        onClick={() => handleBookClick(book)}
                                        onMouseEnter={() => setHoveredBookId(book.id)}
                                        onMouseLeave={() => setHoveredBookId(null)}
                                        style={{ animationDelay: `${0.35 + (idx % 20) * 0.03}s` }}
                                    >
                                        {/* Wishlist Heart Button */}
                                        <div className="absolute top-2 right-2 z-30">
                                            <WishlistButton
                                                bookId={book.id}
                                                size="sm"
                                                className="bg-white/90 dark:bg-[#1e1614]/90 rounded-full p-1.5 shadow-md backdrop-blur-sm"
                                            />
                                        </div>

                                        {/* Book Cover with hover pop-up effect (from SearchResults) */}
                                        <div className="book-stack relative mb-4">
                                            {/* Availability Badge that pops up on hover */}
                                            <div className="availability-badge absolute -top-6 left-3 right-3 h-12 bg-gradient-to-b from-[#c16549] to-[#89332a] rounded-t-sm flex flex-col items-center justify-start pt-2 shadow-md">
                                                <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                                <span className="text-[10px] text-white font-bold uppercase tracking-wider"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    {book.available_copies > 0 ? 'Available' : 'Checked Out'}
                                                </span>
                                            </div>

                                            {/* Back cover and pages for layered book look */}
                                            <div className="book-back-cover"></div>
                                            <div className="book-page-block"></div>

                                            {/* Book Cover */}
                                            <div className="book-card-cover relative z-20 w-full aspect-[2/3] rounded-r-sm rounded-l-sm bg-[#E8E4DF] dark:bg-[#3d3935] border border-[#c16549]/20 overflow-hidden">
                                                {isNewArrival && (
                                                    <div className="new-arrival-ribbon" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        New Arrival
                                                    </div>
                                                )}

                                                {/* Spine highlight */}
                                                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/30 to-transparent z-30 pointer-events-none"></div>
                                                
                                                {book.cover_image_url ? (
                                                    <>
                                                        <img
                                                            src={book.cover_image_url}
                                                            alt={book.title}
                                                            className="w-full h-full object-cover object-center"
                                                        />
                                                        {/* Hover overlay */}
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
                                        
                                        {/* Book info visible only on hover */}
                                        <div className="absolute top-full mt-3 left-0 w-full opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-y-2 group-hover:translate-y-0 text-center px-1 pointer-events-none">
                                            <h4 className="text-sm font-bold leading-tight line-clamp-2 text-[#1E1815] dark:text-white mb-1"
                                                style={{ fontFamily: "'Newsreader', serif" }}>
                                                {book.title}
                                            </h4>
                                            <p className="text-xs text-[#6B6560] dark:text-gray-400 italic"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                {book.author || 'Unknown'}
                                            </p>
                                            <div className="mt-2 flex justify-center">
                                                <StarRating value={book.avg_rating || 0} size="sm" count={book.rating_count || 0} compact />
                                            </div>
                                            {book.category && (
                                                <p className="text-[9px] text-[#c16549] uppercase tracking-wider mt-1 font-semibold"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    {book.category}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}

                        {pagination.total_pages > 1 && (
                            <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-[#E8E4DF] dark:border-[#3d3935] pt-6 animate-fade-in-up delay-300">
                                <div className="text-sm text-[#6B6560] dark:text-gray-400"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Showing {showingFrom}-{showingTo} of {pagination.total}
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#6B6560] dark:text-gray-400"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Per page
                                        <select
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
                                            className="px-2 py-1 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] bg-white dark:bg-[#2a2622] text-[#1E1815] dark:text-white"
                                        >
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </label>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={goToPreviousPage}
                                            disabled={!pagination.has_prev}
                                            className="px-3 py-1.5 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] text-[#1E1815] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c16549] transition-colors"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                        >
                                            Prev
                                        </button>
                                        <span className="text-sm text-[#1E1815] dark:text-white min-w-[110px] text-center"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            Page {pagination.page} / {pagination.total_pages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={goToNextPage}
                                            disabled={!pagination.has_next}
                                            className="px-3 py-1.5 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] text-[#1E1815] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c16549] transition-colors"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer spacing */}
                        <div className="h-16 md:h-24" />
                    </div>
                </main>
            </div>
        </>
    );
}
