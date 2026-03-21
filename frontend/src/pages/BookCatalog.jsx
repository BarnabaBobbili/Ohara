import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import Header from '../components/Header';
import { booksAPI } from '../services/api';

export default function BookCatalog() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [filterCategory, setFilterCategory] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async (search = '') => {
        setLoading(true);
        try {
            const params = { limit: 120 };
            if (search.trim()) {
                params.search = search.trim();
            }

            const data = await booksAPI.getAll(params);
            setBooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading books:', error);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        await loadBooks(searchQuery);
    };

    const handleBookClick = (book) => {
        navigate(`/book/${book.id}`, { state: { book } });
    };

    const filteredBooks = filterCategory === 'all'
        ? books
        : books.filter((book) => (book.category || 'Uncategorized') === filterCategory);

    const sortedBooks = [...filteredBooks].sort((left, right) => {
        if (sortBy === 'author') return (left.author || '').localeCompare(right.author || '');
        if (sortBy === 'year') return (right.publication_year || 0) - (left.publication_year || 0);
        return (left.title || '').localeCompare(right.title || '');
    });

    const categories = ['all', ...new Set(books.map((book) => book.category || 'Uncategorized'))];

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
                            Library Catalog
                        </h1>
                        <p className="text-[#4A4540] dark:text-gray-300 max-w-2xl mx-auto">
                            Browse the library&apos;s holdings by title, author, or category. {sortedBooks.length} books displayed.
                        </p>
                    </div>

                    <div className="mb-8 flex flex-col gap-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by title, author, or ISBN..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
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
                                    value={filterCategory}
                                    onChange={(event) => setFilterCategory(event.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]"
                                >
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category === 'all' ? 'All Categories' : category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <FaSortAmountDown className="text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#1E1815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c16549]"
                                >
                                    <option value="title">Sort by Title</option>
                                    <option value="author">Sort by Author</option>
                                    <option value="year">Sort by Year</option>
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
                            <p className="text-gray-500">No books found. Try a different search or category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedBooks.map((book) => (
                                <div
                                    key={book.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => handleBookClick(book)}
                                >
                                    <div className="h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {book.cover_image_url ? (
                                            <img
                                                src={book.cover_image_url}
                                                alt={book.title}
                                                className="h-full w-full object-cover"
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
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#c16549]/10 text-[#8b4d3f]">
                                                {book.category || 'Uncategorized'}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${book.available_copies > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {book.available_copies > 0 ? `${book.available_copies} available` : 'Checked out'}
                                            </span>
                                        </div>

                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {book.publication_year ? `Published ${book.publication_year}` : 'Publication year unavailable'}
                                        </div>
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
