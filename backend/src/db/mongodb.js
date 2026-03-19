import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let mongoClient = null;
let db = null;

const ensureMongoIndexes = async (database) => {
    const activityLogs = database.collection('activity_logs');
    await activityLogs.createIndex({ timestamp: -1 }, { name: 'idx_activity_timestamp_desc' });
};

export const connectMongoDB = async () => {
    try {
        if (mongoClient) {
            console.log('MongoDB already connected');
            return db;
        }

        const uri = process.env.MONGODB_URL;
        const dbName = process.env.MONGODB_DB_NAME || 'LMS';
        const compressors = (process.env.MONGO_COMPRESSORS || 'zlib')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        mongoClient = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: Number.parseInt(process.env.MONGO_POOL_MAX || '30', 10),
            minPoolSize: Number.parseInt(process.env.MONGO_POOL_MIN || '2', 10),
            retryWrites: true,
            ...(compressors.length > 0 ? { compressors } : {}),
        });

        await mongoClient.connect();
        db = mongoClient.db(dbName);
        await ensureMongoIndexes(db);

        console.log('MongoDB connected successfully');
        return db;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
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
        console.log('MongoDB connection closed');
    }
};

export const checkMongoConnection = async () => {
    try {
        if (!mongoClient) {
            return false;
        }
        await mongoClient.db().admin().ping();
        return true;
    } catch (error) {
        return false;
    }
};

export const getActivityLogs = async (limit = 50) => {
    try {
        if (!db) return [];
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
        const logs = await db.collection('activity_logs')
            .find({})
            .sort({ timestamp: -1 })
            .limit(safeLimit)
            .toArray();
        return logs;
    } catch (error) {
        console.error('Failed to get activity logs:', error.message);
        return [];
    }
};

export default {
    connectMongoDB,
    getMongoDatabase,
    closeMongoDB,
    checkMongoConnection,
    getActivityLogs,
};
