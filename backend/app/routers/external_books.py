"""
External Books API Router
Provides endpoints for searching and accessing books from external sources
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.sql import get_db
from app.models import schemas
from app.services.book_sources import BookSourceAggregator
from app.models.sql_models import ExternalBookCache
from app.config import settings
from datetime import datetime, timedelta
import json
import os

router = APIRouter(prefix="/external-books", tags=["external-books"])

# Initialize book source aggregator with API key from settings
GOOGLE_API_KEY = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)
book_aggregator = BookSourceAggregator(google_api_key=GOOGLE_API_KEY)


@router.get("/search", response_model=schemas.UnifiedSearchResponse)
async def search_external_books(
    q: str = Query(..., description="Search query"),
    sources: Optional[str] = Query(None, description="Comma-separated list of sources"),
    db: Session = Depends(get_db)
):
    """
    Search books across multiple external sources
    
    Sources: gutenberg, internet_archive, openlibrary, google_books
    """
    try:
        # Parse sources
        source_list = None
        if sources:
            source_list = [s.strip() for s in sources.split(",")]
        
        # Perform unified search
        results = await book_aggregator.unified_search(q, sources=source_list)
        
        # Cache results
        for result in results["results"]:
            await cache_external_book(db, result)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/sources")
async def get_available_sources():
    """Get list of available book sources"""
    return {
        "sources": [
            {
                "id": "gutenberg",
                "name": "Project Gutenberg",
                "description": "70,000+ free public domain books",
                "enabled": os.getenv("GUTENBERG_ENABLED", "true") == "true",
            },
            {
                "id": "internet_archive",
                "name": "Internet Archive",
                "description": "Millions of free books and texts",
                "enabled": os.getenv("INTERNET_ARCHIVE_ENABLED", "true") == "true",
            },
            {
                "id": "openlibrary",
                "name": "Open Library",
                "description": "Book metadata and covers",
                "enabled": os.getenv("OPEN_LIBRARY_ENABLED", "true") == "true",
            },
            {
                "id": "google_books",
                "name": "Google Books",
                "description": "Preview and metadata for all books",
                "enabled": bool(GOOGLE_API_KEY),
            },
        ]
    }


@router.get("/{source}/{source_id}")
async def get_external_book(
    source: str,
    source_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific external book"""
    # Skip cache for now - cached data may be missing ISBN/publisher
    # TODO: Cache invalidation or update logic needed
    # cached = get_cached_book(db, source, source_id)
    # if cached:
    #     return cached
    
    # Fetch from source
    try:
        if source == "gutenberg":
            book_data = await book_aggregator.gutenberg.get_book(source_id)
            # TODO: Fix enrichment function - currently causing 500 errors
            # if book_data and book_data.get("title"):
            #     await enrich_metadata(book_data)
        elif source == "internet_archive":
            # Fetch complete book metadata and download URLs
            book_data = await book_aggregator.internet_archive.get_book(source_id)
        elif source == "openlibrary":
            # Fetch complete book metadata from Open Library
            book_data = await book_aggregator.openlibrary.get_book(source_id)
        elif source == "google_books":
            # Fetch from Google Books API
            book_data = await book_aggregator.google_books.get_volume(source_id)
        else:
            raise HTTPException(status_code=400, detail="Unknown source")
        
        # Cache the result
        if book_data:
            await cache_external_book(db, book_data)
        
        return book_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch book: {str(e)}")


async def enrich_metadata(book_data: dict):
    """Enrich book metadata using Google Books API"""
    try:
        # Search Google Books by title and author
        query = book_data.get("title", "")
        if book_data.get("author"):
            query += f" {book_data['author']}"
        
        gb_results = await book_aggregator.google_books.search(query, limit=1)
        if gb_results and len(gb_results) > 0:
            gb_book = gb_results[0]
            # Fill in missing fields
            if not book_data.get("description"):
                book_data["description"] = gb_book.get("description", "")
            if not book_data.get("isbn"):
                book_data["isbn"] = gb_book.get("isbn")
            if not book_data.get("publisher"):
                book_data["publisher"] = gb_book.get("publisher", "")
            if not book_data.get("publish_date"):
                book_data["publish_date"] = gb_book.get("publish_date", "")
    except Exception as e:
        print(f"Metadata enrichment error: {e}")
        # Don't fail the request if enrichment fails





@router.get("/{source}/{source_id}/read-url")
async def get_read_url(
    source: str,
    source_id: str,
    format: str = Query("epub", description="Preferred format (epub, pdf, txt)")
):
    """Get the URL to read/download a book"""
    try:
        if source == "gutenberg":
            # Gutenberg books are available directly
            book_data = await book_aggregator.gutenberg.get_book(source_id)
            if book_data and "download_urls" in book_data:
                url = book_data["download_urls"].get(format)
                if url:
                    return {"read_url": url, "format": format}
        
        elif source == "internet_archive":
            download_urls = await book_aggregator.internet_archive.get_download_urls(source_id)
            url = download_urls.get(format)
            if url:
                return {"read_url": url, "format": format}
        
        raise HTTPException(status_code=404, detail="Format not available for this book")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get read URL: {str(e)}")


# Helper functions

async def cache_external_book(db: Session, book_data: dict):
    """Cache external book metadata in database"""
    try:
        # Check if already cached
        existing = db.query(ExternalBookCache).filter(
            ExternalBookCache.source == book_data.get("source"),
            ExternalBookCache.source_id == book_data.get("source_id")
        ).first()
        
        if existing:
            # Update cache timestamp
            existing.cached_at = datetime.utcnow()
            db.commit()
            return
        
        # Create new cache entry
        cache_entry = ExternalBookCache(
            source=book_data.get("source"),
            source_id=book_data.get("source_id"),
            isbn=book_data.get("isbn"),
            title=book_data.get("title"),
            author=book_data.get("author"),
            cover_url=book_data.get("cover_url"),
            description=book_data.get("description"),
            subjects=json.dumps(book_data.get("subjects", [])),
            formats_available=json.dumps(book_data.get("formats", [])),
            is_public_domain=book_data.get("is_public_domain", False),
            can_borrow=book_data.get("can_borrow", False),
            cached_at=datetime.utcnow()
        )
        db.add(cache_entry)
        db.commit()
    except Exception as e:
        print(f"Cache error: {e}")
        db.rollback()


def get_cached_book(db: Session, source: str, source_id: str) -> Optional[dict]:
    """Get book from cache if available and not stale"""
    try:
        cache_entry = db.query(ExternalBookCache).filter(
            ExternalBookCache.source == source,
            ExternalBookCache.source_id == source_id
        ).first()
        
        if not cache_entry:
            return None
        
        # Check if cache is stale (older than 24 hours)
        cache_age = datetime.utcnow() - cache_entry.cached_at
        if cache_age > timedelta(hours=24):
            return None
        
        # Return cached data
        return {
            "source": cache_entry.source,
            "source_id": cache_entry.source_id,
            "title": cache_entry.title,
            "author": cache_entry.author,
            "cover_url": cache_entry.cover_url,
            "description": cache_entry.description,
            "is_public_domain": cache_entry.is_public_domain,
            "can_borrow": cache_entry.can_borrow,
            "formats": json.loads(cache_entry.formats_available) if cache_entry.formats_available else [],
        }
    except Exception as e:
        print(f"Cache retrieval error: {e}")
        return None


@router.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    await book_aggregator.close_all()
