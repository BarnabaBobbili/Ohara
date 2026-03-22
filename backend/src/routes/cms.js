import express from 'express';
import { getMongoDatabase } from '../db/mongodb.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/cms/pages/:page ─────────────────────────────────
// Returns all active sections for a page (e.g. "home")
router.get('/pages/:page', async (req, res) => {
    try {
        const db = getMongoDatabase();
        if (!db) return res.status(503).json({ detail: 'CMS unavailable' });

        const sections = await db.collection('cms_pages')
            .find({ page: req.params.page, is_active: true })
            .sort({ section: 1 })
            .toArray();

        // Convert array to { section: content } map for easy frontend use
        const pageData = {};
        for (const s of sections) {
            pageData[s.section] = s.content;
        }

        res.json(pageData);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/cms/pages/:page/:section ────────────────────────
// Returns one section
router.get('/pages/:page/:section', async (req, res) => {
    try {
        const db = getMongoDatabase();
        if (!db) return res.status(503).json({ detail: 'CMS unavailable' });

        const doc = await db.collection('cms_pages').findOne({
            page: req.params.page,
            section: req.params.section,
        });

        if (!doc) return res.status(404).json({ detail: 'Section not found' });
        res.json(doc.content);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/cms/pages/:page/:section — Admin only ───────────
// Update a section's content
router.put('/pages/:page/:section',
    authenticateToken, requireAdmin,
    async (req, res) => {
        try {
            const db = getMongoDatabase();
            if (!db) return res.status(503).json({ detail: 'CMS unavailable' });

            const result = await db.collection('cms_pages').findOneAndUpdate(
                { page: req.params.page, section: req.params.section },
                {
                    $set: {
                        content:    req.body,
                        updated_at: new Date(),
                        updated_by: req.actor?.email || req.user_email || 'admin',
                    },
                    $setOnInsert: {
                        page:      req.params.page,
                        section:   req.params.section,
                        is_active: true,
                    },
                },
                { upsert: true, returnDocument: 'after' }
            );

            res.json({ success: true, content: result?.content ?? req.body });
        } catch (error) {
            res.status(500).json({ detail: error.message });
        }
    }
);

// ─── POST /api/cms/pages/:page/:section/reset — Admin only ────
// Reset to default (delete from mongo; next GET will fallback to defaults)
router.post('/pages/:page/:section/reset',
    authenticateToken, requireAdmin,
    async (req, res) => {
        try {
            const db = getMongoDatabase();
            if (!db) return res.status(503).json({ detail: 'CMS unavailable' });

            await db.collection('cms_pages').deleteOne({
                page: req.params.page,
                section: req.params.section,
            });
            res.json({ success: true, message: 'Section reset to default' });
        } catch (error) {
            res.status(500).json({ detail: error.message });
        }
    }
);

export default router;
