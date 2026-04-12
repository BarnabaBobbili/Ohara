import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';
import { syncMemberToNeo4j } from '../db/neo4j.js';

const router = express.Router();

// POST /api/auth/signup - Register new member
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, member_type = 'public', phone, address } = req.body;

        // Check if email already exists
        const existing = await prisma.members.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ detail: 'Email already exists' });
        }

        // Generate card_id
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const card_id = `LIB${timestamp}${random}`;

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const member = await prisma.members.create({
            data: {
                card_id, name, email, phone, address,
                member_type, password_hash,
                status: 'active', fines: 0.0,
            }
        });

        invalidateCacheByPrefix('dashboard:', 'reports:');

        // Sync new member to Neo4j for recommendations (non-blocking)
        syncMemberToNeo4j(member).catch(() => {});

        // Create JWT
        const token = jwt.sign(
            { user_id: member.id },
            process.env.SECRET_KEY,
            { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 10080}m` }
        );

        res.status(201).json({
            access_token: token,
            token_type: 'bearer',
            user: {
                id: member.id,
                name: member.name,
                email: member.email,
                card_id: member.card_id,
                member_type: member.member_type,
                role: member.role || 'member',
            }
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const member = await prisma.members.findUnique({ where: { email } });
        if (!member || !member.password_hash) {
            return res.status(401).json({ detail: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, member.password_hash);
        if (!isValid) {
            return res.status(401).json({ detail: 'Invalid email or password' });
        }

        // Update last_visit
        await prisma.members.update({
            where: { id: member.id },
            data: { last_visit: new Date() }
        });

        const token = jwt.sign(
            { user_id: member.id },
            process.env.SECRET_KEY,
            { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 10080}m` }
        );

        res.json({
            access_token: token,
            token_type: 'bearer',
            user: {
                id: member.id,
                name: member.name,
                email: member.email,
                card_id: member.card_id,
                member_type: member.member_type,
                role: member.role || 'member',
            }
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const memberSelect = {
            id: true, card_id: true, name: true, email: true,
            phone: true, address: true, member_type: true,
            status: true, fines: true, joined_date: true, role: true,
        };
        let member = null;

        if (req.supabase_uid) {
            member = await prisma.members.findFirst({
                where: { supabase_uid: req.supabase_uid },
                select: memberSelect,
            });
        }
        if (!member && req.user_email) {
            member = await prisma.members.findUnique({
                where: { email: req.user_email },
                select: memberSelect,
            });
        }
        if (!member && req.user?.user_id) {
            member = await prisma.members.findUnique({
                where: { id: req.user.user_id },
                select: memberSelect,
            });
        }

        if (!member) {
            return res.status(404).json({ detail: 'User not found' });
        }

        res.json(member);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/auth/staff/me - Check if current user is admin/staff
// Used by AdminRoute.jsx to gate the admin panel
router.get('/staff/me', authenticateToken, async (req, res) => {
    try {
        const memberSelect = {
            id: true, name: true, email: true, role: true, member_type: true, status: true,
        };
        let member = null;

        if (req.supabase_uid) {
            member = await prisma.members.findFirst({
                where: { supabase_uid: req.supabase_uid },
                select: memberSelect,
            });
        }
        if (!member && req.user_email) {
            member = await prisma.members.findFirst({
                where: { email: req.user_email },
                select: memberSelect,
            });
        }
        if (!member && req.user?.user_id) {
            member = await prisma.members.findUnique({
                where: { id: req.user.user_id },
                select: memberSelect,
            });
        }

        if (!member) {
            return res.status(403).json({ detail: 'User not found' });
        }
        if (!['admin', 'staff'].includes(member.role)) {
            return res.status(403).json({ detail: 'Staff access required', role: member.role });
        }

        res.json({
            id: member.id,
            role: member.role,
            name: member.name,
            email: member.email,
            is_admin: member.role === 'admin',
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
