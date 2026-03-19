import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ detail: 'No token provided' });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ detail: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
};

export const createToken = (userId) => {
    return jwt.sign(
        { user_id: userId },
        process.env.SECRET_KEY,
        { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 30}m` }
    );
};
