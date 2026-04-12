/**
 * EbookLibrary — /ebooks
 * Shows public ebooks that members can read online.
 * Also shows member's own uploaded books under "My Uploads" tab.
 * Redirects to /login if not authenticated.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { publicEbooksAPI } from '../services/api';
import { getAuthState } from '../services/authStore';

export default function EbookLibrary() {
    const [ebooks, setEbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | pdf | epub
    const [readingId, setReadingId] = useState(null); // id of ebook being read
    const navigate = useNavigate();

    useEffect(() => {
        const { isAuthenticated } = getAuthState();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        publicEbooksAPI.getAll()
            .then(r => setEbooks(Array.isArray(r) ? r : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [navigate]);

    const filteredEbooks = ebooks.filter(e =>
        filter === 'all' || e.file_format === filter
    );

    // If an ebook is selected for reading, show it in an iframe
    if (readingId) {
        const readUrl = publicEbooksAPI.getReadUrl(readingId);
        const ebook = ebooks.find(e => e.id === readingId);
        return (
            <>
                <Header />
                <div className="min-h-screen bg-[#1e1614] pt-20 flex flex-col">
                    <div className="flex items-center justify-between px-6 py-3 bg-[#2a2622] border-b border-[#3d3935]">
                        <div>
                            <p className="text-white font-bold text-sm" style={{ fontFamily: "'Newsreader', serif" }}>
                                {ebook?.title || 'Reading'}
                            </p>
                            <p className="text-gray-400 text-xs italic" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                {ebook?.author || ''}
                            </p>
                        </div>
                        <button
                            onClick={() => setReadingId(null)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#c16549] text-white text-xs font-medium rounded-sm hover:bg-[#89332a] transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Close Reader
                        </button>
                    </div>
                    <iframe
                        src={readUrl}
                        title={ebook?.title || 'Ebook'}
                        className="flex-1 w-full border-0"
                        style={{ minHeight: 'calc(100vh - 108px)' }}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-in { animation: fadeInUp 0.5s ease-out forwards; }
                .editorial-shadow { box-shadow: 0 4px 20px -2px rgba(30,24,21,0.08); }
            `}</style>

            <Header />
            <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] pt-24 pb-20"
                style={{ fontFamily: "'Newsreader', serif" }}>
                <main className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">

                    {/* Header */}
                    <div className="mb-10 fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-px bg-[#c16549] w-8" />
                            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>Digital Collection</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#1E1815] dark:text-white mb-2">
                            E-Library
                        </h1>
                        <p className="text-[#6B6560] dark:text-gray-400 text-base"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Read digital books directly in your browser.
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 mb-8" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {['all', 'pdf', 'epub'].map(f => (
                            <button key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                                    filter === f
                                        ? 'bg-[#c16549] text-white'
                                        : 'bg-white dark:bg-[#2a2622] text-[#6B6560] dark:text-gray-400 border border-[#E8E4DF] dark:border-[#3d3935] hover:border-[#c16549]'
                                }`}>
                                {f === 'all' ? 'All Formats' : f.toUpperCase()}
                            </button>
                        ))}
                        <span className="text-sm text-[#6B6560] dark:text-gray-400 ml-2">
                            {filteredEbooks.length} {filteredEbooks.length === 1 ? 'book' : 'books'}
                        </span>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#E8E4DF] border-t-[#c16549]" />
                        </div>
                    ) : filteredEbooks.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935]">
                            <span className="material-symbols-outlined text-6xl text-[#E8E4DF] dark:text-[#3d3935] block mb-4">
                                import_contacts
                            </span>
                            <h2 className="text-xl font-bold text-[#1E1815] dark:text-white mb-2">
                                No ebooks available yet
                            </h2>
                            <p className="text-sm text-[#6B6560] dark:text-gray-400"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Admin will upload digital books here soon.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in">
                            {filteredEbooks.map(ebook => (
                                <div key={ebook.id}
                                    className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935] p-5 flex flex-col gap-4 hover:border-[#c16549] transition-colors group">

                                    {/* Format badge */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-sm ${
                                            ebook.file_format === 'pdf'
                                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                        }`} style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            {(ebook.file_format || 'unknown').toUpperCase()}
                                        </span>
                                        {ebook.books && (
                                            <span className="text-[10px] text-[#c16549]"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Linked to catalog
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Author */}
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-[#1E1815] dark:text-white line-clamp-2 mb-1 group-hover:text-[#c16549] transition-colors">
                                            {ebook.title}
                                        </h3>
                                        {ebook.author && (
                                            <p className="text-xs text-[#6B6560] dark:text-gray-400 italic"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                {ebook.author}
                                            </p>
                                        )}
                                        {ebook.books && (
                                            <p className="text-[10px] text-[#6B6560] dark:text-gray-400 mt-1"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Based on: {ebook.books.title}
                                            </p>
                                        )}
                                    </div>

                                    {/* Read Button */}
                                    <button
                                        onClick={() => setReadingId(ebook.id)}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#c16549] hover:bg-[#89332a] text-white text-sm font-medium rounded-sm transition-colors"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                        Read Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
