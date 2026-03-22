import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/staff-board — Staff only ───────────────────────
router.get('/', authenticateToken, requireStaff, async (req, res) => {
    try {
        const posts = await prisma.staff_board_posts.findMany({
            orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
            where: {
                OR: [
                    { expires_at: null },
                    { expires_at: { gt: new Date() } },
                ],
            },
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/staff-board — Admin only ──────────────────────
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, category, is_pinned, expires_at } = req.body;
        const post = await prisma.staff_board_posts.create({
            data: {
                title,
                content,
                category:  category  || 'announcement',
                is_pinned: is_pinned ?? false,
                posted_by: req.actor?.id || null,
                expires_at: expires_at ? new Date(expires_at) : null,
            },
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/staff-board/:id — Admin only ───────────────────
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, category, is_pinned, expires_at } = req.body;
        const post = await prisma.staff_board_posts.update({
            where: { id: parseInt(req.params.id) },
            data:  { title, content, category, is_pinned, expires_at: expires_at ? new Date(expires_at) : null },
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/staff-board/:id — Admin only ────────────────
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await prisma.staff_board_posts.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
