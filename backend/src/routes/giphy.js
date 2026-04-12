import express from 'express';
import axios from 'axios';
import { authenticateToken, requireMember } from '../middleware/auth.js';

const router = express.Router();
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

const mapGif = (gif) => {
    const original = gif?.images?.original || {};
    const preview = gif?.images?.fixed_width_small || gif?.images?.fixed_width || {};

    return {
        gif_id: gif?.id || '',
        title: gif?.title || '',
        url: original.url || preview.url || '',
        width: Number.parseInt(original.width || preview.width || '0', 10) || 0,
        height: Number.parseInt(original.height || preview.height || '0', 10) || 0,
        preview_url: preview.url || original.url || '',
    };
};

const fetchGiphy = async (endpoint, params = {}) => {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
        throw new Error('GIPHY_API_KEY is not configured');
    }

    const response = await axios.get(`${GIPHY_BASE_URL}/${endpoint}`, {
        params: {
            api_key: apiKey,
            rating: 'pg-13',
            ...params,
        },
        timeout: 10000,
    });

    return Array.isArray(response.data?.data) ? response.data.data.map(mapGif) : [];
};

router.use(authenticateToken);
router.use(requireMember);

router.get('/search', async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 25);
        if (!q) {
            return res.status(400).json({ detail: 'Search query is required' });
        }

        const gifs = await fetchGiphy('search', { q, limit });
        return res.json({ gifs });
    } catch (error) {
        return res.status(error.message.includes('GIPHY_API_KEY') ? 503 : 500).json({ detail: error.message });
    }
});

router.get('/trending', async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 25);
        const gifs = await fetchGiphy('trending', { limit });
        return res.json({ gifs });
    } catch (error) {
        return res.status(error.message.includes('GIPHY_API_KEY') ? 503 : 500).json({ detail: error.message });
    }
});

export default router;
