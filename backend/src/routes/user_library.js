import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db/prisma.js';
import { authenticateToken, resolveMember } from '../middleware/auth.js';
import { syncEbookToNeo4j } from '../db/neo4j.js';
import { uploadEbook, deleteEbook, getSignedUrl, isSupabasePath } from '../utils/storage.js';

const router = express.Router();
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.epub', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only EPUB and PDF files are allowed'));
    },
});

const parseIntegerParam = (value) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) ? parsed : null;
};

const normalizeFormat = (filename) => path.extname(filename || '').replace('.', '').toLowerCase() || 'pdf';

const toBookResponse = (book) => ({
    ...book,
    file_size_bytes: book.file_size_bytes != null ? Number(book.file_size_bytes) : null,
});

const streamLegacyFile = (res, book) => {
    if (!book.file_path || !fs.existsSync(book.file_path)) {
        res.status(404).json({ detail: 'File not found on disk' });
        return;
    }

    const mimeType = book.file_format === 'pdf'
        ? 'application/pdf'
        : 'application/epub+zip';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${book.title}.${book.file_format}"`);
    fs.createReadStream(book.file_path).pipe(res);
};

const deleteStoredFile = async (book) => {
    if (!book?.file_path) return;
    if (isSupabasePath(book.file_path)) {
        await deleteEbook(book.file_path);
        return;
    }
    if (fs.existsSync(book.file_path)) {
        fs.unlinkSync(book.file_path);
    }
};

const resolveAuthenticatedMember = async (req, res) => {
    const member = await resolveMember(req);
    if (!member) {
        res.status(403).json({ detail: 'Member account not found. Please link your account.' });
        return null;
    }
    return member;
};

const loadOwnBook = async (memberId, rawBookId) => {
    const bookId = parseIntegerParam(rawBookId);
    if (!bookId) return { error: { status: 400, detail: 'Valid book id is required' } };
    const book = await prisma.user_uploaded_books.findFirst({
        where: { id: bookId, member_id: memberId },
    });
    if (!book) return { error: { status: 404, detail: 'Book not found' } };
    return { book };
};

