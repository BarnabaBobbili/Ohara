import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const mapCollection = (collection) => ({
    id:            collection.id,
    name:          collection.name,
    description:   collection.description,
    cover_image:   collection.cover_image,
    display_order: collection.display_order,
    is_active:     collection.is_active,
    is_pinned:     collection.is_pinned,
    books:         collection.collection_books.map(cb => cb.books),
});

// ─── GET /api/collections ─────────────────────────────────────
// All active collections (public)
router.get('/', async (req, res) => {
    try {
        const collections = await prisma.collections.findMany({
            where: { is_active: true },
            orderBy: { display_order: 'asc' },
            include: {
                collection_books: {
                    orderBy: { display_order: 'asc' },
                    include: {
                        books: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                cover_image_url: true,
                                category: true,
                                available_copies: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(collections.map(mapCollection));
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/collections/pinned ──────────────────────────────
// Returns up to 3 pinned collections for the landing page
router.get('/pinned', async (req, res) => {
    try {
        const collections = await prisma.collections.findMany({
            where: { is_active: true, is_pinned: true },
            orderBy: { display_order: 'asc' },
            take: 3,
            include: {
                collection_books: {
                    orderBy: { display_order: 'asc' },
                    include: {
                        books: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                cover_image_url: true,
                                category: true,
                                available_copies: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(collections.map(mapCollection));
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});


// ─── GET /api/collections/admin/all — Admin only ─────────────
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const collections = await prisma.collections.findMany({
            orderBy: { display_order: 'asc' },
            include: {
                collection_books: {
                    orderBy: { display_order: 'asc' },
                    include: {
                        books: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                cover_image_url: true,
                                category: true,
                                available_copies: true,
                            },
                        },
                    },
                },
            },
        });

        res.json(collections.map(mapCollection));
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/collections/:id ─────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const collection = await prisma.collections.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                collection_books: {
                    orderBy: { display_order: 'asc' },
                    include: { books: true },
                },
            },
        });
        if (!collection) return res.status(404).json({ detail: 'Collection not found' });
        res.json({
            ...mapCollection(collection),
            created_at: collection.created_at,
            updated_at: collection.updated_at,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/collections — Admin only ───────────────────────
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, description, cover_image, display_order, is_active } = req.body;
        
        // Generate slug from name
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        const collection = await prisma.collections.create({
            data: { 
                name, 
                slug,
                description, 
                cover_image, 
                display_order: display_order || 0, 
                is_active: is_active ?? true 
            },
        });
        res.status(201).json(collection);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/collections/:id — Admin only ────────────────────
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, description, cover_image, display_order, is_active, is_pinned } = req.body;
        
        // Generate slug if name is being updated
        const updateData = { description, cover_image, display_order, is_active, is_pinned };
        if (name) {
            updateData.name = name;
            updateData.slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        const collection = await prisma.collections.update({
            where: { id: parseInt(req.params.id) },
            data:  updateData,
        });
        res.json(collection);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── PATCH /api/collections/:id/pin — Admin only ─────────────
// Toggle landing-page pinning
router.patch('/:id/pin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { is_pinned } = req.body;
        const collection = await prisma.collections.update({
            where: { id: parseInt(req.params.id) },
            data:  { is_pinned: Boolean(is_pinned) },
        });
        res.json(collection);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/collections/:id — Admin only ─────────────────
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await prisma.collections.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/collections/:id/books — Admin only ────────────
router.post('/:id/books', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { book_id, display_order } = req.body;
        const collectionId = Number.parseInt(req.params.id, 10);
        const bookId = Number.parseInt(String(book_id), 10);
        const parsedDisplayOrder = Number.parseInt(String(display_order ?? 0), 10) || 0;

        if (!Number.isInteger(collectionId)) {
            return res.status(400).json({ detail: 'Valid collection id is required' });
        }

        if (!Number.isInteger(bookId)) {
            return res.status(400).json({ detail: 'Valid book_id is required' });
        }

        const entry = await prisma.collection_books.create({
            data: {
                collection_id: collectionId,
                book_id:       bookId,
                display_order: parsedDisplayOrder,
            },
        });
        res.status(201).json(entry);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ detail: 'Book already in this collection' });
        }
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/collections/:id/books/:bookId — Admin only ──
router.delete('/:id/books/:bookId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await prisma.collection_books.deleteMany({
            where: {
                collection_id: parseInt(req.params.id),
                book_id:       parseInt(req.params.bookId),
            },
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
