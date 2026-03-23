import { useCallback, useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { booksAPI, reservationsAPI, auditAPI } from '../services/api';
import { getAuthState } from '../services/authStore';
import { isBookNewArrival } from '../utils/newArrival';

export default function BookDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [book, setBook] = useState(location.state?.book || null);
    const [loading, setLoading] = useState(!location.state?.book);
    const [reserving, setReserving] = useState(false);
    const [reserveMessage, setReserveMessage] = useState('');
    const [myReservation, setMyReservation] = useState(null);
    const [bookHistory, setBookHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const loadBookDetails = useCallback(async () => {
        setLoading(true);
        try {
            const data = await booksAPI.getById(id);
            setBook(data);
        } catch (error) {
            console.error('Error loading book:', error);
            setBook(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadBookHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const history = await auditAPI.getBookAudit(id, 10);
            setBookHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error('Error loading book history:', error);
            setBookHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, [id]);

    useEffect(() => {
        if (!book || String(book.id) !== id) {
            loadBookDetails();
        }
        loadBookHistory();
    }, [book, id, loadBookDetails, loadBookHistory]);

    useEffect(() => {
        const authState = getAuthState();
        if (!authState.isAuthenticated) {
            setMyReservation(null);
            return;
        }

        let isMounted = true;
        reservationsAPI.getMy({ status: 'pending', limit: 100 })
            .then((reservations) => {
                if (!isMounted) return;
                const activeReservation = Array.isArray(reservations)
                    ? reservations.find((reservation) => Number(reservation.book_id) === Number(id))
                    : null;
                setMyReservation(activeReservation || null);
            })
            .catch(() => {
                if (!isMounted) return;
                setMyReservation(null);
            });

        return () => {
            isMounted = false;
        };
    }, [id]);

    const handleReserve = async () => {
        const authState = getAuthState();
        if (!authState.isAuthenticated) {
            navigate('/login');
            return;
        }

        setReserving(true);
        setReserveMessage('');
        try {
            const reservation = await reservationsAPI.create({ book_id: Number.parseInt(id, 10) });
            setMyReservation(reservation);
            const queue = reservation?.position_in_queue ? ` You're #${reservation.position_in_queue} in the queue.` : '';
            setReserveMessage(`Reservation placed successfully.${queue}`);
            setTimeout(() => setReserveMessage(''), 5000);
        } catch (error) {
            setReserveMessage(error.message || 'Failed to reserve this book');
            setTimeout(() => setReserveMessage(''), 5000);
        } finally {
            setReserving(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!myReservation?.id) return;

        setReserving(true);
        setReserveMessage('');
        try {
            await reservationsAPI.cancel(myReservation.id);
            setMyReservation(null);
            setReserveMessage('Reservation cancelled successfully.');
            setTimeout(() => setReserveMessage(''), 5000);
        } catch (error) {
            setReserveMessage(error.message || 'Failed to cancel reservation');
            setTimeout(() => setReserveMessage(''), 5000);
        } finally {
            setReserving(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <>
                <style>{`
                    .bg-paper-grain {
                        background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                    }
                `}</style>
                <Header />
                <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] flex items-center justify-center pt-24 relative"
                    style={{ fontFamily: "'Newsreader', serif" }}>
                    <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>
                    <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-2 border-[#E8E4DF] border-t-[#c16549]"></div>
                        <p className="text-[#6B6560] dark:text-gray-400 text-lg italic"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Loading book details...
                        </p>
                    </div>
                </div>
            </>
        );
    }

    if (!book) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] flex items-center justify-center pt-24">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-8xl text-[#E8E4DF] dark:text-[#3d3935] mb-4 block">
                            library_books
                        </span>
                        <h2 className="text-2xl font-bold text-[#1E1815] dark:text-white mb-2">Book not found</h2>
                        <p className="text-[#6B6560] dark:text-gray-400 mb-6"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            The book you're looking for doesn't exist.
                        </p>
                        <Link to="/catalog"
                            className="inline-block bg-[#c16549] text-white px-6 py-3 rounded-sm hover:bg-[#89332a] transition-colors"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Browse Catalog
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    const isNewArrival = isBookNewArrival(book);

    return (
        <>
            <style>{`
                /* Editorial Design System Styles */
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background-color: #d4cec7; border-radius: 20px; }
                ::-webkit-scrollbar-thumb:hover { background-color: #c16549; }
                
                /* Paper grain texture */
                .bg-paper-grain {
                    background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
                }
                
                /* Editorial shadows */
                .editorial-shadow {
                    box-shadow: 0 4px 20px -2px rgba(30, 24, 21, 0.08);
                }
                
                .editorial-shadow-lg {
                    box-shadow: 0 10px 40px -4px rgba(30, 24, 21, 0.12);
                }
                
                /* Book cover shadow */
                .book-shadow {
                    box-shadow: -12px 12px 32px rgba(0,0,0,0.25), -3px 3px 8px rgba(0,0,0,0.1);
                }

                .new-arrival-ribbon {
                    position: absolute;
                    top: 14px;
                    right: -34px;
                    width: 132px;
                    background: linear-gradient(90deg, #2f5233 0%, #3c6a42 100%);
                    color: #ffffff;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    text-align: center;
                    padding: 4px 0;
                    transform: rotate(35deg);
                    box-shadow: 0 4px 12px rgba(47, 82, 51, 0.32);
                    z-index: 20;
                    pointer-events: none;
                }
                
                /* Fade-in animation */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s ease-out forwards;
                }
                
                /* Stagger delays */
                .delay-100 { animation-delay: 0.1s; opacity: 0; }
                .delay-200 { animation-delay: 0.2s; opacity: 0; }
                .delay-300 { animation-delay: 0.3s; opacity: 0; }
                .delay-400 { animation-delay: 0.4s; opacity: 0; }
                
                /* Drop cap for description */
                .drop-cap::first-letter {
                    font-size: 4rem;
                    font-weight: bold;
                    float: left;
                    line-height: 0.85;
                    margin-right: 0.5rem;
                    margin-top: 0.1rem;
                    color: #c16549;
                }
            `}</style>

            <Header />
            <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] text-[#1E1815] dark:text-[#FAF7F2] antialiased flex flex-col pt-24 relative"
                style={{ fontFamily: "'Newsreader', serif" }}>
                
                {/* Paper Grain Texture Overlay */}
                <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>

                <main className="flex-grow w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-8 md:pt-12 pb-10 md:pb-16 relative z-10">
                    
                    {/* Breadcrumb Navigation */}
                    <nav className="flex items-center gap-2 mb-10 md:mb-14 text-sm text-[#6B6560] dark:text-gray-400 animate-fade-in-up delay-100"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        <Link to="/" className="hover:text-[#c16549] transition-colors">Home</Link>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <Link to="/catalog" className="hover:text-[#c16549] transition-colors">Catalog</Link>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-[#1E1815] dark:text-white font-medium truncate max-w-xs">
                            {book.title?.substring(0, 40)}{book.title?.length > 40 ? '...' : ''}
                        </span>
                    </nav>

                    {/* Hero Section - Book Cover + Primary Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-16 md:mb-24">
                        
                        {/* Left: Book Cover */}
                        <div className="lg:col-span-5 xl:col-span-4 animate-fade-in-up delay-200">
                            <div className="sticky top-32">
                                <div className="relative group w-full max-w-md mx-auto lg:mx-0">
                                    {/* Book Cover */}
                                    <div className="w-full aspect-[2/3] bg-[#E8E4DF] dark:bg-[#3d3935] rounded-r-lg rounded-l-sm book-shadow transform transition-all duration-500 hover:scale-[1.02] overflow-hidden relative">
                                        {isNewArrival && (
                                            <div className="new-arrival-ribbon" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                New Arrival
                                            </div>
                                        )}

                                        {/* Spine highlight */}
                                        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-white/30 to-transparent z-10 pointer-events-none"></div>
                                        
                                        {book.cover_image_url ? (
                                            <>
                                                <img
                                                    src={book.cover_image_url}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover object-center"
                                                />
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549] flex items-center justify-center p-8">
                                                <div className="text-center">
                                                    <span className="material-symbols-outlined text-white/30 text-8xl mb-4 block">
                                                        auto_stories
                                                    </span>
                                                    <p className="text-white font-bold text-xl leading-tight">
                                                        {book.title}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Info Card */}
                                    <div className="mt-8 bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-6 border border-[#E8E4DF] dark:border-[#3d3935]">
                                        <h4 className="text-xs font-semibold text-[#c16549] uppercase tracking-[0.15em] mb-4"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            Quick Information
                                        </h4>
                                        <div className="space-y-3 text-sm" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            <div className="flex justify-between items-center pb-3 border-b border-[#E8E4DF] dark:border-[#3d3935]">
                                                <span className="text-[#6B6560] dark:text-gray-400">Category</span>
                                                <span className="font-medium text-[#1E1815] dark:text-white">
                                                    {book.category || 'General'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pb-3 border-b border-[#E8E4DF] dark:border-[#3d3935]">
                                                <span className="text-[#6B6560] dark:text-gray-400">Total Copies</span>
                                                <span className="font-medium text-[#1E1815] dark:text-white">
                                                    {book.total_copies || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pb-3 border-b border-[#E8E4DF] dark:border-[#3d3935]">
                                                <span className="text-[#6B6560] dark:text-gray-400">Available</span>
                                                <span className={`font-bold ${book.available_copies > 0 ? 'text-[#2f5233]' : 'text-[#c16549]'}`}>
                                                    {book.available_copies || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pb-3 border-b border-[#E8E4DF] dark:border-[#3d3935]">
                                                <span className="text-[#6B6560] dark:text-gray-400">Language</span>
                                                <span className="font-medium text-[#1E1815] dark:text-white">
                                                    {book.language || 'English'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#6B6560] dark:text-gray-400">Location</span>
                                                <span className="font-medium text-[#1E1815] dark:text-white">
                                                    {book.location || 'Main Library'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Book Details & Actions */}
                        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center animate-fade-in-up delay-300">
                            {/* Category badge */}
                            <div className="mb-4">
                                <span className="inline-block px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest rounded-full bg-[#f4ede8] dark:bg-[#3d3935] text-[#c16549] dark:text-[#f4a690] border border-[#c16549]/20"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {book.category || 'Uncategorized'}
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-[#1E1815] dark:text-white leading-[1.05] tracking-tight mb-4">
                                {book.title}
                            </h1>

                            {/* Author */}
                            <h2 className="text-2xl md:text-3xl font-normal italic text-[#6B6560] dark:text-gray-400 mb-8"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                by {book.author || 'Unknown Author'}
                            </h2>

                            {/* Availability Status (Mobile) */}
                            <div className="flex lg:hidden items-center gap-3 mb-8 p-4 bg-white dark:bg-[#2a2622] rounded-sm border-l-4 border-[#c16549] editorial-shadow">
                                <span className={`material-symbols-outlined text-2xl ${book.available_copies > 0 ? 'text-[#2f5233]' : 'text-[#c16549]'}`}>
                                    {book.available_copies > 0 ? 'check_circle' : 'schedule'}
                                </span>
                                <div>
                                    <p className="font-bold text-[#1E1815] dark:text-white text-lg"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {book.available_copies > 0 
                                            ? `${book.available_copies} ${book.available_copies === 1 ? 'copy' : 'copies'} available` 
                                            : 'Currently unavailable'}
                                    </p>
                                    <p className="text-xs text-[#6B6560] dark:text-gray-400 mt-0.5"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {book.available_copies > 0 
                                            ? 'Ready to reserve or check out' 
                                            : 'Join the waitlist to be notified'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 mb-6 lg:mb-8">
                                {myReservation?.status === 'pending' ? (
                                    <>
                                        <button
                                            className="bg-[#6B6560] text-white px-8 py-4 rounded-sm font-semibold tracking-wide cursor-not-allowed flex items-center gap-2 editorial-shadow"
                                            disabled
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            <span className="material-symbols-outlined text-[20px]">bookmark_added</span>
                                            Reserved{myReservation?.position_in_queue ? ` (Queue #${myReservation.position_in_queue})` : ''}
                                        </button>
                                        <button
                                            onClick={handleCancelReservation}
                                            disabled={reserving}
                                            className="bg-white dark:bg-[#2a2622] border-2 border-[#E8E4DF] dark:border-[#3d3935] hover:border-[#c16549] dark:hover:border-[#c16549] text-[#1E1815] dark:text-white px-6 py-4 rounded-sm font-semibold tracking-wide transition-all disabled:opacity-60"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            {reserving ? 'Cancelling...' : 'Cancel Reservation'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleReserve}
                                        disabled={reserving}
                                        className="bg-[#c16549] hover:bg-[#89332a] text-white px-8 py-4 rounded-sm font-semibold tracking-wide transition-all editorial-shadow-lg disabled:opacity-60 flex items-center gap-2"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        <span className="material-symbols-outlined text-[20px]">
                                            {book.available_copies > 0 ? 'bookmark_add' : 'schedule'}
                                        </span>
                                        {reserving ? 'Reserving...' : book.available_copies > 0 ? 'Reserve This Book' : 'Join Waitlist'}
                                    </button>
                                )}
                            </div>

                            {/* Availability Status (Desktop) */}
                            <div className="hidden lg:flex items-center gap-3 mb-8 p-4 bg-white dark:bg-[#2a2622] rounded-sm border-l-4 border-[#c16549] editorial-shadow">
                                <span className={`material-symbols-outlined text-2xl ${book.available_copies > 0 ? 'text-[#2f5233]' : 'text-[#c16549]'}`}>
                                    {book.available_copies > 0 ? 'check_circle' : 'schedule'}
                                </span>
                                <div>
                                    <p className="font-bold text-[#1E1815] dark:text-white text-lg"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {book.available_copies > 0 
                                            ? `${book.available_copies} ${book.available_copies === 1 ? 'copy' : 'copies'} available` 
                                            : 'Currently unavailable'}
                                    </p>
                                    <p className="text-xs text-[#6B6560] dark:text-gray-400 mt-0.5"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {book.available_copies > 0 
                                            ? 'Ready to reserve or check out' 
                                            : 'Join the waitlist to be notified'}
                                    </p>
                                </div>
                            </div>

                            {/* Reserve Message */}
                            {reserveMessage && (
                                <div className={`p-4 rounded-sm mb-6 border-l-4 ${
                                    reserveMessage.toLowerCase().includes('success') 
                                        ? 'bg-[#f4f8f4] dark:bg-[#2a3230] border-[#2f5233] text-[#2f5233]' 
                                        : 'bg-[#fef5f3] dark:bg-[#3d2a27] border-[#c16549] text-[#c16549]'
                                }`} style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    <p className="text-sm font-medium">{reserveMessage}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Information Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 border-t border-[#E8E4DF] dark:border-[#3d3935] pt-16 mb-16">
                        
                        {/* Left: Description & Metadata */}
                        <div className="lg:col-span-8 animate-fade-in-up delay-400">
                            {/* Synopsis */}
                            <div className="mb-12">
                                <h3 className="text-xs font-semibold text-[#c16549] uppercase tracking-[0.15em] mb-6"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Synopsis
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="drop-cap text-lg md:text-xl leading-relaxed text-[#1E1815] dark:text-gray-300"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        {book.description || `Discover "${book.title}"${book.author ? ` by ${book.author}` : ''}. This book is part of our carefully curated collection. Visit the circulation desk or reserve online to borrow this title.`}
                                    </p>
                                </div>
                            </div>

                            {/* Publication Details Grid */}
                            <div className="mb-12">
                                <h3 className="text-xs font-semibold text-[#c16549] uppercase tracking-[0.15em] mb-6"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Publication Details
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-8 bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935]">
                                    {[
                                        { label: 'ISBN', value: book.isbn || 'N/A', icon: 'qr_code_2' },
                                        { label: 'Publisher', value: book.publisher || 'Unknown', icon: 'apartment' },
                                        { label: 'Published', value: book.publication_year || 'Unknown', icon: 'calendar_today' },
                                        { label: 'Language', value: book.language || 'English', icon: 'language' },
                                        { label: 'Location', value: book.location || 'Main Library', icon: 'location_on' },
                                        { label: 'Date Added', value: formatDate(book.created_at), icon: 'schedule' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex items-center gap-2 text-[#6B6560] dark:text-gray-400">
                                                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                                <h4 className="text-xs uppercase tracking-wider font-medium"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    {item.label}
                                                </h4>
                                            </div>
                                            <p className="text-[#1E1815] dark:text-white font-medium"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                {item.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Activity Timeline */}
                        <div className="lg:col-span-4 animate-fade-in-up delay-400">
                            <div className="sticky top-32">
                                <h3 className="text-xs font-semibold text-[#c16549] uppercase tracking-[0.15em] mb-6"
                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Recent Activity
                                </h3>
                                
                                <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-6 border border-[#E8E4DF] dark:border-[#3d3935]">
                                    {loadingHistory ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E8E4DF] border-t-[#c16549]"></div>
                                        </div>
                                    ) : bookHistory.length === 0 ? (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-[#E8E4DF] dark:text-[#3d3935] mb-3 block">
                                                history
                                            </span>
                                            <p className="text-sm text-[#6B6560] dark:text-gray-400 italic"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                No activity recorded yet
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                            {bookHistory.map((activity, idx) => (
                                                <div key={idx} className="flex gap-3 pb-4 border-b border-[#E8E4DF] dark:border-[#3d3935] last:border-0 last:pb-0">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#f4ede8] dark:bg-[#3d3935] flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[#c16549] text-[16px]">
                                                            {activity.action === 'create' ? 'add_circle' : 
                                                             activity.action === 'update' ? 'edit' : 
                                                             activity.action === 'checkout' ? 'logout' : 
                                                             activity.action === 'checkin' ? 'login' : 'history'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[#1E1815] dark:text-white capitalize mb-0.5"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {activity.action?.replace('_', ' ') || 'Activity'}
                                                        </p>
                                                        <p className="text-xs text-[#6B6560] dark:text-gray-400"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {formatDate(activity.timestamp || activity.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer spacing */}
                    <div className="h-16 md:h-24" />
                </main>
            </div>
        </>
    );
}