// POST /api/user-library/upload - Upload a member's ebook to Supabase Storage
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const { title, author } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ detail: 'No file uploaded' });
        }

        const storagePath = await uploadEbook(file.buffer, file.originalname, `members/${member.id}`);
        const fileFormat = normalizeFormat(file.originalname);

        try {
            const book = await prisma.user_uploaded_books.create({
                data: {
                    member_id: member.id,
                    title: title || file.originalname,
                    author: author || 'Unknown',
                    file_path: storagePath,
                    file_format: fileFormat,
                    file_size_bytes: BigInt(file.size),
                },
            });

            syncEbookToNeo4j({
                id: book.id,
                title: book.title,
                author: book.author || '',
                is_public: false,
                file_format: book.file_format || '',
                uploaded_by_type: 'member',
                book_id: null,
            }).catch(() => {});

            return res.status(201).json(toBookResponse(book));
        } catch (dbError) {
            await deleteEbook(storagePath);
            throw dbError;
        }
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/my — current authenticated member's uploads
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const books = await prisma.user_uploaded_books.findMany({
            where: { member_id: member.id },
            orderBy: { uploaded_at: 'desc' },
        });
        res.json(books.map(toBookResponse));
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/user-library/my/:bookId — delete own uploaded book
router.delete('/my/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const loaded = await loadOwnBook(member.id, req.params.bookId);
        if (loaded.error) {
            return res.status(loaded.error.status).json({ detail: loaded.error.detail });
        }
        const { book } = loaded;

        await deleteStoredFile(book);
        await prisma.user_uploaded_books.delete({ where: { id: book.id } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/my/:bookId/read — open own file
router.get('/my/:bookId/read', authenticateToken, async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const loaded = await loadOwnBook(member.id, req.params.bookId);
        if (loaded.error) {
            return res.status(loaded.error.status).json({ detail: loaded.error.detail });
        }
        const { book } = loaded;

        if (isSupabasePath(book.file_path)) {
            const signedUrl = await getSignedUrl(book.file_path);
            return res.redirect(signedUrl);
        }

        streamLegacyFile(res, book);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/progress/:bookType/:bookId - Get reading progress
router.get('/progress/:bookType/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const progress = await prisma.reading_progress.findUnique({
            where: {
                member_id_book_type_book_id: {
                    member_id: member.id,
                    book_type: req.params.bookType,
                    book_id: req.params.bookId,
                },
            },
        });

        res.json(progress || { progress_percent: 0, current_location: null });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/user-library/progress/:bookType/:bookId - Update reading progress
router.put('/progress/:bookType/:bookId', authenticateToken, async (req, res) => {
    try {
        const member = await resolveAuthenticatedMember(req, res);
        if (!member) return;

        const { current_location, progress_percent } = req.body;
        const { bookType, bookId } = req.params;
        const parsedProgress = Number(progress_percent);
        const clampedProgress = Number.isFinite(parsedProgress)
            ? Math.min(Math.max(parsedProgress, 0), 100)
            : 0;

        const progress = await prisma.reading_progress.upsert({
            where: {
                member_id_book_type_book_id: {
                    member_id: member.id,
                    book_type: bookType,
                    book_id: bookId,
                },
            },
            create: {
                member_id: member.id,
                book_type: bookType,
                book_id: bookId,
                current_location: typeof current_location === 'string' ? current_location : null,
                progress_percent: clampedProgress,
                last_read_at: new Date(),
            },
            update: {
                current_location: typeof current_location === 'string' ? current_location : null,
                progress_percent: clampedProgress,
                last_read_at: new Date(),
            },
        });

        res.json(progress);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Legacy routes retained for compatibility
// GET /api/user-library/:memberId - Get user's uploaded books
router.get('/:memberId', async (req, res) => {
    try {
        const memberId = parseIntegerParam(req.params.memberId);
        if (!memberId) {
            return res.status(400).json({ detail: 'Valid member id is required' });
        }

        const books = await prisma.user_uploaded_books.findMany({
            where: { member_id: memberId },
            orderBy: { uploaded_at: 'desc' },
        });
        return res.json(books.map(toBookResponse));
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/:memberId/:bookId - Get specific uploaded book
router.get('/:memberId/:bookId', async (req, res) => {
    try {
        const memberId = parseIntegerParam(req.params.memberId);
        const bookId = parseIntegerParam(req.params.bookId);
        if (!memberId || !bookId) {
            return res.status(400).json({ detail: 'Valid member id and book id are required' });
        }

        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: bookId,
                member_id: memberId,
            },
        });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }
        return res.json(toBookResponse(book));
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/:memberId/:bookId/read - Open uploaded book
router.get('/:memberId/:bookId/read', async (req, res) => {
    try {
        const memberId = parseIntegerParam(req.params.memberId);
        const bookId = parseIntegerParam(req.params.bookId);
        if (!memberId || !bookId) {
            return res.status(400).json({ detail: 'Valid member id and book id are required' });
        }

        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: bookId,
                member_id: memberId,
            },
        });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        if (isSupabasePath(book.file_path)) {
            const signedUrl = await getSignedUrl(book.file_path);
            return res.redirect(signedUrl);
        }

        streamLegacyFile(res, book);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/user-library/:memberId/:bookId - Delete uploaded book
router.delete('/:memberId/:bookId', authenticateToken, async (req, res) => {
    try {
        const memberId = parseIntegerParam(req.params.memberId);
        const bookId = parseIntegerParam(req.params.bookId);
        if (!memberId || !bookId) {
            return res.status(400).json({ detail: 'Valid member id and book id are required' });
        }

        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: bookId,
                member_id: memberId,
            },
        });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        await deleteStoredFile(book);
        await prisma.user_uploaded_books.delete({ where: { id: book.id } });
        return res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

export default router;
