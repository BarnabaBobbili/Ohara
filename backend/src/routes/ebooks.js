import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { syncEbookToNeo4j } from '../db/neo4j.js';
import { uploadEbook, deleteEbook, getSignedUrl, isSupabasePath } from '../utils/storage.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.epub', '.pdf'].includes(ext)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only EPUB and PDF files are allowed'));
    },
});

const normalizeFormat = (filename) => path.extname(filename || '').slice(1).toLowerCase() || 'pdf';
const parseOptionalBookId = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
};
const parseBooleanLike = (value, fallback = false) => {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return fallback;
};

const getLinkedBook = async (rawBookId) => {
    const parsedBookId = parseOptionalBookId(rawBookId);
    if (Number.isNaN(parsedBookId)) {
        return { error: 'Invalid book_id. It must be a valid integer.' };
    }
    if (parsedBookId === null) {
        return { bookId: null, linkedBook: null };
    }

    const linkedBook = await prisma.books.findUnique({
        where: { id: parsedBookId },
        select: {
            id: true,
            title: true,
            author: true,
            cover_image_url: true,
        },
    });
    if (!linkedBook) {
        return { error: 'Linked book not found' };
    }

    return { bookId: parsedBookId, linkedBook };
};

const streamLegacyFile = (res, ebook) => {
    if (!ebook.file_path || !fs.existsSync(ebook.file_path)) {
        res.status(404).json({ detail: 'File not found on disk' });
        return;
    }
    const mime = ebook.file_format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${ebook.title}.${ebook.file_format}"`);
    fs.createReadStream(ebook.file_path).pipe(res);
};

const removeStoredEbook = async (ebook) => {
    if (!ebook?.file_path) return;
    if (isSupabasePath(ebook.file_path)) {
        await deleteEbook(ebook.file_path);
        return;
    }
    if (fs.existsSync(ebook.file_path)) {
        fs.unlinkSync(ebook.file_path);
    }
};

// ─── Member-Facing Public Ebook Routes ───────────────────────

// GET /api/ebooks/public — list all public ebooks (members)
router.get('/public', authenticateToken, async (req, res) => {
    try {
        const ebooks = await prisma.ebooks.findMany({
            where: { is_public: true },
            orderBy: { uploaded_at: 'desc' },
            include: {
                books: {
                    select: { id: true, title: true, author: true, isbn: true, cover_image_url: true },
                },
            },
        });
        res.json(ebooks);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/ebooks/public/:id/read — stream an ebook file to the member
router.get('/public/:id/read', authenticateToken, async (req, res) => {
    try {
        const ebook = await prisma.ebooks.findFirst({
            where: { id: Number.parseInt(req.params.id, 10), is_public: true },
        });
        if (!ebook) {
            return res.status(404).json({ detail: 'Ebook not found or not public' });
        }

        if (isSupabasePath(ebook.file_path)) {
            const signedUrl = await getSignedUrl(ebook.file_path);
            return res.redirect(signedUrl);
        }

        streamLegacyFile(res, ebook);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/ebooks/public/:id/read-url — return JSON {url, format, title, author}
// Used by the frontend reader to get the actual file URL without following a redirect.
router.get('/public/:id/read-url', authenticateToken, async (req, res) => {
    try {
        const ebook = await prisma.ebooks.findFirst({
            where: { id: Number.parseInt(req.params.id, 10), is_public: true },
        });
        if (!ebook) {
            return res.status(404).json({ detail: 'Ebook not found or not public' });
        }

        let url;
        if (isSupabasePath(ebook.file_path)) {
            url = await getSignedUrl(ebook.file_path, 60 * 60 * 2); // 2-hour URL
        } else {
            // Legacy local: point to the stream endpoint (handled by that route)
            url = `/api/ebooks/public/${ebook.id}/read`;
        }

        res.json({
            url,
            format: ebook.file_format,
            title:  ebook.title,
            author: ebook.author,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});


router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const ebooks = await prisma.ebooks.findMany({
            orderBy: { uploaded_at: 'desc' },
            include: {
                books: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        isbn: true,
                        cover_image_url: true,
                    },
                },
            },
        });
        res.json(ebooks);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { title, author, book_id, is_public } = req.body;

        if (!file) {
            return res.status(400).json({ detail: 'No file uploaded' });
        }

        const linked = await getLinkedBook(book_id);
        if (linked.error) {
            return res.status(400).json({ detail: linked.error });
        }

        const cleanTitle = String(title || '').trim();
        const cleanAuthor = String(author || '').trim();
        const inferredTitle = path.parse(file.originalname).name;

        const storagePath = await uploadEbook(file.buffer, file.originalname, 'admin');
        let ebook;
        try {
            ebook = await prisma.ebooks.create({
                data: {
                    title: cleanTitle || linked.linkedBook?.title || inferredTitle,
                    author: cleanAuthor || linked.linkedBook?.author || null,
                    book_id: linked.bookId,
                    file_path: storagePath,
                    file_format: normalizeFormat(file.originalname),
                    file_size_bytes: BigInt(file.size),
                    cover_path: linked.linkedBook?.cover_image_url || null,
                    is_public: parseBooleanLike(is_public, false),
                    uploaded_by: null, // ebooks.uploaded_by references staff.id; actor is a member record
                },
            });
        } catch (dbError) {
            await deleteEbook(storagePath);
            throw dbError;
        }

        const ebookResponse = {
            ...ebook,
            file_size_bytes: ebook.file_size_bytes != null ? Number(ebook.file_size_bytes) : null,
        };

        res.status(201).json(ebookResponse);

        // Sync to Neo4j (non-blocking)
        syncEbookToNeo4j({
            id: ebook.id,
            title: ebook.title,
            author: ebook.author,
            is_public: ebook.is_public,
            file_format: ebook.file_format,
            uploaded_by_type: 'admin',
            book_id: ebook.book_id || null,
        }).catch(() => {});
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, author, book_id, is_public } = req.body;
        const linked = await getLinkedBook(book_id);
        if (linked.error) {
            return res.status(400).json({ detail: linked.error });
        }

        const cleanTitle = title === undefined ? undefined : String(title || '').trim();
        const cleanAuthor = author === undefined ? undefined : String(author || '').trim();

        const updateData = {};
        if (title !== undefined) {
            const resolvedTitle = cleanTitle || linked.linkedBook?.title;
            if (resolvedTitle) updateData.title = resolvedTitle;
        }
        if (author !== undefined) {
            updateData.author = cleanAuthor || linked.linkedBook?.author || null;
        }
        if (is_public !== undefined) {
            updateData.is_public = parseBooleanLike(is_public, false);
        }
        if (book_id !== undefined) {
            updateData.book_id = linked.bookId;
            updateData.cover_path = linked.linkedBook?.cover_image_url || null;
            if (title === undefined && linked.linkedBook?.title) {
                updateData.title = linked.linkedBook.title;
            }
            if (author === undefined && linked.linkedBook) {
                updateData.author = linked.linkedBook.author || null;
            }
        }

        const ebook = await prisma.ebooks.update({
            where: { id: Number.parseInt(req.params.id, 10) },
            data: updateData,
        });
        res.json(ebook);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const ebook = await prisma.ebooks.findUnique({
            where: { id: Number.parseInt(req.params.id, 10) },
        });

        if (!ebook) {
            return res.status(404).json({ detail: 'Ebook not found' });
        }

        await removeStoredEbook(ebook);

        await prisma.ebooks.delete({
            where: { id: Number.parseInt(req.params.id, 10) },
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
