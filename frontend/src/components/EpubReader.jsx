import { useEffect, useRef, useState } from 'react';
import * as ePub from 'epubjs';

export default function EpubReader({ epubUrl, title }) {
    const viewerRef = useRef(null);
    const renditionRef = useRef(null);
    const bookRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        if (!epubUrl) {
            setError('No book URL provided');
            setLoading(false);
            return;
        }

        const initReader = async () => {
            try {
                const book = ePub(epubUrl);
                bookRef.current = book;

                const rendition = book.renderTo(viewerRef.current, {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: 'paginated',
                });
                renditionRef.current = rendition;

                await rendition.display();
                setLoading(false);

                // Handle pagination
                book.ready.then(() => {
                    return book.locations.generate(1024);
                }).then((locations) => {
                    setTotalPages(book.locations.total);
                });

                // Track page navigation
                rendition.on('relocated', (location) => {
                    const percent = book.locations.percentageFromCfi(location.start.cfi);
                    const page = Math.floor(percent * book.locations.total);
                    setCurrentPage(page || 1);
                });

            } catch (err) {
                console.error('Error loading EPUB:', err);
                setError('Failed to load book. The file may be corrupted or incompatible.');
                setLoading(false);
            }
        };

        initReader();

        return () => {
            if (renditionRef.current) {
                renditionRef.current.destroy();
            }
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [epubUrl]);

    const nextPage = () => {
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    };

    const prevPage = () => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">error</span>
                    <p className="text-gray-600">{error}</p>
                    <a
                        href={epubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Download Book Instead
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading {title || 'book'}...</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div
                    ref={viewerRef}
                    className="epub-viewer"
                    style={{ height: '70vh', minHeight: '500px' }}
                />

                {/* Reader Controls */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={prevPage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentPage <= 1}
                    >
                        ← Previous
                    </button>

                    <span className="text-sm text-gray-600">
                        {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Loading...'}
                    </span>

                    <button
                        onClick={nextPage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentPage >= totalPages}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}
