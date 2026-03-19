import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import Header from '../components/Header';
import { BACKEND_ORIGIN } from '../config/api';

const BACKEND_URL = BACKEND_ORIGIN;

export default function BookCatalog() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [filterSource, setFilterSource] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadDefaultBooks();
    }, []);

    const loadDefaultBooks = async () => {
        setLoading(true);
        try {
            // Single API call - backend searches all sources in parallel
            const response = await fetch(
                `${BACKEND_URL}/api/external-books/search?q=popular fiction`
            );

            if (response.ok) {
                const data = await response.json();
                setBooks(data.results || []);
                console.log(`Loaded ${data.results?.length || 0} books`);
            }
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadDefaultBooks();
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${BACKEND_URL}/api/external-books/search?q=${encodeURIComponent(searchQuery)}`
            );
            if (response.ok) {
                const data = await response.json();
                setBooks(data.results || []);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookClick = (book) => {
        // Use a unified /book/:id route for all books
        // For external books, use source-sourceId as the ID
        const bookId = `${book.source}-${book.source_id}`;
        navigate(`/book/${bookId}`, { state: { book, isExternal: true } });
    };

    const filteredBooks = books.filter(book => {
        if (filterSource === 'all') return true;
        return book.source === filterSource;
    });

    const sortedBooks = [...filteredBooks].sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return (a.title || '').localeCompare(b.title || '');
            case 'author':
                return (a.author || '').localeCompare(b.author || '');
            case 'source':
                return (a.source || '').localeCompare(b.source || '');
            default:
                return 0;
        }
    });

    const getSourceBadge = (source) => {
        const badges = {
            gutenberg: { label: 'Gutenberg', color: 'bg-green-100 text-green-800' },
            internet_archive: { label: 'Archive.org', color: 'bg-blue-100 text-blue-800' },
            openlibrary: { label: 'Open Library', color: 'bg-purple-100 text-purple-800' },
            google_books: { label: 'Google Books', color: 'bg-yellow-100 text-yellow-800' },
        };
        return badges[source] || { label: source, color: 'bg-gray-100 text-gray-800' };
    };

    if (loading && books.length === 0) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gradient-to-br from-[#FCF8F3] to-[#F5EBE0] dark:from-gray-900 dark:to-gray-800 py-20 pt-32">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#c16549] mb-4"></div>
                            <p className="text-[#4A4540] dark:text-gray-300">Loading books...</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gradient-to-br from-[#FCF8F3] to-[#F5EBE0] dark:from-gray-900 dark:to-gray-800 py-20 pt-32">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-[#1E1815] dark:text-white mb-4">
                            Free Book Catalog
                        </h1>
                        <p className="text-[#4A4540] dark:text-gray-300 max-w-2xl mx-auto">
                            Browse millions of free books from Project Gutenberg, Internet Archive, and more. {sortedBooks.length} books displayed.
                        </p>
                    </div>

                    <div className="mb-8 flex flex-col gap-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by title, author, or subject..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-6 py-3 bg-[#c16549] hover:bg-[#a05438] text-white rounded-lg transition-colors font-semibold"
                            >
                                Search
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <FaFilter className="text-gray-400" />
                                <select
                                    value={filterSource}
                                    onChange={(e) => setFilterSource(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]"
                                >
                                    <option value="all">All Sources</option>
                                    <option value="gutenberg">Project Gutenberg</option>
                                    <option value="internet_archive">Internet Archive</option>
                                    <option value="openlibrary">Open Library</option>
                                    <option value="google_books">Google Books</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <FaSortAmountDown className="text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]"
                                >
                                    <option value="title">Sort by Title</option>
                                    <option value="author">Sort by Author</option>
                                    <option value="source">Sort by Source</option>
                                </select>
                            </div>

                            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                                {sortedBooks.length} books found
                            </div>
                        </div>
                    </div>

                    {sortedBooks.length === 0 ? (
                        <div className="text-center py-12">
                            <FaBook className="mx-auto text-6xl text-gray-400 mb-4" />
                            <p className="text-gray-500">No books found. Try a different search or filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedBooks.map((book, idx) => (
                                <div
                                    key={`${book.source}-${book.source_id}-${idx}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => handleBookClick(book)}
                                >
                                    <div className="h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {book.cover_url ? (
                                            <img
                                                src={book.cover_url}
                                                alt={book.title}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg></div>';
                                                }}
                                            />
                                        ) : (
                                            <FaBook className="text-gray-400 text-6xl" />
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-bold text-lg mb-1 line-clamp-2 text-[#1E1815] dark:text-white">
                                            {book.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-1">
                                            {book.author || 'Unknown Author'}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceBadge(book.source).color}`}>
                                                {getSourceBadge(book.source).label}
                                            </span>
                                            {book.is_public_domain && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    🟢 Free
                                                </span>
                                            )}
                                            {book.can_borrow && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    🟡 Borrow
                                                </span>
                                            )}
                                        </div>

                                        {book.formats && book.formats.length > 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {book.formats.slice(0, 3).join(', ').toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
