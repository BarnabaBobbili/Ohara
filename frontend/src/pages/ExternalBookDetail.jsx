import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBook, FaDownload, FaSpinner } from 'react-icons/fa';

const BACKEND_URL = 'http://localhost:8000';

const ExternalBookDetail = () => {
    const { source, sourceId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [book, setBook] = useState(location.state?.book || null);
    const [loading, setLoading] = useState(!book);
    const [formats, setFormats] = useState([]);

    useEffect(() => {
        if (!book) {
            fetchBookDetails();
        } else {
            fetchReadUrl();
        }
    }, [source, sourceId]);

    const fetchBookDetails = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/external-books/${source}/${sourceId}`);
            const data = await response.json();
            setBook(data);
            fetchReadUrl();
        } catch (error) {
            console.error('Error fetching book details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadUrl = async () => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/api/external-books/${source}/${sourceId}/read-url?format=epub`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.read_url) {
                    setFormats(prev => [...prev, { format: 'epub', url: data.read_url }]);
                }
            }
        } catch (error) {
            console.error('Error fetching read URL:', error);
        }
    };

    const handleReadNow = (format = 'epub') => {
        const formatData = formats.find(f => f.format === format);
        if (formatData) {
            // Navigate to book reader
            navigate('/book-reader', {
                state: {
                    bookUrl: formatData.url,
                    title: book.title,
                    format: format,
                    source: 'external'
                }
            });
        }
    };

    const handleDownload = async (format) => {
        const formatData = formats.find(f => f.format === format);
        if (formatData) {
            window.open(formatData.url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-600">Book not found</p>
                    <button
                        onClick={() => navigate('/unified-search')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    const getSourceName = (src) => {
        const names = {
            gutenberg: 'Project Gutenberg',
            internet_archive: 'Internet Archive',
            openlibrary: 'Open Library',
            google_books: 'Google Books',
        };
        return names[src] || src;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <FaArrowLeft />
                    Back to Search
                </button>

                {/* Book Details Card */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="md:flex">
                        {/* Book Cover */}
                        <div className="md:w-1/3 bg-gray-200 flex items-center justify-center p-8">
                            {book.cover_url ? (
                                <img
                                    src={book.cover_url}
                                    alt={book.title}
                                    className="max-w-full h-auto rounded-lg shadow-md"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="text-gray-400 text-8xl"><svg class="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg></div>';
                                    }}
                                />
                            ) : (
                                <FaBook className="text-gray-400 text-8xl" />
                            )}
                        </div>

                        {/* Book Info */}
                        <div className="md:w-2/3 p-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {book.title}
                            </h1>
                            <p className="text-xl text-gray-600 mb-4">
                                {book.author || 'Unknown Author'}
                            </p>

                            {/* Source Badge */}
                            <div className="mb-6">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                    {getSourceName(source)}
                                </span>
                            </div>

                            {/* Description */}
                            {book.description && (
                                <div className="mb-6">
                                    <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                                    <p className="text-gray-600 text-sm">{book.description}</p>
                                </div>
                            )}

                            {/* Access Options */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-700 mb-3">Access Options</h3>

                                {book.is_public_domain && formats.length > 0 && (
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-green-600 font-semibold">🟢 Free - Instant Read</span>
                                        </div>
                                        <button
                                            onClick={() => handleReadNow('epub')}
                                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                                        >
                                            Read Now (Online)
                                        </button>
                                        <button
                                            onClick={() => handleDownload('epub')}
                                            className="w-full mt-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 flex items-center justify-center gap-2"
                                        >
                                            <FaDownload />
                                            Download EPUB
                                        </button>
                                    </div>
                                )}

                                {book.can_borrow && (
                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-yellow-700 font-semibold">🟡 Borrow for 14 Days</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Available via Internet Archive lending
                                        </p>
                                        <button
                                            onClick={() => window.open(`https://archive.org/details/${sourceId}`, '_blank')}
                                            className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
                                        >
                                            Borrow from Internet Archive
                                        </button>
                                    </div>
                                )}

                                {!book.is_public_domain && !book.can_borrow && (
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="text-gray-600 mb-3">
                                            This book is not freely available. Purchase options:
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => window.open(`https://www.amazon.com/s?k=${encodeURIComponent(book.title)}`, '_blank')}
                                                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                            >
                                                Amazon
                                            </button>
                                            <button
                                                onClick={() => window.open(`https://play.google.com/store/search?q=${encodeURIComponent(book.title)}`, '_blank')}
                                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                            >
                                                Google Books
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Available Formats */}
                            {book.formats && book.formats.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-700 mb-2">Available Formats</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {book.formats.map((format) => (
                                            <span
                                                key={format}
                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                            >
                                                {format.toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExternalBookDetail;
