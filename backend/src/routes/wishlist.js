/**
 * Wishlist Routes — /api/wishlist
 * Lets authenticated members save (heart) books and get wishlist-based recommendations.
 * Uses Neo4j WISHLISTED relationship.
 *
 * Auth Note: JWT can be Supabase (sub = UUID) or legacy (user_id = int).
 * We always resolve the member's integer PK from the DB using resolveMemberFromReq().
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../db/prisma.js';
import {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    isWishlisted,
    getWishlistRecommendations,
} from '../db/neo4j.js';

const router = express.Router();

/**
 * Resolves the integer member ID from the request token.
 * Tries three methods in order: Supabase UID, email, legacy user_id.
 */
const resolveMemberFromReq = async (req) => {
    if (req.supabase_uid) {
        const m = await prisma.members.findFirst({
            where: { supabase_uid: req.supabase_uid },
            select: { id: true },
        });
        if (m) return m;
    }
    if (req.user_email) {
        const m = await prisma.members.findFirst({
            where: { email: req.user_email },
            select: { id: true },
        });
        if (m) return m;
    }
    if (req.user?.user_id) {
        return prisma.members.findUnique({
            where: { id: req.user.user_id },
            select: { id: true },
        });
    }
    return null;
};

// ─── POST /api/wishlist/:bookId — Add book to wishlist ────────
router.post('/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.status(404).json({ detail: 'Member not found' });
        const bookId = Number.parseInt(req.params.bookId, 10);
        await addToWishlist(member.id, bookId);
        res.json({ wishlisted: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/wishlist/:bookId — Remove from wishlist ──────
router.delete('/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.status(404).json({ detail: 'Member not found' });
        const bookId = Number.parseInt(req.params.bookId, 10);
        await removeFromWishlist(member.id, bookId);
        res.json({ wishlisted: false });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/wishlist — Get full wishlist with book details ──
router.get('/', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.status(404).json({ detail: 'Member not found' });

        const items = await getWishlist(member.id);
        if (!items.length) return res.json([]);

        const ids = items.map(w => w.book_id);
        const books = await prisma.books.findMany({
            where: { id: { in: ids } },
            select: {
                id: true, title: true, author: true,
                cover_image_url: true, category: true,
                available_copies: true, publication_year: true, isbn: true,
            },
        });

        // Preserve wishlist order and attach added_at timestamp
        const result = items
            .map(w => {
                const book = books.find(b => b.id === w.book_id);
                return book ? { ...book, added_at: w.added_at } : null;
            })
            .filter(Boolean);

        res.json(result);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/wishlist/check/:bookId — Is this book wishlisted? ─
router.get('/check/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.json({ wishlisted: false });
        const bookId = Number.parseInt(req.params.bookId, 10);
        const wishlisted = await isWishlisted(member.id, bookId);
        res.json({ wishlisted });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/wishlist/recommendations — "Readers Also Saved" ─
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.json([]);
        const limit = Number.parseInt(req.query.limit, 10) || 8;

        let recs = await getWishlistRecommendations(member.id, limit);

        if (recs.length) {
            const ids = recs.map(r => r.book_id);
            const books = await prisma.books.findMany({
                where: { id: { in: ids } },
                select: {
                    id: true, title: true, author: true,
                    cover_image_url: true, category: true, available_copies: true,
                },
            });
            recs = recs.map(r => ({ ...r, ...books.find(b => b.id === r.book_id) }));
        }

        res.json(recs);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
