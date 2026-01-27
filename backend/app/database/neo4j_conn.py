"""
Neo4j Graph Database Connection
"""
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Neo4j driver instance
driver = None


def connect_neo4j():
    """Connect to Neo4j database"""
    global driver
    try:
        driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        # Verify connectivity
        driver.verify_connectivity()
        logger.info("Connected to Neo4j database")
        return driver
    except ServiceUnavailable as e:
        logger.error(f"Failed to connect to Neo4j: {e}")
        return None
    except Exception as e:
        logger.error(f"Neo4j connection error: {e}")
        return None


def get_neo4j_driver():
    """Get Neo4j driver instance"""
    global driver
    if driver is None:
        driver = connect_neo4j()
    return driver


def get_neo4j_session():
    """
    Get Neo4j session for running queries
    Usage: with get_neo4j_session() as session:
    """
    driver = get_neo4j_driver()
    if driver:
        return driver.session()
    return None


def close_neo4j():
    """Close Neo4j connection"""
    global driver
    if driver:
        driver.close()
        logger.info("Neo4j connection closed")


# Helper functions for common queries
def create_member_node(session, member_id: str, name: str, member_type: str):
    """Create a Member node in Neo4j"""
    query = """
    CREATE (m:Member {id: $member_id, name: $name, type: $member_type})
    RETURN m
    """
    result = session.run(query, member_id=member_id, name=name, member_type=member_type)
    return result.single()


def create_book_node(session, book_id: str, title: str, author: str):
    """Create a Book node in Neo4j"""
    query = """
    CREATE (b:Book {id: $book_id, title: $title, author: $author})
    RETURN b
    """
    result = session.run(query, book_id=book_id, title=title, author=author)
    return result.single()


def create_borrowed_relationship(session, member_id: str, book_id: str):
    """Create BORROWED relationship between Member and Book"""
    query = """
    MATCH (m:Member {id: $member_id})
    MATCH (b:Book {id: $book_id})
    CREATE (m)-[r:BORROWED {timestamp: datetime()}]->(b)
    RETURN r
    """
    result = session.run(query, member_id=member_id, book_id=book_id)
    return result.single()


def get_book_recommendations(session, member_id: str, limit: int = 5):
    """
    Get book recommendations based on similar borrowing patterns
    """
    query = """
    MATCH (m:Member {id: $member_id})-[:BORROWED]->(b:Book)
    MATCH (b)<-[:BORROWED]-(other:Member)-[:BORROWED]->(rec:Book)
    WHERE NOT (m)-[:BORROWED]->(rec)
    RETURN rec.id as book_id, rec.title as title, rec.author as author, 
           count(*) as score
    ORDER BY score DESC
    LIMIT $limit
    """
    result = session.run(query, member_id=member_id, limit=limit)
    return [record.data() for record in result]
