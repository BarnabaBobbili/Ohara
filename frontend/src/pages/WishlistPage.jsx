/**
 * WishlistPage — /wishlist
 * Shows a member's saved books and "Readers Also Saved" recommendations.
 * Redirects to /login if not authenticated.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WishlistButton from '../components/books/WishlistButton';
import { wishlistAPI } from '../services/api';
import { getAuthState } from '../services/authStore';

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState([]);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const { isAuthenticated } = getAuthState();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        Promise.all([
            wishlistAPI.getAll().catch(() => []),
            wishlistAPI.getRecommendations(6).catch(() => []),
        ]).then(([wl, r]) => {
            setWishlist(Array.isArray(wl) ? wl : []);
            setRecs(Array.isArray(r) ? r : []);
        }).finally(() => setLoading(false));
    }, [navigate]);

    if (loading) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] flex items-center justify-center pt-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#E8E4DF] border-t-[#c16549]" />
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

                    {/* Page Header */}
                    <div className="mb-10 fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-px bg-[#c16549] w-8" />
                            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Your Collection
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#1E1815] dark:text-white leading-tight">
                            My Wishlist
                            <span className="ml-3 text-lg font-normal text-[#6B6560] dark:text-gray-400">
                                {wishlist.length} {wishlist.length === 1 ? 'book' : 'books'}
                            </span>
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left: Wishlisted Books */}
                        <div className="lg:col-span-2">
                            {wishlist.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935]">
                                    <span className="material-symbols-outlined text-6xl text-[#E8E4DF] dark:text-[#3d3935] block mb-4">
                                        favorite
                                    </span>
                                    <h2 className="text-xl font-bold text-[#1E1815] dark:text-white mb-2">
                                        Your wishlist is empty
                                    </h2>
                                    <p className="text-sm text-[#6B6560] dark:text-gray-400 mb-6"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Save books you want to read by clicking the heart icon in the catalog.
                                    </p>
                                    <Link to="/catalog"
                                        className="inline-block bg-[#c16549] text-white px-6 py-3 rounded-sm hover:bg-[#89332a] transition-colors text-sm font-medium"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Browse Catalog
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {wishlist.map(book => (
                                        <div key={book.id}
                                            className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935] p-4 flex gap-4 group hover:border-[#c16549] transition-colors fade-in">
                                            {/* Cover */}
                                            <Link to={`/book/${book.id}`} className="shrink-0 w-16 h-24 bg-[#E8E4DF] dark:bg-[#3d3935] rounded-sm overflow-hidden">
                                                {book.cover_image_url ? (
                                                    <img src={book.cover_image_url} alt={book.title}
                                                        className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549] flex items-center justify-center p-1">
                                                        <p className="text-white/90 text-[9px] font-bold text-center leading-tight"
                                                            style={{ fontFamily: "'Newsreader', serif" }}>
                                                            {book.title}
                                                        </p>
                                                    </div>
                                                )}
                                            </Link>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/book/${book.id}`}>
                                                    <h3 className="text-sm font-bold text-[#1E1815] dark:text-white line-clamp-2 group-hover:text-[#c16549] transition-colors mb-1">
                                                        {book.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-xs text-[#6B6560] dark:text-gray-400 italic mb-2"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    {book.author || 'Unknown Author'}
                                                </p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${book.available_copies > 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}
                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        {book.available_copies > 0 ? `${book.available_copies} available` : 'Checked out'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <Link to={`/book/${book.id}`}
                                                        className="text-xs font-medium text-[#c16549] hover:underline"
                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        View & Reserve →
                                                    </Link>
                                                    <WishlistButton
                                                        bookId={book.id}
                                                        size="sm"
                                                        showLabel
                                                        className="text-[#6B6560] dark:text-gray-400 hover:text-[#c16549] transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Readers Also Saved */}
                        <div>
                            <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935] p-5 sticky top-28">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-[#c16549] text-base">recommend</span>
                                    <h2 className="text-xs font-bold text-[#c16549] uppercase tracking-[0.15em]"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Readers Also Saved
                                    </h2>
                                </div>

                                {recs.length === 0 ? (
                                    <p className="text-sm text-[#6B6560] dark:text-gray-400 italic text-center py-6"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Save more books to unlock personalised recommendations.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {recs.map(book => (
                                            <Link key={book.id || book.book_id} to={`/book/${book.id || book.book_id}`}
                                                className="flex items-center gap-3 group hover:bg-[#FAF7F2] dark:hover:bg-[#3d3935] p-2 rounded-sm transition-colors">
                                                <div className="shrink-0 w-10 h-14 bg-[#E8E4DF] dark:bg-[#3d3935] rounded-sm overflow-hidden">
                                                    {book.cover_image_url ? (
                                                        <img src={book.cover_image_url} alt={book.title}
                                                            className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-[#1E1815] dark:text-white line-clamp-2 group-hover:text-[#c16549] transition-colors"
                                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                                        {book.title}
                                                    </p>
                                                    <p className="text-[10px] text-[#6B6560] dark:text-gray-400 italic mt-0.5"
                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        {book.author || 'Unknown'}
                                                    </p>
                                                    {book.score > 0 && (
                                                        <span className="text-[9px] text-[#c16549] font-medium"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {book.score} readers saved this
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
