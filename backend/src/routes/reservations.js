import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateToken, requireStaff } from '../middleware/auth.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';
import { logActivity } from '../db/activityLogger.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

const resolveMemberFromReq = async (req) => {
    const select = {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        fines: true,
        card_id: true,
    };

    if (req.supabase_uid) {
        const member = await prisma.members.findFirst({
            where: { supabase_uid: req.supabase_uid },
            select,
        });
        if (member) return member;
    }

    if (req.user_email) {
        const member = await prisma.members.findUnique({
            where: { email: req.user_email },
            select,
        });
        if (member) return member;
    }

    if (req.user?.user_id) {
        const member = await prisma.members.findUnique({
            where: { id: req.user.user_id },
            select,
        });
        if (member) return member;
    }

    return null;
};

const getReservationExpiryDays = async () => {
    const [primarySetting, fallbackSetting] = await Promise.all([
        prisma.site_settings.findUnique({ where: { key: 'reservation_expiry_days' } }),
        prisma.site_settings.findUnique({ where: { key: 'reservation_expiry' } }),
    ]);

    const parsedPrimary = Number.parseInt(primarySetting?.value, 10);
    if (Number.isFinite(parsedPrimary) && parsedPrimary > 0) return parsedPrimary;

    const parsedFallback = Number.parseInt(fallbackSetting?.value, 10);
    if (Number.isFinite(parsedFallback) && parsedFallback > 0) return parsedFallback;

    return 3;
};

router.post('/', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) {
            return res.status(404).json({ detail: 'Member account not found. Please link your account.' });
        }
        if (member.status !== 'active') {
            return res.status(400).json({ detail: 'Only active members can place reservations' });
        }

        const outstandingDues = Number.parseFloat(String(member.fines ?? 0));
        if (outstandingDues > 0) {
            return res.status(400).json({ detail: 'Outstanding dues must be cleared before reserving books' });
        }

        const bookId = Number.parseInt(req.body?.book_id, 10);
        const notes = req.body?.notes ? String(req.body.notes) : null;
        if (!Number.isInteger(bookId)) {
            return res.status(400).json({ detail: 'Valid book_id is required' });
        }

        const book = await prisma.books.findUnique({
            where: { id: bookId },
            select: { id: true, title: true, isbn: true, is_active: true, is_reference_only: true },
        });
        if (!book || book.is_active === false) {
            return res.status(404).json({ detail: 'Book not found' });
        }
        if (book.is_reference_only) {
            return res.status(400).json({ detail: 'Reference-only books cannot be reserved' });
        }

        const existingPending = await prisma.reservations.findFirst({
            where: {
                book_id: bookId,
                member_id: member.id,
                status: 'pending',
            },
            select: { id: true },
        });
        if (existingPending) {
            return res.status(409).json({ detail: 'You already have an active reservation for this book' });
        }

        const [pendingCount, expiryDays] = await Promise.all([
            prisma.reservations.count({ where: { book_id: bookId, status: 'pending' } }),
            getReservationExpiryDays(),
        ]);

        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        const reservation = await prisma.reservations.create({
            data: {
                book_id: bookId,
                member_id: member.id,
                status: 'pending',
                notes,
                expiry_date: expiryDate,
                position_in_queue: pendingCount + 1,
            },
            include: {
                books: { select: { id: true, title: true, author: true, isbn: true, cover_image_url: true } },
            },
        });

        logActivity({
            action: 'reservation_created',
            entity_type: 'reservation',
            entity_id: reservation.id,
            entity_details: {
                title: book.title,
                isbn: book.isbn,
                name: member.name,
                card_id: member.card_id,
            },
            performed_by: {
                email: member.email,
                name: member.name,
            },
            metadata: {
                book_id: bookId,
                member_id: member.id,
                position_in_queue: reservation.position_in_queue,
            },
        });

        invalidateAnalyticsCache();
        return res.status(201).json(reservation);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) {
            return res.status(404).json({ detail: 'Member account not found. Please link your account.' });
        }

        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 20,
            maxLimit: 100,
            maxSkip: 5000,
        });

        const status = req.query?.status ? String(req.query.status) : undefined;
        const reservations = await prisma.reservations.findMany({
            where: {
                member_id: member.id,
                ...(status ? { status } : {}),
            },
            include: {
                books: { select: { id: true, title: true, author: true, isbn: true, cover_image_url: true } },
            },
            orderBy: { reservation_date: 'desc' },
            skip,
            take: limit,
        });

        return res.json(reservations);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

router.patch('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) {
            return res.status(404).json({ detail: 'Member account not found. Please link your account.' });
        }

        const reservationId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(reservationId)) {
            return res.status(400).json({ detail: 'Valid reservation id is required' });
        }

        const reservation = await prisma.reservations.findUnique({
            where: { id: reservationId },
            include: {
                books: { select: { id: true, title: true, isbn: true } },
                members: { select: { id: true, name: true, email: true, card_id: true } },
            },
        });
        if (!reservation) {
            return res.status(404).json({ detail: 'Reservation not found' });
        }

        const isStaff = ['admin', 'staff', 'librarian'].includes(member.role);
        if (!isStaff && reservation.member_id !== member.id) {
            return res.status(403).json({ detail: 'You can only cancel your own reservations' });
        }

        const cancellationNote = typeof req.body?.cancellation_note === 'string'
            ? req.body.cancellation_note.trim()
            : '';

        if (isStaff && reservation.member_id !== member.id && !cancellationNote) {
            return res.status(400).json({ detail: 'Cancellation reason is required for staff/admin cancellations' });
        }

        if (reservation.status !== 'pending') {
            return res.status(400).json({ detail: 'Only pending reservations can be cancelled' });
        }

        const existingNotes = reservation.notes ? String(reservation.notes).trim() : '';
        let appendedNote = '';
        if (isStaff && reservation.member_id !== member.id && cancellationNote) {
            appendedNote = `Staff cancellation reason: ${cancellationNote}`;
        } else if (cancellationNote) {
            appendedNote = `Member cancellation note: ${cancellationNote}`;
        }

        const mergedNotes = [existingNotes, appendedNote]
            .filter((note) => note && note.length > 0)
            .join('\n');

        const updated = await prisma.reservations.update({
            where: { id: reservationId },
            data: {
                status: 'cancelled',
                notes: mergedNotes || null,
                updated_at: new Date(),
            },
        });

        logActivity({
            action: 'reservation_cancelled',
            entity_type: 'reservation',
            entity_id: reservation.id,
            entity_details: {
                title: reservation.books?.title,
                isbn: reservation.books?.isbn,
                name: reservation.members?.name,
                card_id: reservation.members?.card_id,
            },
            performed_by: {
                email: member.email,
                name: member.name,
            },
            metadata: {
                book_id: reservation.book_id,
                member_id: reservation.member_id,
                cancellation_note: cancellationNote || null,
            },
        });

        invalidateAnalyticsCache();
        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

router.get('/', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        const status = req.query?.status ? String(req.query.status) : undefined;

        const reservations = await prisma.reservations.findMany({
            where: status ? { status } : undefined,
            include: {
                books: { select: { id: true, title: true, author: true, isbn: true, cover_image_url: true } },
                members: { select: { id: true, name: true, email: true, card_id: true, fines: true } },
            },
            orderBy: { reservation_date: 'desc' },
            skip,
            take: limit,
        });

        return res.json(reservations);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

export default router;
