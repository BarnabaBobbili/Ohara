import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import GoogleBooksViewer from '../components/GoogleBooksViewer';
import EpubReader from '../components/EpubReader';
import { BACKEND_ORIGIN } from '../config/api';

const BACKEND_URL = BACKEND_ORIGIN;

export default function BookDetail() {
    const { id } = useParams();
    const location = useLocation();
    const [book, setBook] = useState(location.state?.book || null);
    const [loading, setLoading] = useState(!location.state?.book);
    const [isExternal, setIsExternal] = useState(location.state?.isExternal || id.includes('-'));
    const [showReader, setShowReader] = useState(false);

    useEffect(() => {
        // Always fetch full details for external books since search results don't include description/ISBN
        if (!book || isExternal) {
            loadBookDetails();
        }
    }, [id]);

    const loadBookDetails = async () => {
        setLoading(true);
        try {
            if (isExternal || id.includes('-')) {
                // External book - fetch from external API
                const [source, sourceId] = id.split('-');
                const response = await fetch(
                    `${BACKEND_URL}/api/external-books/${source}/${sourceId}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setBook(data);
                    setIsExternal(true);
                }
            } else {
                // Local book - fetch from local API
                const response = await fetch(`${BACKEND_URL}/api/books/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setBook(data);
                    setIsExternal(false);
                }
            }
        } catch (error) {
            console.error('Error loading book:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleReadNow = () => {
        // Open in-page reader modal
        setShowReader(true);
    };

    const getEpubUrl = () => {
        if (!book) return null;

        if (book.download_urls) {
            return book.download_urls.epub || book.download_urls.pdf;
        }

        // Fallback for Gutenberg
        if (book.source === 'gutenberg' && book.source_id) {
            return `https://www.gutenberg.org/ebooks/${book.source_id}.epub.noimages`;
        }

        return null;
    };



    if (loading) {
        return (
            <>
                <Header />
                <div className="bg-[#f6f8f7] dark:bg-[#11211c] min-h-screen flex items-center justify-center pt-24">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#17cf91]"></div>
                </div>
            </>
        );
    }

    if (!book) {
        return (
            <>
                <Header />
                <div className="bg-[#f6f8f7] dark:bg-[#11211c] min-h-screen flex items-center justify-center pt-24">
                    <p className="text-xl text-slate-600">Book not found</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="bg-[#f6f8f7] dark:bg-[#11211c] text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col pt-24"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Main Content */}
                <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-12 py-10 md:py-16">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 mb-12 text-sm text-slate-500 dark:text-slate-400">
                        <a className="hover:text-[#17cf91] transition-colors" href="/">Library</a>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <a className="hover:text-[#17cf91] transition-colors" href="/catalog">
                            {isExternal ? 'Free Books' : 'Local Catalog'}
                        </a>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-900 dark:text-white font-medium">{book.title?.substring(0, 30)}</span>
                    </div>

                    {/* Hero Section */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 mb-20">
                        {/* Book Cover */}
                        <div className="md:col-span-5 lg:col-span-4 relative group perspective-1000">
                            <div className="w-full aspect-[2/3] bg-slate-200 rounded-r-md rounded-l-sm transform transition-transform duration-500 hover:scale-[1.02] overflow-hidden relative"
                                style={{ boxShadow: '10px 10px 30px -5px rgba(0, 0, 0, 0.3)' }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent w-4 z-10 pointer-events-none"></div>
                                {book.cover_url || book.cover_image_url ? (
                                    <img
                                        src={book.cover_url || book.cover_image_url}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-9xl text-slate-500">auto_stories</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Book Details */}
                        <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-[0.95] tracking-tight mb-4">
                                {book.title}
                            </h1>
                            <h2 className="text-2xl md:text-3xl font-normal italic text-slate-500 dark:text-slate-400 mb-8">
                                by {book.author || 'Unknown Author'}
                            </h2>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-10">
                                {isExternal ? (
                                    <>
                                        {book.is_public_domain && (
                                            <div className="flex items-center gap-2 text-[#17cf91]">
                                                <span className="material-symbols-outlined text-[20px] animate-pulse">check_circle</span>
                                                <p className="text-lg font-medium">Free to Read - Public Domain</p>
                                            </div>
                                        )}
                                        {book.can_borrow && !book.is_public_domain && (
                                            <div className="flex items-center gap-2 text-yellow-600">
                                                <span className="material-symbols-outlined text-[20px]">schedule</span>
                                                <p className="text-lg font-medium">Available for 14-Day Borrow</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-[#17cf91]">
                                        <span className="material-symbols-outlined text-[20px] animate-pulse">location_on</span>
                                        <p className="text-lg font-medium">
                                            {book.available_copies > 0 ? `Available - ${book.available_copies} copies` : 'Currently Checked Out'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4">
                                {isExternal && (
                                    <button
                                        onClick={handleReadNow}
                                        className="bg-[#17cf91] hover:bg-[#17cf91]/90 text-white px-8 py-3 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2"
                                        style={{ boxShadow: '0 10px 25px rgba(23, 207, 145, 0.3)' }}
                                    >
                                        <span className="material-symbols-outlined">auto_stories</span>
                                        <span>{book.source === 'google_books' ? 'Preview' : 'Read Now'}</span>
                                    </button>
                                )}
                                {!isExternal && book.available_copies > 0 && (
                                    <button className="bg-[#17cf91] hover:bg-[#17cf91]/90 text-white px-8 py-3 rounded-full font-semibold tracking-wide transition-all"
                                        style={{ boxShadow: '0 10px 25px rgba(23, 207, 145, 0.3)' }}>
                                        Reserve Copy
                                    </button>
                                )}
                                {book.formats && book.formats.length > 0 && (
                                    <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                            Formats: {book.formats.slice(0, 3).join(', ').toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Grid Layout for Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 border-t border-slate-200 dark:border-slate-800 pt-16">
                        {/* Main Column: Description */}
                        <div className="lg:col-span-8">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
                                {isExternal ? 'About This Book' : 'Synopsis'}
                            </h3>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                <p className="first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px] first-letter:text-slate-900 dark:first-letter:text-white text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-300">
                                    {book.description || book.summary || `Discover "${book.title}"${book.author ? ` by ${book.author}` : ''}. Click Preview or Read Now to explore this book.`}
                                </p>
                            </div>

                            {/* Book Metadata */}
                            <div className="mt-12 grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">ISBN</h4>
                                    <p className="text-slate-900 dark:text-white font-medium">{book.isbn || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Publisher</h4>
                                    <p className="text-slate-900 dark:text-white font-medium">{book.publisher || 'Unknown'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Published</h4>
                                    <p className="text-slate-900 dark:text-white font-medium">{book.publication_year || book.publish_date || 'Unknown'}</p>
                                </div>
                                {isExternal && (
                                    <div>
                                        <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Source</h4>
                                        <p className="text-slate-900 dark:text-white font-medium capitalize">
                                            {book.source?.replace('_', ' ') || 'External'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar: Info Card */}
                        <div className="lg:col-span-4 space-y-8 lg:mt-12">
                            <div className="bg-gradient-to-br from-[#17cf91]/10 to-transparent p-6 rounded-xl border border-[#17cf91]/20">
                                <h4 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Quick Info</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Category:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{book.category || 'General'}</span>
                                    </div>
                                    {!isExternal && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">Total Copies:</span>
                                                <span className="font-medium text-slate-900 dark:text-white">{book.total_copies || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">Available:</span>
                                                <span className="font-medium text-[#17cf91]">{book.available_copies || 0}</span>
                                            </div>
                                        </>
                                    )}
                                    {isExternal && book.formats && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Downloads:</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{book.formats.length} formats</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-auto py-12 flex flex-col items-center justify-center border-t border-slate-200 dark:border-slate-800 bg-[#f0f4f3] dark:bg-[#0c1814]">
                    <div className="opacity-60 hover:opacity-100 transition-opacity duration-500 group cursor-default">
                        <div className="size-32 rounded-full border-4 border-slate-800 dark:border-slate-400 flex items-center justify-center relative rotate-12 group-hover:rotate-0 transition-transform duration-700">
                            <div className="absolute inset-1 border border-slate-800 dark:border-slate-400 rounded-full"></div>
                            <div className="flex flex-col items-center text-slate-800 dark:text-slate-400">
                                <span className="text-[10px] tracking-[0.3em] font-bold uppercase mb-1">Bibliotheca</span>
                                <span className="material-symbols-outlined text-4xl mb-1 text-[#17cf91]">auto_stories</span>
                                <span className="text-[10px] tracking-[0.3em] font-bold uppercase">Ex Libris</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-6">© 2024 Library Management System</p>
                </footer>
            </div>

            {/* In-Page Reader Modal */}
            {showReader && book && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowReader(false)}
                            className="absolute top-4 right-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="h-full p-6">
                            {book.source === 'google_books' ? (
                                <GoogleBooksViewer bookId={book.source_id} isbn={book.isbn} />
                            ) : (book.source === 'gutenberg' || book.source === 'internet_archive') && getEpubUrl() ? (
                                <EpubReader epubUrl={getEpubUrl()} title={book.title} />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-6xl text-gray-400">menu_book</span>
                                        <p className="text-gray-600 mb-4">In-page reading not available</p>
                                        {book.preview_link && (
                                            <a href={book.preview_link} target="_blank" rel="noopener noreferrer"
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                                Open External Preview
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
