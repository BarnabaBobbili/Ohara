"""
Library Management System Backend API
Multi-database architecture: SQLite, MongoDB, Neo4j
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.sql import init_db
from app.database.mongodb import connect_mongodb, close_mongodb
from app.database.neo4j_conn import connect_neo4j, close_neo4j
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize databases on startup"""
    logger.info("Starting up...")
    
    # Initialize SQLite
    try:
        init_db()
        logger.info("✓ SQLite initialized")
    except Exception as e:
        logger.error(f"✗ SQLite initialization failed: {e}")
    
    # Connect to MongoDB (optional)
    try:
        connect_mongodb()
    except Exception as e:
        logger.warning(f"MongoDB not connected (optional): {e}")
    
    # Connect to Neo4j (optional)
    try:
        connect_neo4j()
    except Exception as e:
        logger.warning(f"Neo4j not connected (optional): {e}")
    
    # Create upload directories for book sources
    import os
    os.makedirs("uploads/user_books", exist_ok=True)
    os.makedirs("cache/books", exist_ok=True)
    os.makedirs("cache/covers", exist_ok=True)
    logger.info("✓ Upload directories created")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    logger.info("Shutting down...")
    close_mongodb()
    close_neo4j()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Library Management System API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint with database status"""
    from app.database.mongodb import get_mongodb
    from app.database.neo4j_conn import get_neo4j_driver
    
    mongodb_status = "connected" if get_mongodb() else "disconnected"
    neo4j_status = "connected" if get_neo4j_driver() else "disconnected"
    
    return {
        "status": "healthy",
        "databases": {
            "sqlite": "connected",
            "mongodb": mongodb_status,
            "neo4j": neo4j_status
        }
    }


# Import routers
from app.routers import books, members, circulation, dashboard, reports, external_books, user_library, auth

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(books.router, prefix=settings.API_V1_PREFIX)
app.include_router(members.router, prefix=settings.API_V1_PREFIX)
app.include_router(circulation.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(external_books.router, prefix=settings.API_V1_PREFIX)
app.include_router(user_library.router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
