import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: Number.parseInt(process.env.PG_POOL_MAX || '24', 10),
    min: Number.parseInt(process.env.PG_POOL_MIN || '2', 10),
    idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS || '5000', 10),
    maxUses: Number.parseInt(process.env.PG_MAX_USES || '7500', 10),
    keepAlive: true,
    allowExitOnIdle: true,
});

pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const getPostgresPoolStats = () => ({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
});

export const closePostgresPool = async () => {
    await pool.end();
};

export default prisma;
