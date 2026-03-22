import express from 'express';
import {
    getRecommendationsForMember,
    getRelatedBooks,
    getPopularBooks,
} from '../db/neo4j.js';
import prisma from '../db/prisma.js';

const router = express.Router();

// ─── GET /api/recommendations/popular ────────────────────────
// Most borrowed books from Neo4j. Falls back to PostgreSQL if Neo4j is empty.
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Try Neo4j first
        let books = await getPopularBooks(limit);

        // If Neo4j has no data yet, fall back to PostgreSQL most-borrowed or recent books
        if (!books.length) {
            const txGroups = await prisma.transactions.groupBy({
                by: ['book_id'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: limit,
            });
            
            if (txGroups.length > 0) {
                const ids = txGroups.map(g => g.book_id);
                const pgBooks = await prisma.books.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, title: true, author: true, cover_image_url: true, category: true },
                });
                // Preserve order
                books = ids.map(id => pgBooks.find(b => b.id === id)).filter(Boolean);
            } else {
                // No transactions yet, just return recent books
                books = await prisma.books.findMany({
                    select: { id: true, title: true, author: true, cover_image_url: true, category: true },
                    orderBy: { created_at: 'desc' },
                    take: limit,
                });
            }
        } else {
            // Enrich with full book details from PostgreSQL
            const ids = books.map(b => b.book_id);
            const pgBooks = await prisma.books.findMany({
                where: { id: { in: ids } },
                select: { id: true, title: true, author: true, cover_image_url: true, category: true, available_copies: true },
            });
            books = books.map(b => ({ ...b, ...pgBooks.find(p => p.id === b.book_id) }));
        }

        res.json(books);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/recommendations/related/:bookId ─────────────────
router.get('/related/:bookId', async (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId);
        const limit  = parseInt(req.query.limit) || 8;
        let related  = await getRelatedBooks(bookId, limit);

        if (!related.length) {
            // Fallback: same category from PostgreSQL
            const book = await prisma.books.findUnique({ where: { id: bookId }, select: { category: true } });
            if (book?.category) {
                const fallback = await prisma.books.findMany({
                    where: { category: book.category, id: { not: bookId } },
                    select: { id: true, title: true, author: true, cover_image_url: true, category: true },
                    take: limit,
                });
                related = fallback.map(b => ({ ...b, book_id: b.id, reason: 'same_category' }));
            }
        } else {
            const ids = related.map(r => r.book_id);
            const pgBooks = await prisma.books.findMany({
                where: { id: { in: ids } },
                select: { id: true, title: true, author: true, cover_image_url: true, category: true, available_copies: true },
            });
            related = related.map(r => ({ ...r, ...pgBooks.find(p => p.id === r.book_id) }));
        }

        res.json(related);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/recommendations/for-member/:memberId ───────────
router.get('/for-member/:memberId', async (req, res) => {
    try {
        const memberId = parseInt(req.params.memberId);
        const limit    = parseInt(req.query.limit) || 10;
        let recs       = await getRecommendationsForMember(memberId, limit);

        if (!recs.length) {
            // Fallback: new books the member hasn't borrowed
            const borrowed = await prisma.transactions.findMany({
                where: { member_id: memberId },
                select: { book_id: true },
            });
            const borrowedIds = borrowed.map(t => t.book_id);
            const fallback = await prisma.books.findMany({
                where: { id: { notIn: borrowedIds.length ? borrowedIds : [0] }, available_copies: { gt: 0 } },
                select: { id: true, title: true, author: true, cover_image_url: true, category: true },
                take: limit,
                orderBy: { created_at: 'desc' },
            });
            recs = fallback.map(b => ({ ...b, book_id: b.id, score: 0 }));
        } else {
            const ids = recs.map(r => r.book_id);
            const pgBooks = await prisma.books.findMany({
                where: { id: { in: ids } },
                select: { id: true, title: true, author: true, cover_image_url: true, category: true, available_copies: true },
            });
            recs = recs.map(r => ({ ...r, ...pgBooks.find(p => p.id === r.book_id) }));
        }

        res.json(recs);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
