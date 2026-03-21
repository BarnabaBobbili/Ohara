import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collectionsAPI } from '../services/api';
import Header from '../components/Header';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const preselectedId = searchParams.get('id') ? parseInt(searchParams.get('id')) : null;
    const navigate = useNavigate();

    useEffect(() => {
        collectionsAPI.getAll()
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                setCollections(list);
                if (list.length > 0) {
                    // Auto-select the id from query param if present
                    const match = preselectedId ? list.find(c => c.id === preselectedId) : null;
                    setSelected(match || list[0]);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"
                style={{ fontFamily: "'Newsreader', serif" }}>
                <div className="text-[#6B6560] text-lg animate-pulse">Loading collections…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#1E1815]"
            style={{ fontFamily: "'Newsreader', serif" }}>
            
            <Header />

            {/* Header */}
            <div className="border-b border-[#E8E4DF] pt-24 pb-10 px-6 md:px-16 lg:px-24">
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#c16549] mb-3"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    02 — Curated Shelves
                </p>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">All Collections</h1>
                <p className="text-lg text-[#6B6560] italic mt-3 max-w-xl"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    Every collection, curated by our librarians and community.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-24 py-12 gap-10">

                {/* Left: Collection List */}
                <aside className="lg:w-72 flex-shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6560] mb-4"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        Collections
                    </h2>
                    <div className="flex flex-col gap-1">
                        {collections.map(col => (
                            <button
                                key={col.id}
                                onClick={() => setSelected(col)}
                                className={`text-left px-4 py-3 rounded-lg transition-all ${
                                    selected?.id === col.id
                                        ? 'bg-[#1E1815] text-white'
                                        : 'hover:bg-[#EDEAE5] text-[#1E1815]'
                                }`}
                            >
                                <div className="font-semibold text-base">{col.name}</div>
                                {col.description && (
                                    <div className={`text-xs mt-0.5 ${selected?.id === col.id ? 'text-gray-300' : 'text-[#6B6560]'}`}
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {col.books?.length || 0} books
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Right: Books in selected collection */}
                <main className="flex-1 min-w-0">
                    {selected ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold">{selected.name}</h2>
                                {selected.description && (
                                    <p className="text-[#6B6560] italic mt-2"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {selected.description}
                                    </p>
                                )}
                            </div>

                            {(!selected.books || selected.books.length === 0) ? (
                                <div className="text-center py-20 text-[#6B6560] italic">
                                    No books in this collection yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {selected.books.map(book => (
                                        <Link
                                            to={`/book/${book.id}`}
                                            key={book.id}
                                            className="group flex flex-col gap-2"
                                        >
                                            {/* Cover */}
                                            <div className="aspect-[2/3] rounded-md overflow-hidden bg-[#E8E4DF] shadow-md relative">
                                                {book.cover_image_url ? (
                                                    <img
                                                        src={book.cover_image_url}
                                                        alt={book.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-[#2c3e50] to-[#4a1c1c]">
                                                        <div className="w-0.5 h-full absolute left-3 top-0 bg-white/20" />
                                                        <p className="text-white/80 text-xs text-center font-bold italic leading-tight"
                                                            style={{ fontFamily: "'Newsreader', serif" }}>
                                                            {book.title}
                                                        </p>
                                                    </div>
                                                )}
                                                {book.available_copies === 0 && (
                                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-1 uppercase tracking-widest">
                                                        Unavailable
                                                    </div>
                                                )}
                                            </div>
                                            {/* Meta */}
                                            <div>
                                                <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-[#c16549] transition-colors">
                                                    {book.title}
                                                </p>
                                                <p className="text-xs text-[#6B6560] mt-0.5"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    {book.author}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 text-[#6B6560] italic">
                            Select a collection from the left.
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
}
