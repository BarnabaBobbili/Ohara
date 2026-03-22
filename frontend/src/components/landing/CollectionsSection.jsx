// Collections Section — shows 3 pinned collections from the database
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collectionsAPI } from '../../services/api';

const BOOK_STACK_COLORS = [
    ['#4a3b32', '#8b5a2b'],
    ['#2c3e50', '#e74c3c'],
    ['#5d4037', '#607d8b'],
];

const FALLBACK_COLLECTIONS = [
    { id: null, name: 'The Classics', description: 'Timeless tales that shaped the world.', books: [] },
    { id: null, name: 'Modern Wonders', description: 'New voices defining our generation.', books: [] },
    { id: null, name: "The Librarian's Choice", description: 'Hidden gems found in the stacks.', books: [] },
];

function CollectionCard({ collection, stackColors, onOpen }) {
    const [bottom, mid] = stackColors;
    const coverBook = collection.books?.[0];
    const coverUrl = coverBook?.cover_image_url || collection.cover_image || null;
    const bookCount = collection.books?.length || 0;

    return (
        <div
            className="group flex flex-col items-center w-full max-w-[320px] cursor-pointer"
            onClick={() => onOpen(collection)}
        >
            {/* Book Stack Visual */}
            <div className="relative w-56 h-72 flex justify-center items-center mb-8" style={{ perspective: '1000px' }}>
                {/* Bottom stack book */}
                <div
                    className="absolute w-44 h-60 rounded-sm transform -rotate-6 translate-x-4 translate-y-2 group-hover:-rotate-12 group-hover:translate-x-6 transition-all duration-500 ease-out border-l-4"
                    style={{ backgroundColor: bottom, borderColor: `${bottom}cc`, boxShadow: '2px 2px 5px rgba(0,0,0,.1),5px 5px 15px rgba(0,0,0,.15)' }}
                />
                {/* Middle stack book */}
                <div
                    className="absolute w-44 h-60 rounded-sm transform rotate-3 translate-x-2 -translate-y-1 group-hover:rotate-6 group-hover:translate-x-3 transition-all duration-500 ease-out border-l-4"
                    style={{ backgroundColor: mid, borderColor: `${mid}cc`, boxShadow: '2px 2px 5px rgba(0,0,0,.1),5px 5px 15px rgba(0,0,0,.15)' }}
                />
                {/* Top book / cover */}
                <div
                    className="absolute w-48 h-64 rounded-sm transform -rotate-2 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-500 ease-out z-10 overflow-hidden"
                    style={{ boxShadow: '2px 2px 5px rgba(0,0,0,.1),5px 5px 15px rgba(0,0,0,.15)' }}
                >
                    {coverUrl ? (
                        <>
                            <img
                                src={coverUrl}
                                alt={collection.name}
                                className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                        </>
                    ) : (
                        <div
                            className="w-full h-full flex items-end pb-4 pl-4"
                            style={{ background: `linear-gradient(135deg, ${bottom}, ${mid})` }}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/20" />
                            <p className="text-white font-serif italic text-lg leading-tight drop-shadow-md">
                                {collection.name}
                            </p>
                        </div>
                    )}
                    {/* Book count badge */}
                    {bookCount > 0 && (
                        <div className="absolute top-3 right-3 bg-[#d42511] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            {bookCount} {bookCount === 1 ? 'book' : 'books'}
                        </div>
                    )}
                </div>
            </div>

            {/* Text */}
            <div className="text-center mt-2 space-y-2">
                <h3 className="text-2xl font-bold text-[#181211] dark:text-white border-b-2 border-transparent group-hover:border-[#d42511]/30 transition-colors pb-1 inline-block">
                    {collection.name}
                </h3>
                <p className="font-display italic text-lg text-gray-500 dark:text-gray-400">
                    {collection.description}
                </p>
                <div className="pt-2">
                    <span className="text-[#d42511] text-sm font-bold tracking-widest uppercase opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1">
                        Explore <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function CollectionsSection() {
    const [collections, setCollections] = useState(FALLBACK_COLLECTIONS);
    const navigate = useNavigate();

    useEffect(() => {
        // Get only pinned collections (max 3) for the landing page
        collectionsAPI.getPinned()
            .then((data) => {
                if (Array.isArray(data) && data.length) {
                    // Fill up to 3 with fallbacks if fewer than 3 pinned
                    const filled = [...data];
                    while (filled.length < 3) {
                        filled.push(FALLBACK_COLLECTIONS[filled.length]);
                    }
                    setCollections(filled.slice(0, 3));
                }
            })
            .catch(() => {}); // silently use defaults
    }, []);

    const handleOpenCollection = (collection) => {
        if (collection.id) {
            // Navigate to the full collections page with the collection pre-selected
            navigate(`/collections?id=${collection.id}`);
        }
    };

    return (
        <>
            <style>{`
              .book-shadow {
                box-shadow: 2px 2px 5px rgba(0,0,0,0.1), 5px 5px 15px rgba(0,0,0,0.15);
              }
            `}</style>

            <div
                className="relative flex min-h-screen w-full flex-col bg-[#f8f6f6] dark:bg-[#221210] overflow-hidden font-display text-[#181211] dark:text-white"
                style={{ fontFamily: "'Newsreader', serif" }}
            >
                <div className="layout-container flex h-full grow flex-col relative z-10">

                    {/* Header */}
                    <div className="px-6 md:px-20 lg:px-40 flex flex-col items-center pt-16 pb-10">
                        <div className="layout-content-container flex flex-col max-w-[960px] w-full text-center">
                            <p className="text-[#c16549] text-sm font-medium tracking-widest uppercase mb-4">
                                01 — Collections
                            </p>
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#181211] dark:text-white">
                                Curated Shelves
                            </h2>
                            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 italic">
                                Hand-picked selections for the discerning reader
                            </p>
                        </div>
                    </div>

                    {/* 3 Collections */}
                    <div className="px-6 md:px-20 lg:px-40 flex flex-1 justify-center pb-12">
                        <div className="layout-content-container flex flex-col lg:flex-row gap-16 lg:gap-8 max-w-[1200px] w-full items-center lg:items-start justify-between">
                            {collections.map((col, idx) => (
                                <CollectionCard
                                    key={col.id || idx}
                                    collection={col}
                                    stackColors={BOOK_STACK_COLORS[idx] || BOOK_STACK_COLORS[0]}
                                    onOpen={handleOpenCollection}
                                />
                            ))}
                        </div>
                    </div>

                    {/* "View All Collections" Button */}
                    <div className="flex justify-center pb-20 px-6">
                        <Link
                            to="/collections"
                            className="group inline-flex items-center gap-3 px-8 py-4 border border-[#181211]/20 dark:border-white/20 rounded-full text-sm font-bold uppercase tracking-widest text-[#181211] dark:text-white hover:bg-[#181211] hover:text-white dark:hover:bg-white dark:hover:text-[#181211] transition-all duration-300"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                        >
                            <span className="material-symbols-outlined text-[#d42511] group-hover:text-inherit transition-colors">
                                library_books
                            </span>
                            Browse All Collections
                            <span className="material-symbols-outlined text-base opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                arrow_forward
                            </span>
                        </Link>
                    </div>

                </div>
            </div>
        </>
    );
}
