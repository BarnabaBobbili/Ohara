import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.epub', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only EPUB and PDF files are allowed'));
        }
    }
});

// POST /api/user-library/upload - Upload a book
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const memberId = req.user.user_id;
        const { title, author } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ detail: 'No file uploaded' });
        }

        const book = await prisma.user_uploaded_books.create({
            data: {
                member_id: memberId,
                title: title || file.originalname,
                author: author || 'Unknown',
                file_path: file.path,
                file_format: path.extname(file.originalname).replace('.', ''),
                file_size: file.size,
            }
        });

        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/:memberId - Get user's uploaded books
router.get('/:memberId', async (req, res) => {
    try {
        const books = await prisma.user_uploaded_books.findMany({
            where: { member_id: parseInt(req.params.memberId) },
            orderBy: { uploaded_at: 'desc' }
        });

        res.json(books);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/:memberId/:bookId - Get specific uploaded book
router.get('/:memberId/:bookId', async (req, res) => {
    try {
        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: parseInt(req.params.bookId),
                member_id: parseInt(req.params.memberId),
            }
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        res.json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/:memberId/:bookId/read - Stream book file
router.get('/:memberId/:bookId/read', async (req, res) => {
    try {
        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: parseInt(req.params.bookId),
                member_id: parseInt(req.params.memberId),
            }
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        if (!fs.existsSync(book.file_path)) {
            return res.status(404).json({ detail: 'File not found on disk' });
        }

        const mimeType = book.file_format === 'pdf'
            ? 'application/pdf'
            : 'application/epub+zip';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${book.title}.${book.file_format}"`);
        fs.createReadStream(book.file_path).pipe(res);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/user-library/:memberId/:bookId - Delete uploaded book
router.delete('/:memberId/:bookId', authenticateToken, async (req, res) => {
    try {
        const book = await prisma.user_uploaded_books.findFirst({
            where: {
                id: parseInt(req.params.bookId),
                member_id: parseInt(req.params.memberId),
            }
        });

        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        // Delete file from disk
        if (fs.existsSync(book.file_path)) {
            fs.unlinkSync(book.file_path);
        }

        // Delete from database
        await prisma.user_uploaded_books.delete({ where: { id: book.id } });

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/user-library/progress/:bookType/:bookId - Get reading progress
router.get('/progress/:bookType/:bookId', authenticateToken, async (req, res) => {
    try {
        const progress = await prisma.reading_progress.findFirst({
            where: {
                member_id: req.user.user_id,
                book_type: req.params.bookType,
                book_id: req.params.bookId,
            }
        });

        res.json(progress || { progress_percent: 0, current_location: null });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// PUT /api/user-library/progress/:bookType/:bookId - Update reading progress
router.put('/progress/:bookType/:bookId', authenticateToken, async (req, res) => {
    try {
        const { current_location, progress_percent } = req.body;
        const memberId = req.user.user_id;
        const { bookType, bookId } = req.params;

        // Upsert reading progress
        const existing = await prisma.reading_progress.findFirst({
            where: { member_id: memberId, book_type: bookType, book_id: bookId }
        });

        let progress;
        if (existing) {
            progress = await prisma.reading_progress.update({
                where: { id: existing.id },
                data: {
                    current_location,
                    progress_percent: progress_percent || 0,
                    last_read_at: new Date(),
                }
            });
        } else {
            progress = await prisma.reading_progress.create({
                data: {
                    member_id: memberId,
                    book_type: bookType,
                    book_id: bookId,
                    current_location,
                    progress_percent: progress_percent || 0,
                }
            });
        }

        res.json(progress);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
