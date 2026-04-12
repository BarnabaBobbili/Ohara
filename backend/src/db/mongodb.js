import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let mongoClient = null;
let db = null;

// ─── Index Definitions ──────────────────────────────────────

const safeCreateIndex = async (collection, keys, options) => {
    try {
        await collection.createIndex(keys, options);
    } catch (error) {
        // If index already exists with same keys but different name, that's fine
        if (error.code === 85 || error.code === 86) {
            // 85: IndexOptionsConflict, 86: IndexKeySpecsConflict
            // Index exists with different options/name - skip silently
            return;
        }
        throw error;
    }
};

const ensureMongoIndexes = async (database) => {
    try {
        // Activity logs
        const activityLogs = database.collection('activity_logs');
        await safeCreateIndex(activityLogs, { timestamp: -1 }, { name: 'idx_timestamp_desc', background: true });
        await safeCreateIndex(activityLogs, { action: 1, timestamp: -1 }, { name: 'idx_action_timestamp', background: true });
        await safeCreateIndex(activityLogs, { entity_type: 1, entity_id: 1 }, { name: 'idx_entity', background: true });

        // CMS pages — unique compound index per page+section
        const cmsPages = database.collection('cms_pages');
        await safeCreateIndex(cmsPages, { page: 1, section: 1 }, { unique: true, name: 'idx_page_section', background: true });

        // Analytics
        const analytics = database.collection('analytics');
        await safeCreateIndex(analytics, { type: 1, timestamp: -1 }, { name: 'idx_type_timestamp', background: true });
        await safeCreateIndex(analytics, { timestamp: -1 }, { name: 'idx_analytics_timestamp', background: true });

        // Reviews
        const reviews = database.collection('reviews');
        await safeCreateIndex(reviews, { book_id: 1, created_at: -1 }, { name: 'idx_reviews_book_date', background: true });
        await safeCreateIndex(reviews, { member_id: 1 }, { name: 'idx_reviews_member', background: true });
        await safeCreateIndex(reviews, { status: 1 }, { name: 'idx_reviews_status', background: true });
        await safeCreateIndex(reviews, { book_id: 1, member_id: 1 }, { unique: true, name: 'idx_reviews_book_member_unique', background: true });
        await safeCreateIndex(reviews, { likes_count: -1 }, { name: 'idx_reviews_popular', background: true });

        // Review reactions
        const reactions = database.collection('review_reactions');
        await safeCreateIndex(reactions, { review_id: 1, member_id: 1 }, { unique: true, name: 'idx_reactions_unique', background: true });
        await safeCreateIndex(reactions, { review_id: 1 }, { name: 'idx_reactions_review', background: true });
        
        console.log('✓ MongoDB indexes verified');
    } catch (error) {
        console.warn('MongoDB index creation warning:', error.message);
    }
};

// ─── Default CMS Content ────────────────────────────────────

