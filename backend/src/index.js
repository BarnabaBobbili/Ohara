import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma, { closePostgresPool, getPostgresPoolStats } from './db/prisma.js';
import { connectMongoDB, checkMongoConnection, closeMongoDB } from './db/mongodb.js';
import { connectNeo4j, checkNeo4jConnection, closeNeo4j } from './db/neo4j.js';
import { connectMySQL, checkMySQLConnection, closeMySQL } from './db/mysql.js';
import { ensurePostgresIndexes } from './db/postgresIndexes.js';
import { validateDataStoreConfig, DATA_STORES } from './config/dataStores.js';
import { getCacheStats } from './utils/cache.js';
import { getLogQueueStats } from './db/logQueue.js';
import { ensureBucket } from './utils/storage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import booksRouter from './routes/books.js';
import membersRouter from './routes/members.js';
import circulationRouter from './routes/circulation.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import auditRouter from './routes/audit.js';
import userLibraryRouter from './routes/user_library.js';
import cmsRouter from './routes/cms.js';
import siteSettingsRouter from './routes/site_settings.js';
import reservationsRouter from './routes/reservations.js';
import collectionsRouter from './routes/collections.js';
import recommendationsRouter from './routes/recommendations.js';
import financialRouter from './routes/financial.js';
import staffBoardRouter from './routes/staff_board.js';
import ebooksRouter from './routes/ebooks.js';
import wishlistRouter from './routes/wishlist.js';
import announcementsRouter from './routes/announcements.js';
import newsRouter from './routes/news.js';
import analyticsRouter from './routes/analytics.js';
import jobsRouter from './routes/jobs.js';
import reviewsRouter from './routes/reviews.js';
import giphyRouter from './routes/giphy.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { startScheduledJobs, stopScheduledJobs, getJobStatus } from './jobs/jobScheduler.js';

dotenv.config();

// ─── Global BigInt serialization fix ───────────────────────────────────────
// Prisma returns BigInt for columns declared @db.BigInt (e.g. file_size_bytes).
// Node's JSON.stringify cannot serialize BigInt natively; this adds a safe
// toJSON() so all res.json() calls convert BigInt → Number automatically.
// biome-ignore lint/suspicious/noExtendNative: intentional polyfill
BigInt.prototype.toJSON = function () { return Number(this); };
// ───────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - started;
        if (durationMs > 800) {
            console.warn(`[SLOW] ${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
        }
    });
    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'Library Management System API',
        version: '2.0.0',
        status: 'running',
        orm: 'Prisma',
    });
});

app.get('/health', async (req, res) => {
    try {
        const databases = {};

        try {
            await prisma.$queryRaw`SELECT 1`;
            databases.postgresql = 'connected';
        } catch {
            databases.postgresql = 'disconnected';
        }

        databases.mongodb = (await checkMongoConnection()) ? 'connected' : 'disconnected';
        databases.neo4j = (await checkNeo4jConnection()) ? 'connected' : 'disconnected';
        databases.mysql = (await checkMySQLConnection()) ? 'connected' : 'disconnected';

        res.json({
            status: 'healthy',
            databases,
            postgres_pool: getPostgresPoolStats(),
            log_queue: getLogQueueStats(),
            cache: getCacheStats(),
            scheduled_jobs: getJobStatus()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});

app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/circulation', circulationRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit', auditRouter);
app.use('/api/user-library', userLibraryRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/settings', siteSettingsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/financial', financialRouter);
app.use('/api/staff-board', staffBoardRouter);
app.use('/api/ebooks', ebooksRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/news', newsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/giphy', giphyRouter);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last middleware
app.use(errorHandler);

const startServer = async () => {
    console.log('='.repeat(60));
    console.log('Initializing databases...');
    console.log('='.repeat(60));

    // Validate dynamic data store configuration
    try {
        validateDataStoreConfig();
    } catch (error) {
        console.error('❌ Data store configuration validation failed');
        process.exit(1);
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
        await ensurePostgresIndexes();
        console.log('PostgreSQL (Prisma): Connected');
    } catch (error) {
        console.error('PostgreSQL (Prisma): Connection failed:', error.message);
    }

    try {
        await connectMongoDB();
    } catch {
        console.error('Note: MongoDB connection failed (optional)');
    }

    try {
        connectNeo4j();
        const neo4jConnected = await checkNeo4jConnection();
        if (!neo4jConnected) {
            console.error('Note: Neo4j connection failed (optional)');
        }
    } catch {
        console.error('Note: Neo4j connection failed (optional)');
    }

    try {
        await connectMySQL();
    } catch {
        console.error('Note: MySQL connection failed (optional)');
    }

    try {
        await ensureBucket();
    } catch (error) {
        console.error('Note: Supabase storage initialization failed (optional):', error.message);
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory');
    }

    // Start scheduled jobs
    try {
        startScheduledJobs();
    } catch (error) {
        console.error('Note: Failed to start scheduled jobs:', error.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(60));
        console.log('Library Management System API (Prisma ORM)');
        console.log('='.repeat(60));
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log('='.repeat(60));
    });
};

const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    
    // Stop scheduled jobs first
    try {
        stopScheduledJobs();
    } catch (error) {
        console.error('Error stopping scheduled jobs:', error.message);
    }
    
    await Promise.allSettled([
        prisma.$disconnect(),
        closePostgresPool(),
        closeMongoDB(),
        closeNeo4j(),
        closeMySQL(),
    ]);
    process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't crash in production
    if (process.env.NODE_ENV !== 'production') {
        shutdown();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown();
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer().catch(console.error);
