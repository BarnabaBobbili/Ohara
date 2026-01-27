"""
MongoDB Connection with PyMongo
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# MongoDB client instance
client = None
db = None


def connect_mongodb():
    """Connect to MongoDB"""
    global client, db
    try:
        client = MongoClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000
        )
        # Test connection
        client.admin.command('ping')
        db = client[settings.MONGODB_DB_NAME]
        logger.info(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")
        return db
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return None


def get_mongodb():
    """
    Get MongoDB database instance
    Usage: db = Depends(get_mongodb)
    """
    global db
    if db is None:
        db = connect_mongodb()
    return db


def close_mongodb():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


# Collections
def get_activity_logs_collection():
    """Get activity logs collection"""
    mongodb = get_mongodb()
    if mongodb is not None:
        return mongodb.activity_logs
    return None


def get_daily_stats_collection():
    """Get daily stats collection"""
    mongodb = get_mongodb()
    if mongodb is not None:
        return mongodb.daily_stats
    return None


def get_report_cache_collection():
    """Get report cache collection"""
    mongodb = get_mongodb()
    if mongodb is not None:
        return mongodb.report_cache
    return None
