import express from 'express';
import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { logBookUpdate, logBookDeletion, logBookCreation } from '../db/auditLogger.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { syncBookToNeo4j } from '../db/neo4j.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

const parseNonNegativeInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
};

router.get('/', async (req, res) => {
    try {
        const { category, search, genre, language, is_active } = req.query;
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 20,
            maxLimit: 100,
            maxSkip: 5000,
        });

        const where = {};
        
        // Only show active books by default
        if (is_active !== 'false') {
            where.is_active = true;
        }
        
        if (category) {
            where.category = category;
        }
        
        if (genre) {
            where.genre = genre;
        }
        
        if (language) {
            where.language = language;
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

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            isbn, title, author, publisher, publication_year, category, genre,
            language, pages, description, cover_image_url, total_copies, location,
            edition, format, dimensions, weight_grams, tags, is_reference_only,
        } = req.body;

        const existing = await prisma.books.findUnique({ where: { isbn } });
        if (existing) {
            return res.status(400).json({ detail: 'Book with this ISBN already exists' });
        }

        const normalizedTotalCopies = parseNonNegativeInteger(total_copies ?? 1);
        if (normalizedTotalCopies === null || normalizedTotalCopies < 1) {
            return res.status(400).json({ detail: 'total_copies must be a positive integer' });
        }

        const book = await prisma.books.create({
            data: {
                isbn,
                title,
                author,
                publisher,
                publication_year,
                category,
                genre,
                language: language || 'English',
                pages,
                description,
                cover_image_url,
                total_copies: normalizedTotalCopies,
                available_copies: normalizedTotalCopies,
                location,
                edition,
                format: format || 'Hardcover',
                dimensions,
                weight_grams,
                tags: tags || [],
                is_reference_only: is_reference_only || false,
                is_active: true,
            },
        });

        // Log to activity logs (MongoDB)
        logActivity({
            action: 'book_added',
            entity_type: 'book',
            entity_id: book.id,
            entity_details: {
                title: book.title,
                author: book.author,
                isbn: book.isbn,
            },
            performed_by: {
                type: 'staff',
                email: req.actor?.email || 'admin',
            },
        });
        
        // Log to audit trail (MySQL)
        logBookCreation(book.id, book, req.actor?.email || 'admin', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        
        // Sync to Neo4j
        syncBookToNeo4j(book).catch(() => {});

        invalidateAnalyticsCache();
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const bookId = Number.parseInt(req.params.id, 10);

        const oldBookData = await prisma.books.findUnique({
            where: { id: bookId },
        });

        if (!oldBookData) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        // All allowed fields for update
        const allowedFields = [
            'isbn', 'title', 'author', 'publisher', 'publication_year',
            'category', 'genre', 'language', 'pages', 'description',
            'cover_image_url', 'total_copies', 'available_copies', 'location',
            'edition', 'format', 'dimensions', 'weight_grams', 'tags',
            'is_reference_only', 'is_active',
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

        // Keep copy counts consistent with active loans to avoid check_available_copies violations.
        if (updateData.total_copies !== undefined || updateData.available_copies !== undefined) {
            const activeLoans = await prisma.transactions.count({
                where: {
                    book_id: bookId,
                    status: { in: ['checked_out', 'overdue'] },
                },
            });

            const nextTotalRaw = updateData.total_copies !== undefined
                ? updateData.total_copies
                : oldBookData.total_copies;
            const nextTotal = parseNonNegativeInteger(nextTotalRaw);

            if (nextTotal === null || nextTotal < 1) {
                return res.status(400).json({ detail: 'total_copies must be a positive integer' });
            }

            if (nextTotal < activeLoans) {
                return res.status(400).json({
                    detail: `Cannot reduce total copies below active loans (${activeLoans}). Return some books first.`,
                });
            }

            if (updateData.total_copies !== undefined) {
                updateData.total_copies = nextTotal;
                updateData.available_copies = nextTotal - activeLoans;
            } else {
                const nextAvailable = parseNonNegativeInteger(updateData.available_copies);
                if (nextAvailable === null) {
                    return res.status(400).json({ detail: 'available_copies must be a non-negative integer' });
                }
                if (nextAvailable > nextTotal) {
                    return res.status(400).json({ detail: 'available_copies cannot exceed total_copies' });
                }
                if (nextAvailable < (nextTotal - activeLoans)) {
                    return res.status(400).json({
                        detail: `available_copies is too low for current active loans (${activeLoans})`,
                    });
                }
                updateData.available_copies = nextAvailable;
            }
        }

        // If ISBN is being changed, check for duplicates
        if (updateData.isbn && updateData.isbn !== oldBookData.isbn) {
            const existingBook = await prisma.books.findUnique({ where: { isbn: updateData.isbn } });
            if (existingBook) {
                return res.status(400).json({ detail: 'Book with this ISBN already exists' });
            }
        }

        const newBookData = await prisma.books.update({
            where: { id: bookId },
            data: updateData,
        });

        // Only log fields that actually changed (compare old vs new values)
        const actuallyChangedFields = Object.keys(updateData).filter(field => {
            const oldVal = oldBookData[field];
            const newVal = newBookData[field];
            // Handle different types (string, number, null, array)
            if (oldVal === null && newVal === null) return false;
            if (oldVal === null || newVal === null) return true;
            if (Array.isArray(oldVal) && Array.isArray(newVal)) {
                return JSON.stringify(oldVal) !== JSON.stringify(newVal);
            }
            return String(oldVal) !== String(newVal);
        });

        // Log to audit trail (MySQL) - records field-level changes
        logBookUpdate(bookId, oldBookData, newBookData, req.actor?.email || 'admin', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        
        // Log to activity logs (MongoDB) - only if something actually changed
        if (actuallyChangedFields.length > 0) {
            logActivity({
                action: 'book_updated',
                entity_type: 'book',
                entity_id: bookId,
                entity_details: {
                    title: newBookData.title,
                    author: newBookData.author,
                    isbn: newBookData.isbn,
                },
                fields_changed: actuallyChangedFields,
                performed_by: {
                    type: 'staff',
                    email: req.actor?.email || 'admin',
                },
            });
        }
        
        syncBookToNeo4j(newBookData).catch(() => {});

        invalidateAnalyticsCache();
        res.json(newBookData);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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

        // Log to activity logs (MongoDB)
        logActivity({
            action: 'book_deleted',
            entity_type: 'book',
            entity_id: bookInfo.id,
            entity_details: {
                title: bookInfo.title,
                author: bookInfo.author,
                isbn: bookInfo.isbn,
            },
            performed_by: {
                type: 'staff',
                email: req.actor?.email || 'admin',
            },
        });
        
        // Log to audit trail (MySQL)
        logBookDeletion(bookInfo.id, bookInfo, req.actor?.email || 'admin', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        invalidateAnalyticsCache();
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
