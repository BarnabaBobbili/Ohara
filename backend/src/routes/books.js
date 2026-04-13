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

const parsePositiveInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
};

const clampInteger = (value, min, max) => Math.min(Math.max(value, min), max);

const isMissingBookRatingsTableError = (error) => {
    if (!error) return false;
    if (error.code === 'P2021') return true;
    const message = String(error.message || '').toLowerCase();
    return message.includes('book_ratings') && (
        message.includes('does not exist') ||
        message.includes('not exist') ||
        message.includes('table')
    );
};

const attachRatingMetadata = async (items) => {
    const books = Array.isArray(items) ? items : [items].filter(Boolean);
    if (books.length === 0) return Array.isArray(items) ? [] : null;

    const bookIds = [...new Set(
        books
            .map((book) => Number.parseInt(book?.id, 10))
            .filter((bookId) => Number.isInteger(bookId))
    )];

    if (bookIds.length === 0) {
        const fallback = books.map((book) => ({ ...book, avg_rating: 0, rating_count: 0 }));
        return Array.isArray(items) ? fallback : fallback[0];
    }

    let aggregates = [];
    try {
        aggregates = await prisma.book_ratings.groupBy({
            by: ['book_id'],
            where: { book_id: { in: bookIds } },
            _avg: { rating: true },
            _count: { rating: true },
        });
    } catch (error) {
        if (!isMissingBookRatingsTableError(error)) {
            throw error;
        }
        aggregates = [];
    }

    const ratingMap = new Map(
        aggregates.map((entry) => [
            entry.book_id,
            {
                avg_rating: Number(entry._avg.rating || 0),
                rating_count: entry._count.rating || 0,
            },
        ])
    );

    const enriched = books.map((book) => {
        const metadata = ratingMap.get(book.id) || { avg_rating: 0, rating_count: 0 };
        return {
            ...book,
            avg_rating: metadata.avg_rating,
            rating_count: metadata.rating_count,
        };
    });

    return Array.isArray(items) ? enriched : enriched[0];
};

router.get('/', async (req, res) => {
    try {
        const {
            category,
            search,
            genre,
            language,
            is_active,
            availability,
            sort_by,
            sort_order,
            page,
            paginate,
            new_only,
        } = req.query;

        const shouldPaginate = paginate === 'true' || page !== undefined;
        const requestedLimit = parsePositiveInteger(req.query?.limit);
        const limit = clampInteger(
            requestedLimit ?? (shouldPaginate ? 50 : 20),
            1,
            2000   // raised to 2000 so admin pickers can load full catalogue
        );
        const requestedPage = parsePositiveInteger(page);
        const currentPage = clampInteger(requestedPage ?? 1, 1, 100000);
        const skip = shouldPaginate
            ? (currentPage - 1) * limit
            : parseSkipLimitPagination(req.query, {
                defaultLimit: 20,
                maxLimit: 2000,
                maxSkip: 5000,
            }).skip;

        const where = {};
        const andClauses = [];
        
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

        if (availability === 'available') {
            where.available_copies = { gt: 0 };
        } else if (availability === 'checked_out') {
            where.available_copies = { lte: 0 };
        }

        if (search) {
            andClauses.push({
                OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { author: { contains: search, mode: 'insensitive' } },
                { isbn: { contains: search, mode: 'insensitive' } },
                ],
            });
        }

        if (new_only === 'true') {
            const recentAddedDate = new Date();
            recentAddedDate.setDate(recentAddedDate.getDate() - 120);
            const recentPublicationYear = new Date().getFullYear() - 1;

            andClauses.push({
                OR: [
                    { created_at: { gte: recentAddedDate } },
                    { publication_year: { gte: recentPublicationYear } },
                ],
            });
        }

        if (andClauses.length > 0) {
            where.AND = andClauses;
        }

        const sortFieldMap = {
            title: 'title',
            author: 'author',
            year: 'publication_year',
            publication_year: 'publication_year',
            popular: 'popular',
            created_at: 'created_at',
            updated_at: 'updated_at',
        };
        const resolvedSortField = sortFieldMap[String(sort_by || '').toLowerCase()] || 'updated_at';
        const resolvedSortOrder = ['asc', 'desc'].includes(String(sort_order || '').toLowerCase())
            ? String(sort_order).toLowerCase()
            : (resolvedSortField === 'title' || resolvedSortField === 'author' ? 'asc' : 'desc');

        const orderBy = resolvedSortField === 'popular'
            ? [
                { transactions: { _count: 'desc' } },
                { updated_at: 'desc' },
                { id: 'asc' },
            ]
            : { [resolvedSortField]: resolvedSortOrder };

        if (shouldPaginate) {
            const [total, books] = await Promise.all([
                prisma.books.count({ where }),
                prisma.books.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                }),
            ]);

            const items = await attachRatingMetadata(books);
            const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

            return res.json({
                items,
                pagination: {
                    page: currentPage,
                    limit,
                    total,
                    total_pages: totalPages,
                    has_next: totalPages > 0 && currentPage < totalPages,
                    has_prev: currentPage > 1,
                },
            });
        }

        const books = await prisma.books.findMany({
            where,
            skip,
            take: limit,
            orderBy,
        });

        return res.json(await attachRatingMetadata(books));
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

        res.json(await attachRatingMetadata(book));
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/meta/categories', async (req, res) => {
    try {
        const rows = await prisma.books.findMany({
            where: {
                is_active: true,
                category: { not: null },
            },
            distinct: ['category'],
            select: { category: true },
            orderBy: { category: 'asc' },
        });

        const categories = rows
            .map((row) => row.category)
            .filter((category) => Boolean(category));

        res.json(categories);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await prisma.books.findUnique({
            where: { id: Number.parseInt(req.params.id, 10) },
            include: {
                ebooks: {
                    where: { is_public: true },
                    orderBy: { uploaded_at: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        file_format: true,
                        cover_path: true,
                    },
                },
            },
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        const { ebooks, ...bookData } = book;
        res.json(await attachRatingMetadata({
            ...bookData,
            public_ebook: Array.isArray(ebooks) && ebooks.length > 0 ? ebooks[0] : null,
        }));
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
