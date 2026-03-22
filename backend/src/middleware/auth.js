import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';

/**
 * Verify a Supabase JWT token (or legacy SECRET_KEY token).
 * Frontend: pass Authorization: Bearer <session.access_token>
 * from supabase.auth.getSession()
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ detail: 'No token provided' });
    }

    const secrets = [
        process.env.SUPABASE_JWT_SECRET,
        process.env.SECRET_KEY,
    ].filter(Boolean);

    if (!secrets.length) {
        return res.status(500).json({ detail: 'No JWT secret configured' });
    }

    let lastError = null;
    for (const secret of secrets) {
        try {
            const decoded = jwt.verify(token, secret);
            req.user         = decoded;
            req.supabase_uid = decoded.sub   || null;   // Supabase Auth UUID
            req.user_email   = decoded.email || null;
            req.auth_type    = decoded.sub ? 'supabase' : 'legacy';
            return next();
        } catch (err) {
            lastError = err;
        }
    }

    return res.status(403).json({
        detail: lastError?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or expired token',
    });
};

// ─── Resolve the member from the database ────────────────────
// All users (including admins) are in the members table with role column

const resolveMember = async (req) => {
    // 1. Try Supabase UID (fastest for logged-in Supabase users)
    if (req.supabase_uid) {
        const member = await prisma.members.findFirst({
            where: { supabase_uid: req.supabase_uid, status: 'active' },
            select: { id: true, name: true, email: true, role: true, member_type: true, status: true },
        });
        if (member) return member;
    }

    // 2. Try email from JWT payload
    if (req.user_email) {
        const member = await prisma.members.findFirst({
            where: { email: req.user_email, status: 'active' },
            select: { id: true, name: true, email: true, role: true, member_type: true, status: true },
        });
        if (member) return member;
    }

    // 3. Legacy: custom JWT had user_id
    if (req.user?.user_id) {
        const member = await prisma.members.findUnique({
            where: { id: req.user.user_id },
            select: { id: true, name: true, email: true, role: true, member_type: true, status: true },
        });
        if (member?.status === 'active') return member;
    }

    return null;
};

/**
 * Require the caller to be an active staff or admin member.
 * Attach req.actor with the member record.
 */
export const requireStaff = async (req, res, next) => {
    try {
        const member = await resolveMember(req);
        if (!member || !['admin', 'staff', 'librarian'].includes(member.role)) {
            return res.status(403).json({ detail: 'Staff access required' });
        }
        req.actor = member;
        req.staff = member; // legacy compat
        next();
    } catch {
        res.status(500).json({ detail: 'Auth check failed' });
    }
};

/**
 * Require the caller to be an admin member.
 * Attach req.actor with the member record.
 */
export const requireAdmin = async (req, res, next) => {
    try {
        const member = await resolveMember(req);
        if (!member || member.role !== 'admin') {
            return res.status(403).json({ detail: 'Access denied. Admin credentials required.' });
        }
        req.actor = member;
        req.staff = member; // legacy compat
        next();
    } catch {
        res.status(500).json({ detail: 'Admin auth check failed' });
    }
};

// Legacy token creator (for non-Supabase flows)
export const createToken = (userId) => {
    return jwt.sign(
        { user_id: userId },
        process.env.SECRET_KEY,
        { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 10080}m` }
    );
};
