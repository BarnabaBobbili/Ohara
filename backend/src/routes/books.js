import express from 'express';
import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { logBookUpdate, logBookDeletion } from '../db/auditLogger.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 20,
            maxLimit: 100,
            maxSkip: 5000,
        });

        const where = {};
        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { author: { contains: search, mode: 'insensitive' } },
                { isbn: { contains: search, mode: 'insensitive' } },
            ];
        }

        const books = await prisma.books.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updated_at: 'desc' },
        });

        res.json(books);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/isbn/:isbn', async (req, res) => {
    try {
        const book = await prisma.books.findUnique({
            where: { isbn: req.params.isbn },
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await prisma.books.findUnique({
            where: { id: Number.parseInt(req.params.id, 10) },
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            isbn, title, author, publisher, publication_year, category,
            language, pages, description, cover_image_url, total_copies, location,
        } = req.body;

        const existing = await prisma.books.findUnique({ where: { isbn } });
        if (existing) {
            return res.status(400).json({ detail: 'Book with this ISBN already exists' });
        }

        const book = await prisma.books.create({
            data: {
                isbn,
                title,
                author,
                publisher,
                publication_year,
                category,
                language: language || 'English',
                pages,
                description,
                cover_image_url,
                total_copies: total_copies || 1,
                available_copies: total_copies || 1,
                location,
            },
        });

        logActivity({
            action: 'book_added',
            book_id: book.id,
            book_title: book.title,
            book_author: book.author,
            isbn: book.isbn,
        });

        invalidateAnalyticsCache();
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const bookId = Number.parseInt(req.params.id, 10);

        const oldBookData = await prisma.books.findUnique({
            where: { id: bookId },
        });

        if (!oldBookData) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        const allowedFields = [
            'title', 'author', 'publisher', 'publication_year',
            'category', 'language', 'pages', 'description',
            'cover_image_url', 'total_copies', 'location',
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ detail: 'No fields to update' });
        }

        const newBookData = await prisma.books.update({
            where: { id: bookId },
            data: updateData,
        });

        logBookUpdate(bookId, oldBookData, newBookData, 'admin');
        logActivity({
            action: 'book_updated',
            book_id: bookId,
            book_title: newBookData.title,
            fields_changed: Object.keys(updateData),
        });

        invalidateAnalyticsCache();
        res.json(newBookData);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const bookId = Number.parseInt(req.params.id, 10);

        const activeTransaction = await prisma.transactions.findFirst({
            where: { book_id: bookId, status: 'checked_out' },
            select: { id: true },
        });

        if (activeTransaction) {
            return res.status(400).json({
                detail: 'Cannot delete book with active transactions',
            });
        }

        const bookInfo = await prisma.books.findUnique({
            where: { id: bookId },
        });

        if (!bookInfo) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        await prisma.books.delete({ where: { id: bookId } });

        logActivity({
            action: 'book_deleted',
            book_id: bookInfo.id,
            book_title: bookInfo.title,
            book_author: bookInfo.author,
            isbn: bookInfo.isbn,
        });
        logBookDeletion(bookInfo.id, bookInfo, 'admin');

        invalidateAnalyticsCache();
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
