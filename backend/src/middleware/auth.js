import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';

/**
 * Verify a Supabase JWT token (or legacy SECRET_KEY token).
 * Frontend: pass Authorization: Bearer <session.access_token>
 * from supabase.auth.getSession()
 */
const applyAuthContext = (req, decoded) => {
    req.user = decoded;
    req.supabase_uid = decoded.sub || null;
    req.user_email = decoded.email || null;
    req.auth_type = decoded.sub ? 'supabase' : 'legacy';
};

const verifyAuthorizationHeader = (authHeader) => {
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return { ok: false, status: 401, detail: 'No token provided' };
    }

    const secrets = [
        process.env.SUPABASE_JWT_SECRET,
        process.env.SECRET_KEY,
    ].filter(Boolean);

    if (!secrets.length) {
        return { ok: false, status: 500, detail: 'No JWT secret configured' };
    }

    let lastError = null;
    for (const secret of secrets) {
        try {
            const decoded = jwt.verify(token, secret);
            return { ok: true, decoded };
        } catch (err) {
            lastError = err;
        }
    }

    return {
        ok: false,
        status: 403,
        detail: lastError?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or expired token',
    };
};

export const authenticateToken = (req, res, next) => {
    const verification = verifyAuthorizationHeader(req.headers['authorization']);
    if (!verification.ok) {
        return res.status(verification.status).json({ detail: verification.detail });
    }

    applyAuthContext(req, verification.decoded);
    return next();
};

export const tryAuthenticateToken = (req) => {
    const verification = verifyAuthorizationHeader(req.headers['authorization']);
    if (!verification.ok) {
        return false;
    }

    applyAuthContext(req, verification.decoded);
    return true;
};

// ─── Resolve the member from the database ────────────────────
// All users (including admins) are in the members table with role column

export const resolveMember = async (req) => {
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

export const requireMember = async (req, res, next) => {
    try {
        const member = await resolveMember(req);
        if (!member) {
            return res.status(404).json({ detail: 'Member account not found. Please link your account.' });
        }
        if (member.status !== 'active') {
            return res.status(403).json({ detail: 'Only active members can access this resource' });
        }

        req.actor = member;
        req.member = member;
        next();
    } catch {
        res.status(500).json({ detail: 'Member auth check failed' });
    }
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
