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

// ─── GET /api/settings/full — Admin only (metadata + CRUD view) ───────
router.get('/full', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const settings = await prisma.site_settings.findMany({
            orderBy: [{ category: 'asc' }, { key: 'asc' }],
        });
        res.json(settings);
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
        const { value, category, description } = req.body;
        const updateData = {
            value: String(value),
            updated_by: req.actor?.id || null,
        };

        if (category !== undefined) {
            updateData.category = String(category);
        }
        if (description !== undefined) {
            updateData.description = description == null ? null : String(description);
        }

        const setting = await prisma.site_settings.upsert({
            where: { key: req.params.key },
            update: updateData,
            create: {
                key: req.params.key,
                value: String(value),
                category: category ? String(category) : 'general',
                description: description == null ? null : String(description),
                updated_by: req.actor?.id || null,
            },
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
            settings.map(({ key, value, category, description }) =>
                prisma.site_settings.upsert({
                    where:  { key },
                    update: {
                        value: String(value),
                        ...(category !== undefined ? { category: String(category) } : {}),
                        ...(description !== undefined ? { description: description == null ? null : String(description) } : {}),
                        updated_by: req.actor?.id || null,
                    },
                    create: {
                        key,
                        value: String(value),
                        category: category ? String(category) : 'general',
                        description: description == null ? null : String(description),
                        updated_by: req.actor?.id || null,
                    },
                })
            )
        );
        res.json({ updated: results.length, settings: results });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/settings/:key — Admin only ─────────────────────
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const existing = await prisma.site_settings.findUnique({ where: { key: req.params.key } });
        if (!existing) {
            return res.status(404).json({ detail: 'Setting not found' });
        }

        await prisma.site_settings.delete({ where: { key: req.params.key } });
        return res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

export default router;
