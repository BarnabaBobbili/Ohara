/**
 * WishlistButton — Heart icon that toggles a book's wishlist status.
 *
 * Props:
 *   bookId    (number)  — required
 *   size      (string)  — 'sm' | 'md' | 'lg'  (default: 'md')
 *   showLabel (bool)    — show "Save" / "Saved" text label
 *   className (string)  — extra classes for the button wrapper
 *
 * Shows nothing if user is not logged in.
 */
import { useState, useEffect } from 'react';
import { wishlistAPI } from '../../services/api';
import { getAuthState } from '../../services/authStore';

export default function WishlistButton({ bookId, size = 'md', showLabel = false, className = '' }) {
    const [wishlisted, setWishlisted] = useState(false);
    const [loading, setLoading] = useState(false);

    const authState = getAuthState();
    const isAuthenticated = authState.isAuthenticated;

    useEffect(() => {
        if (!isAuthenticated || !bookId) return;
        wishlistAPI.check(bookId)
            .then(r => setWishlisted(r?.wishlisted || false))
            .catch(() => {});
    }, [bookId, isAuthenticated]);

    const toggle = async (e) => {
        // Prevent parent click handlers (e.g. book card navigation)
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated || loading) return;
        setLoading(true);
        const wasWishlisted = wishlisted;
        setWishlisted(!wishlisted); // optimistic update

        try {
            if (wasWishlisted) {
                await wishlistAPI.remove(bookId);
            } else {
                await wishlistAPI.add(bookId);
            }
        } catch {
            setWishlisted(wasWishlisted); // revert on error
        } finally {
            setLoading(false);
        }
    };

    // Don't render if user is not logged in
    if (!isAuthenticated) return null;

    const iconSize = size === 'sm' ? 'text-[18px]' : size === 'lg' ? 'text-[28px]' : 'text-[22px]';
    const iconColor = wishlisted ? 'text-[#c16549]' : 'text-[#6B6560] hover:text-[#c16549]';

    return (
        <button
            id={`wishlist-btn-${bookId}`}
            onClick={toggle}
            disabled={loading}
            title={wishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            aria-label={wishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            className={`flex items-center gap-1.5 transition-all duration-300 disabled:opacity-50 ${className}`}
        >
            <span
                className={`material-symbols-outlined ${iconSize} ${iconColor} transition-all duration-300`}
                style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}
            >
                favorite
            </span>
            {showLabel && (
                <span
                    className={`text-xs font-medium ${iconColor}`}
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                    {wishlisted ? 'Saved' : 'Save'}
                </span>
            )}
        </button>
    );
}
