import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'ebooks');

const ensureUploadsDir = () => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadsDir();
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
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

        const ebook = await prisma.ebooks.create({
            data: {
                title: title || file.originalname,
                author: author || null,
                book_id: book_id ? Number.parseInt(book_id, 10) : null,
                file_path: file.path,
                file_format: path.extname(file.originalname).slice(1).toLowerCase(),
                file_size: file.size,
                is_public: is_public === 'true' || is_public === true,
                uploaded_by: req.staff?.id || null,
            },
        });

        res.status(201).json(ebook);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, author, book_id, is_public } = req.body;
        const ebook = await prisma.ebooks.update({
            where: { id: Number.parseInt(req.params.id, 10) },
            data: {
                title,
                author,
                book_id: book_id ? Number.parseInt(book_id, 10) : null,
                is_public: Boolean(is_public),
            },
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

        if (ebook.file_path && fs.existsSync(ebook.file_path)) {
            fs.unlinkSync(ebook.file_path);
        }

        await prisma.ebooks.delete({
            where: { id: Number.parseInt(req.params.id, 10) },
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