const DEFAULT_CMS_CONTENT = [
    {
        page: 'home',
        section: 'hero',
        content: {
            headline: "Find the book that's been waiting for you.",
            subtitle: 'Browse 50,000+ titles. Reserve instantly.\nYour reading journey, organized.',
            quick_links: [
                { label: 'Browse Catalog', url: '/search' },
                { label: 'New Arrivals', url: '/search?filter=new' },
                { label: 'Staff Picks', url: '/search?filter=staff-picks' },
                { label: 'My Reservations', url: '/dashboard' },
            ],
            stats: {
                readers_count: 12847,
                rating: 4.9,
                reviews_count: 2340,
            },
        },
        is_active: true,
        updated_at: new Date(),
        updated_by: 'system',
    },
    {
        page: 'home',
        section: 'bookshelf',
        content: {
            headline: 'The Living Library',
            subtitle:
                'Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now.',
        },
        is_active: true,
        updated_at: new Date(),
        updated_by: 'system',
    },
    {
        page: 'home',
        section: 'philosophy',
        content: {
            label: '04 — Philosophy',
            headline: 'Ohara Philosophy',
            body_paragraphs: [
                "In an era defined by algorithmic noise and infinite scrolling, we built a sanctuary. Ohara is not just a feature; it is a commitment to the preservation of attention. We eschew the dopamine loops of modern software in favor of a slower, more deliberate pace.",
                "We believe that the act of cataloging one's library is a form of meditation. It connects us to the physical reality of the books we love—the weight of the paper, the smell of the binding, the memories attached to each spine.",
                "There are no notifications here. No social feeds clamoring for your engagement. Just your collection, your thoughts, and the quiet space to organize them.",
            ],
        },
        is_active: true,
        updated_at: new Date(),
        updated_by: 'system',
    },
    {
        page: 'home',
        section: 'membership_cta',
        content: {
            headline: 'Begin your journey.',
            subtitle:
                'Unlock intelligent cataloging and rediscover the art of your collection. Curate your legacy, one volume at a time.',
            button_text: 'Request Access',
        },
        is_active: true,
        updated_at: new Date(),
        updated_by: 'system',
    },
    {
        page: 'home',
        section: 'footer',
        content: {
            columns: [
                {
                    title: 'The Archives',
                    links: [
                        { label: 'Search Catalog', url: '/search' },
                        { label: 'Curated Lists', url: '/search?filter=collections' },
                        { label: 'New Arrivals', url: '/search?filter=new' },
                        { label: 'Borrowing History', url: '/dashboard' },
                    ],
                },
                {
                    title: 'The Community',
                    links: [
                        { label: 'About Ohara', url: '/about' },
                        { label: 'Upcoming Events', url: '/events' },
                        { label: 'Member Portal', url: '/dashboard' },
                    ],
                },
                {
                    title: 'The Keepers',
                    links: [
                        { label: 'About Us', url: '/about' },
                        { label: 'Contact Librarian', url: '/contact' },
                        { label: 'Support / FAQ', url: '/faq' },
                        { label: 'Privacy Policy', url: '/privacy' },
                    ],
                },
            ],
            newsletter_label: 'Join the Registry',
            copyright_text: '© 2025 Ohara Library. All rights reserved.',
        },
        is_active: true,
        updated_at: new Date(),
        updated_by: 'system',
    },
];

// ─── Seed CMS if empty ───────────────────────────────────────

const seedCMSContent = async (database) => {
    const cmsPages = database.collection('cms_pages');
    const count = await cmsPages.countDocuments();
    if (count === 0) {
        await cmsPages.insertMany(DEFAULT_CMS_CONTENT);
        console.log(`✓ MongoDB: Seeded ${DEFAULT_CMS_CONTENT.length} default CMS sections`);
    }
};

// ─── Connection ──────────────────────────────────────────────

export const connectMongoDB = async () => {
    try {
        if (mongoClient) {
            return db;
        }

        const uri    = process.env.MONGODB_URL;
        const dbName = process.env.MONGODB_DB_NAME || 'LMS';

        mongoClient = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: Number.parseInt(process.env.MONGO_POOL_MAX || '30', 10),
            minPoolSize: Number.parseInt(process.env.MONGO_POOL_MIN || '2', 10),
            retryWrites: true,
        });

        await mongoClient.connect();
        db = mongoClient.db(dbName);

        await ensureMongoIndexes(db);
        await seedCMSContent(db);

        console.log('✓ MongoDB connected');
        return db;
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        throw error;
    }
};

export const getMongoDatabase = () => {
    if (!db) {
        console.warn('MongoDB not connected');
        return null;
    }
    return db;
};

export const closeMongoDB = async () => {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        db = null;
    }
};

export const checkMongoConnection = async () => {
    try {
        if (!mongoClient) return false;
        await mongoClient.db().admin().ping();
        return true;
    } catch {
        return false;
    }
};

// ─── Activity Logs Helpers ───────────────────────────────────

export const getActivityLogs = async (limit = 50) => {
    try {
        if (!db) return [];
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
        return await db.collection('activity_logs')
            .find({})
            .sort({ timestamp: -1 })
            .limit(safeLimit)
            .toArray();
    } catch (error) {
        console.error('Failed to get activity logs:', error.message);
        return [];
    }
};

export const logActivity = async (entry) => {
    try {
        if (!db) return;
        await db.collection('activity_logs').insertOne({
            ...entry,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
};

export default {
    connectMongoDB,
    getMongoDatabase,
    closeMongoDB,
    checkMongoConnection,
    getActivityLogs,
    logActivity,
};
