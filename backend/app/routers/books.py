"""
Books API Router
CRUD endpoints for book management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.sql import get_db
from app.models import sql_models, schemas
from datetime import datetime

router = APIRouter(prefix="/books", tags=["books"])


@router.get("/", response_model=List[schemas.Book])
def get_books(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all books with optional filtering"""
    query = db.query(sql_models.Book)
    
    if category:
        query = query.filter(sql_models.Book.category == category)
    
    if search:
        query = query.filter(
            (sql_models.Book.title.contains(search)) |
            (sql_models.Book.author.contains(search)) |
            (sql_models.Book.isbn.contains(search))
        )
    
    books = query.offset(skip).limit(limit).all()
    return books


@router.get("/{book_id}", response_model=schemas.Book)
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Get a specific book by ID"""
    book = db.query(sql_models.Book).filter(sql_models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/", response_model=schemas.Book, status_code=status.HTTP_201_CREATED)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    """Create a new book"""
    from app.database.mongodb import get_activity_logs_collection
    
    # Check if ISBN already exists
    existing = db.query(sql_models.Book).filter(sql_models.Book.isbn == book.isbn).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
    
    # Create new book
    db_book = sql_models.Book(**book.dict(), available_copies=book.total_copies)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "book_added",
                "book_id": db_book.id,
                "book_title": db_book.title,
                "book_author": db_book.author,
                "isbn": db_book.isbn,
                "timestamp": datetime.utcnow()
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return db_book


@router.put("/{book_id}", response_model=schemas.Book)
def update_book(book_id: int, book: schemas.BookUpdate, db: Session = Depends(get_db)):
    """Update a book"""
    from app.database.mongodb import get_activity_logs_collection
    
    db_book = db.query(sql_models.Book).filter(sql_models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Update fields
    update_data = book.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_book, field, value)
    
    db.commit()
    db.refresh(db_book)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "book_updated",
                "book_id": db_book.id,
                "book_title": db_book.title,
                "timestamp": datetime.utcnow()
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return db_book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Delete a book"""
    from app.database.mongodb import get_activity_logs_collection
    
    db_book = db.query(sql_models.Book).filter(sql_models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check if book has active transactions
    active_transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.book_id == book_id,
        sql_models.Transaction.status == "checked_out"
    ).first()
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete book with active checkouts")
    
    book_title = db_book.title  # Save for logging
    
    db.delete(db_book)
    db.commit()
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "book_deleted",
                "book_id": book_id,
                "book_title": book_title,
                "timestamp": datetime.utcnow()
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return None


@router.get("/isbn/{isbn}", response_model=schemas.Book)
def get_book_by_isbn(isbn: str, db: Session = Depends(get_db)):
    """Get book by ISBN"""
    book = db.query(sql_models.Book).filter(sql_models.Book.isbn == isbn).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
