"""
Database initialization and testing
"""
from app.database.sql import init_db, engine
from app.database.mongodb import connect_mongodb, close_mongodb
from app.database.neo4j_conn import connect_neo4j, close_neo4j
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def initialize_databases():
    """Initialize all database connections"""
    logger.info("Initializing databases...")
    
    # Initialize SQLite
    try:
        init_db()
        logger.info("✓ SQLite initialized")
    except Exception as e:
        logger.error(f"✗ SQLite initialization failed: {e}")
    
    # Connect to MongoDB
    try:
        mongodb = connect_mongodb()
        if mongodb is not None:
            logger.info("✓ MongoDB connected")
        else:
            logger.warning("✗ MongoDB connection failed (ensure MongoDB is running)")
    except Exception as e:
        logger.error(f"✗ MongoDB error: {e}")
    
    # Connect to Neo4j
    try:
        neo4j_driver = connect_neo4j()
        if neo4j_driver is not None:
            logger.info("✓ Neo4j connected")
        else:
            logger.warning("✗ Neo4j connection failed (ensure Neo4j is running)")
    except Exception as e:
        logger.error(f"✗ Neo4j error: {e}")


def close_databases():
    """Close all database connections"""
    logger.info("Closing database connections...")
    close_mongodb()
    close_neo4j()
    logger.info("Database connections closed")


if __name__ == "__main__":
    # Test database connections
    initialize_databases()
    
    # Keep connections open for testing
    input("Press Enter to close connections...")
    
    close_databases()
