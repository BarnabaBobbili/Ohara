import express from 'express';
import { getMongoDatabase } from '../db/mongodb.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Collection name
const COLLECTION = 'announcements';

// Helper to get collection
const getCollection = () => {
    const db = getMongoDatabase();
    if (!db) throw new Error('MongoDB not connected');
    return db.collection(COLLECTION);
};

// ─── GET /api/announcements ─────────────────────────────────────
// Get all active announcements (public)
router.get('/', async (req, res) => {
    try {
        const collection = getCollection();
        const announcements = await collection
            .find({ is_active: true })
            .sort({ priority: -1, created_at: -1 })
            .toArray();
        res.json(announcements);
    } catch (error) {
        console.error('Failed to fetch announcements:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/announcements/admin/all ───────────────────────────
// Get all announcements including inactive (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const collection = getCollection();
        const announcements = await collection
            .find({})
            .sort({ created_at: -1 })
            .toArray();
        res.json(announcements);
    } catch (error) {
        console.error('Failed to fetch announcements:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/announcements/:id ─────────────────────────────────
// Get single announcement by ID
router.get('/:id', async (req, res) => {
    try {
        const collection = getCollection();
        const announcement = await collection.findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!announcement) {
            return res.status(404).json({ detail: 'Announcement not found' });
        }
        res.json(announcement);
    } catch (error) {
        console.error('Failed to fetch announcement:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── POST /api/announcements ────────────────────────────────────
// Create new announcement (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, message, type, priority, is_active, start_date, end_date } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ detail: 'Title and message are required' });
        }
        
        const collection = getCollection();
        const announcement = {
            title,
            message,
            type: type || 'info', // info, warning, success, error
            priority: priority || 0,
            is_active: is_active ?? true,
            start_date: start_date ? new Date(start_date) : null,
            end_date: end_date ? new Date(end_date) : null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: req.user?.email || 'admin',
        };
        
        const result = await collection.insertOne(announcement);
        res.status(201).json({ ...announcement, _id: result.insertedId });
    } catch (error) {
        console.error('Failed to create announcement:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── PUT /api/announcements/:id ─────────────────────────────────
// Update announcement (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, message, type, priority, is_active, start_date, end_date } = req.body;
        
        const collection = getCollection();
        const updateData = {
            updated_at: new Date(),
        };
        
        if (title !== undefined) updateData.title = title;
        if (message !== undefined) updateData.message = message;
        if (type !== undefined) updateData.type = type;
        if (priority !== undefined) updateData.priority = priority;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
        if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
        
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );
        
        if (!result) {
            return res.status(404).json({ detail: 'Announcement not found' });
        }
        
        res.json(result);
    } catch (error) {
        console.error('Failed to update announcement:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

// ─── DELETE /api/announcements/:id ──────────────────────────────
// Delete announcement (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const collection = getCollection();
        const result = await collection.deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Announcement not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete announcement:', error.message);
        res.status(500).json({ detail: error.message });
    }
});

export default router;
