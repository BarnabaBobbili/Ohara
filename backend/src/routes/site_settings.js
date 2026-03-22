import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/settings ────────────────────────────────────────
// All settings (public)
router.get('/', async (req, res) => {
    try {
        const settings = await prisma.site_settings.findMany({ orderBy: { category: 'asc' } });
        // Convert to key→value map
        const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
        res.json(map);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/settings/by-category/:category ─────────────────
router.get('/by-category/:category', async (req, res) => {
    try {
        const settings = await prisma.site_settings.findMany({
            where: { category: req.params.category },
        });
        const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
        res.json(map);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/settings/:key — Admin only ─────────────────────
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { value, category } = req.body;
        const setting = await prisma.site_settings.upsert({
            where: { key: req.params.key },
            update: { value: String(value) },
            create: { key: req.params.key, value: String(value), category: category || 'general' },
        });
        res.json(setting);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/settings/bulk — Admin only ─────────────────────
// Body: { settings: [{ key, value, category }] }
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) {
            return res.status(400).json({ detail: 'settings must be an array' });
        }

        const results = await Promise.all(
            settings.map(({ key, value, category }) =>
                prisma.site_settings.upsert({
                    where:  { key },
                    update: { value: String(value) },
                    create: { key, value: String(value), category: category || 'general' },
                })
            )
        );
        res.json({ updated: results.length, settings: results });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
