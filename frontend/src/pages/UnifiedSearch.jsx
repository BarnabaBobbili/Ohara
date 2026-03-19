import { useState } from 'react';
import { FaSearch, FaBook, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { BACKEND_ORIGIN } from '../config/api';

const BACKEND_URL = BACKEND_ORIGIN;

const UnifiedSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const response = await fetch(
                `${BACKEND_URL}/api/external-books/search?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setResults(data.results || []);
        } catch (err) {
            setError('Failed to search books. Please try again.');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBookClick = (book) => {
        // Navigate to book detail page
        navigate(`/external-book/${book.source}/${book.source_id}`, { state: { book } });
    };

    const getSourceBadge = (source) => {
        const badges = {
            gutenberg: { label: 'Gutenberg', color: 'bg-green-100 text-green-800' },
            internet_archive: { label: 'Archive.org', color: 'bg-blue-100 text-blue-800' },
            openlibrary: { label: 'Open Library', color: 'bg-purple-100 text-purple-800' },
            google_books: { label: 'Google Books', color: 'bg-yellow-100 text-yellow-800' },
        };
        return badges[source] || { label: source, color: 'bg-gray-100 text-gray-800' };
    };

    const getAvailabilityBadge = (book) => {
        if (book.is_public_domain) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                🟢 Free - Instant Read
            </span>;
        } else if (book.can_borrow) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                🟡 Borrow - 14 Days
            </span>;
        } else {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                ⚪ Preview Only
            </span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Search Millions of Free Books
                    </h1>
                    <p className="text-gray-600">
                        Search across Project Gutenberg, Internet Archive, Open Library, and more
                    </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for books by title, author, or ISBN..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <FaSpinner className="animate-spin" />
                            ) : (
                                'Search'
                            )}
                        </button>
                    </div>
                </form>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Results */}
                {searched && !loading && (
                    <div>
                        <div className="mb-4 text-gray-600">
                            Found {results.length} results
                        </div>

                        {results.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <FaBook className="mx-auto text-6xl mb-4 opacity-50" />
                                <p className="text-xl">No books found</p>
                                <p className="mt-2">Try a different search query</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((book, index) => (
                                    <div
                                        key={`${book.source}-${book.source_id}-${index}`}
                                        onClick={() => handleBookClick(book)}
                                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                                    >
                                        {/* Book Cover */}
                                        <div className="h-64 bg-gray-200 flex items-center justify-center overflow-hidden">
                                            {book.cover_url ? (
                                                <img
                                                    src={book.cover_url}
                                                    alt={book.title}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = '<div class="text-gray-400 text-6xl"><svg class="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg></div>';
                                                    }}
                                                />
                                            ) : (
                                                <FaBook className="text-gray-400 text-6xl" />
                                            )}
                                        </div>

                                        {/* Book Info */}
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg mb-1 line-clamp-2">
                                                {book.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-1">
                                                {book.author || 'Unknown Author'}
                                            </p>

                                            {/* Badges */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceBadge(book.source).color}`}>
                                                    {getSourceBadge(book.source).label}
                                                </span>
                                                {getAvailabilityBadge(book)}
                                            </div>

                                            {/* Formats */}
                                            {book.formats && book.formats.length > 0 && (
                                                <div className="text-xs text-gray-500">
                                                    Available: {book.formats.join(', ').toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Initial State */}
                {!searched && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        <FaSearch className="mx-auto text-6xl mb-4 opacity-50" />
                        <p className="text-xl">Start searching for free books</p>
                        <p className="mt-2">Access millions of public domain and borrowable books</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedSearch;
