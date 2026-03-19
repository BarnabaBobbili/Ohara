import express from 'express';
import prisma from '../db/prisma.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';

const router = express.Router();

const memberSelect = {
    id: true,
    card_id: true,
    name: true,
    email: true,
    phone: true,
    address: true,
    member_type: true,
    status: true,
    fines: true,
    joined_date: true,
    expiry_date: true,
    last_visit: true,
};

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:');
};

router.get('/', async (req, res) => {
    try {
        const { member_type, status, search } = req.query;
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 20,
            maxLimit: 100,
            maxSkip: 5000,
        });

        const where = {};
        if (member_type) where.member_type = member_type;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { card_id: { contains: search, mode: 'insensitive' } },
            ];
        }

        const members = await prisma.members.findMany({
            where,
            select: memberSelect,
            skip,
            take: limit,
            orderBy: { joined_date: 'desc' },
        });

        res.json(members);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/card/:cardId', async (req, res) => {
    try {
        const member = await prisma.members.findUnique({
            where: { card_id: req.params.cardId },
            select: memberSelect,
        });

        if (!member) {
            return res.status(404).json({ detail: 'Member not found' });
        }

        res.json(member);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const member = await prisma.members.findUnique({
            where: { id: Number.parseInt(req.params.id, 10) },
            select: memberSelect,
        });

        if (!member) {
            return res.status(404).json({ detail: 'Member not found' });
        }

        res.json(member);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address, member_type, password } = req.body;

        const existing = await prisma.members.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ detail: 'Email already exists' });
        }

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const card_id = `LIB${timestamp}${random}`;

        const bcrypt = (await import('bcryptjs')).default;
        const password_hash = await bcrypt.hash(password, 10);

        const member = await prisma.members.create({
            data: {
                card_id,
                name,
                email,
                phone,
                address,
                member_type,
                password_hash,
                status: 'active',
                fines: 0.0,
            },
            select: memberSelect,
        });

        invalidateAnalyticsCache();
        res.status(201).json(member);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.id, 10);
        const allowedFields = ['name', 'email', 'phone', 'address', 'member_type', 'status', 'fines'];
        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ detail: 'No fields to update' });
        }

        const member = await prisma.members.update({
            where: { id: memberId },
            data: updateData,
            select: memberSelect,
        });

        invalidateAnalyticsCache();
        res.json(member);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ detail: 'Member not found' });
        }
        res.status(500).json({ detail: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.id, 10);

        const activeTransaction = await prisma.transactions.findFirst({
            where: { member_id: memberId, status: 'checked_out' },
            select: { id: true },
        });

        if (activeTransaction) {
            return res.status(400).json({
                detail: 'Cannot delete member with active transactions',
            });
        }

        await prisma.members.delete({ where: { id: memberId } });
        invalidateAnalyticsCache();
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ detail: 'Member not found' });
        }
        res.status(500).json({ detail: error.message });
    }
});

export default router;
