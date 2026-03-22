import express from 'express';
import { getMySQLPool } from '../db/mysql.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Table name
const TABLE = 'library_news';

// Helper to get pool
const getPool = () => {
    return getMySQLPool();
};

// Track if table is initialized
let tableInitialized = false;

// Ensure table exists
const ensureTable = async () => {
    if (tableInitialized) return;
    
    try {
        const pool = getPool();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${TABLE} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                content TEXT NOT NULL,
                summary VARCHAR(500),
                image_url VARCHAR(1000),
                category VARCHAR(100) DEFAULT 'general',
                author VARCHAR(200),
                is_featured BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(200)
            )
        `);
        tableInitialized = true;
        console.log('✓ MySQL table "library_news" ready');
    } catch (error) {
        console.error('Failed to create library_news table:', error.message);
        throw error;
    }
};

// ─── GET /api/news ──────────────────────────────────────────────
// Get all active news (public)
router.get('/', async (req, res) => {
    try {
        await ensureTable();
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT * FROM ${TABLE} WHERE is_active = TRUE ORDER BY is_featured DESC, published_at DESC LIMIT 20`
        );
        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/news/featured ─────────────────────────────────────
// Get featured news only (public)
router.get('/featured', async (req, res) => {
    try {
        await ensureTable();
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT * FROM ${TABLE} WHERE is_active = TRUE AND is_featured = TRUE ORDER BY published_at DESC LIMIT 6`
        );
        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch featured news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/news/admin/all ────────────────────────────────────
// Get all news including inactive (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT * FROM ${TABLE} ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/news/:id ──────────────────────────────────────────
// Get single news item by ID
router.get('/:id', async (req, res) => {
    try {
        await ensureTable();
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT * FROM ${TABLE} WHERE id = ?`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ detail: 'News not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Failed to fetch news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/news ─────────────────────────────────────────────
// Create new news item (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const { title, content, summary, image_url, category, author, is_featured, is_active, published_at } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ detail: 'Title and content are required' });
        }
        
        const pool = getPool();
        const [result] = await pool.query(
            `INSERT INTO ${TABLE} (title, content, summary, image_url, category, author, is_featured, is_active, published_at, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                content,
                summary || null,
                image_url || null,
                category || 'general',
                author || null,
                is_featured ?? false,
                is_active ?? true,
                published_at ? new Date(published_at) : new Date(),
                req.user?.email || 'admin'
            ]
        );
        
        // Fetch the created record
        const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Failed to create news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/news/:id ──────────────────────────────────────────
// Update news item (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const { title, content, summary, image_url, category, author, is_featured, is_active, published_at } = req.body;
        
        const pool = getPool();
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (content !== undefined) { updates.push('content = ?'); values.push(content); }
        if (summary !== undefined) { updates.push('summary = ?'); values.push(summary); }
        if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category); }
        if (author !== undefined) { updates.push('author = ?'); values.push(author); }
        if (is_featured !== undefined) { updates.push('is_featured = ?'); values.push(is_featured); }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
        if (published_at !== undefined) { updates.push('published_at = ?'); values.push(new Date(published_at)); }
        
        if (updates.length === 0) {
            return res.status(400).json({ detail: 'No fields to update' });
        }
        
        values.push(req.params.id);
        
        const [result] = await pool.query(
            `UPDATE ${TABLE} SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ detail: 'News not found' });
        }
        
        // Fetch updated record
        const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Failed to update news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/news/:id ───────────────────────────────────────
// Delete news item (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const pool = getPool();
        const [result] = await pool.query(
            `DELETE FROM ${TABLE} WHERE id = ?`,
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ detail: 'News not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete news:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

export default router;
