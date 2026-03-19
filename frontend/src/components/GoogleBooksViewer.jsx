import { useEffect, useRef, useState } from 'react';

export default function GoogleBooksViewer({ bookId, isbn }) {
    const viewerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!bookId && !isbn) {
            setError('No book identifier provided');
            setLoading(false);
            return;
        }

        // Load Google Books API
        const loadGoogleBooksAPI = () => {
            if (window.google && window.google.books) {
                initializeViewer();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://www.google.com/books/jsapi.js';
            script.async = true;
            script.onload = () => {
                if (window.google && window.google.books) {
                    window.google.books.load();
                    window.google.books.setOnLoadCallback(() => {
                        initializeViewer();
                    });
                }
            };
            script.onerror = () => {
                setError('Failed to load Google Books API');
                setLoading(false);
            };
            document.head.appendChild(script);
        };

        const initializeViewer = () => {
            try {
                if (!viewerRef.current) return;

                const viewer = new window.google.books.DefaultViewer(viewerRef.current);

                // Try different identifiers in order of preference
                if (isbn) {
                    viewer.load(`ISBN:${isbn}`);
                } else if (bookId) {
                    viewer.load(bookId);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error initializing Google Books viewer:', err);
                setError('Failed to load book preview');
                setLoading(false);
            }
        };

        loadGoogleBooksAPI();
    }, [bookId, isbn]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">error</span>
                    <p className="text-gray-600">{error}</p>
                    <p className="text-sm text-gray-500 mt-2">This book may not have a preview available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading book preview...</p>
                    </div>
                </div>
            )}
            <div
                ref={viewerRef}
                id="googleBooksViewer"
                className="w-full rounded-lg overflow-hidden shadow-lg"
                style={{ minHeight: '600px', height: '80vh' }}
            />
        </div>
    );
}
