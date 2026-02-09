"""
User Library API Router
Handles user book uploads and personal library management
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.sql import get_db
from app.models import schemas, sql_models
from datetime import datetime
import os
import aiofiles
import magic
from pathlib import Path
import ebooklib
from ebooklib import epub

router = APIRouter(prefix="/user-library", tags=["user-library"])

# Configuration
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "./uploads/user_books")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# Ensure upload directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.UploadedBook, status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    author: Optional[str] = Form(None),
    member_id: int = Form(...),  # TODO: Get from auth token in production
    db: Session = Depends(get_db)
):
    """Upload a user's personal book (EPUB or PDF)"""
    
    # Validate file size
    file_size = 0
    content = await file.read()
    file_size = len(content)
    await file.seek(0)  # Reset file pointer
    
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Validate file type
    file_format = detect_file_format(content)
    if file_format not in ["epub", "pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only EPUB and PDF files are supported"
        )
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{member_id}_{timestamp}.{file_format}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)
    
    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Extract metadata if EPUB
    if file_format == "epub" and not title:
        try:
            extracted_title, extracted_author = extract_epub_metadata(file_path)
            title = title or extracted_title
            author = author or extracted_author
        except:
            pass  # Use provided metadata if extraction fails
    
    # Create database record
    uploaded_book = sql_models.UserUploadedBook(
        member_id=member_id,
        title=title,
        author=author,
        file_path=file_path,
        file_format=file_format,
        file_size=file_size,
        uploaded_at=datetime.utcnow()
    )
    
    db.add(uploaded_book)
    db.commit()
    db.refresh(uploaded_book)
    
    return uploaded_book


@router.get("/books", response_model=List[schemas.UploadedBook])
def get_user_books(
    member_id: int,  # TODO: Get from auth token
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of user's uploaded books"""
    books = db.query(sql_models.UserUploadedBook).filter(
        sql_models.UserUploadedBook.member_id == member_id
    ).offset(skip).limit(limit).all()
    
    return books


@router.get("/books/{book_id}", response_model=schemas.UploadedBook)
def get_uploaded_book(
    book_id: int,
    member_id: int,  # TODO: Get from auth token
    db: Session = Depends(get_db)
):
    """Get details of a specific uploaded book"""
    book = db.query(sql_models.UserUploadedBook).filter(
        sql_models.UserUploadedBook.id == book_id,
        sql_models.UserUploadedBook.member_id == member_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return book


@router.get("/books/{book_id}/read")
async def read_uploaded_book(
    book_id: int,
    member_id: int,  # TODO: Get from auth token
    db: Session = Depends(get_db)
):
    """Stream uploaded book for reading"""
    book = db.query(sql_models.UserUploadedBook).filter(
        sql_models.UserUploadedBook.id == book_id,
        sql_models.UserUploadedBook.member_id == member_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="Book file not found")
    
    # Return file for streaming
    media_type = "application/epub+zip" if book.file_format == "epub" else "application/pdf"
    return FileResponse(
        book.file_path,
        media_type=media_type,
        filename=f"{book.title}.{book.file_format}"
    )


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_uploaded_book(
    book_id: int,
    member_id: int,  # TODO: Get from auth token
    db: Session = Depends(get_db)
):
    """Delete an uploaded book"""
    book = db.query(sql_models.UserUploadedBook).filter(
        sql_models.UserUploadedBook.id == book_id,
        sql_models.UserUploadedBook.member_id == member_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete file
    try:
        if os.path.exists(book.file_path):
            os.remove(book.file_path)
    except Exception as e:
        print(f"Failed to delete file: {e}")
    
    # Delete database record
    db.delete(book)
    db.commit()
    
    return None


# Reading Progress Endpoints

@router.get("/progress/{book_id}", response_model=schemas.ReadingProgress)
def get_reading_progress(
    book_id: str,
    book_type: str,
    member_id: int,  # TODO: Get from auth token
    db: Session = Depends(get_db)
):
    """Get reading progress for a book"""
    progress = db.query(sql_models.ReadingProgress).filter(
        sql_models.ReadingProgress.member_id == member_id,
        sql_models.ReadingProgress.book_id == book_id,
        sql_models.ReadingProgress.book_type == book_type
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="No progress found")
    
    return progress


@router.post("/progress/{book_id}", response_model=schemas.ReadingProgress)
def update_reading_progress(
    book_id: str,
    book_type: str,
    progress_data: schemas.ReadingProgressUpdate,
    member_id: int,  # TODO: Get from auth token
    db: Session = Depends(get_db)
):
    """Update or create reading progress"""
    # Check for existing progress
    progress = db.query(sql_models.ReadingProgress).filter(
        sql_models.ReadingProgress.member_id == member_id,
        sql_models.ReadingProgress.book_id == book_id,
        sql_models.ReadingProgress.book_type == book_type
    ).first()
    
    if progress:
        # Update existing
        progress.current_location = progress_data.current_location
        progress.progress_percent = progress_data.progress_percent
        progress.last_read_at = datetime.utcnow()
    else:
        # Create new
        progress = sql_models.ReadingProgress(
            member_id=member_id,
            book_type=book_type,
            book_id=book_id,
            current_location=progress_data.current_location,
            progress_percent=progress_data.progress_percent,
            last_read_at=datetime.utcnow()
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    
    return progress


# Helper functions

def detect_file_format(content: bytes) -> str:
    """Detect file format from content"""
    mime = magic.Magic(mime=True)
    mime_type = mime.from_buffer(content)
    
    if mime_type == "application/epub+zip":
        return "epub"
    elif mime_type == "application/pdf":
        return "pdf"
    else:
        # Try file extension detection
        if content[:4] == b'PK\x03\x04':  # ZIP header (EPUB)
            return "epub"
        elif content[:4] == b'%PDF':  # PDF header
            return "pdf"
    
    return "unknown"


def extract_epub_metadata(file_path: str) -> tuple:
    """Extract title and author from EPUB file"""
    try:
        book = epub.read_epub(file_path)
        title = book.get_metadata('DC', 'title')
        author = book.get_metadata('DC', 'creator')
        
        title_str = title[0][0] if title else "Unknown"
        author_str = author[0][0] if author else "Unknown"
        
        return title_str, author_str
    except:
        return "Unknown", "Unknown"
