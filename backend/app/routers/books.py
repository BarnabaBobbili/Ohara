"""
Books API Router
CRUD endpoints for book management - Using Raw SQL
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.database.sql import get_db
from app.models import schemas
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
    # Build dynamic query
    query_str = "SELECT * FROM books WHERE 1=1"
    params = {}
    
    if category:
        query_str += " AND category = :category"
        params["category"] = category
    
    if search:
        query_str += " AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search)"
        params["search"] = f"%{search}%"
    
    query_str += " LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query_str), params)
    books = result.fetchall()
    
    # Convert to dict for response model
    return [dict(row._mapping) for row in books]


@router.get("/{book_id}", response_model=schemas.Book)
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Get a specific book by ID"""
    result = db.execute(
        text("SELECT * FROM books WHERE id = :book_id"),
        {"book_id": book_id}
    )
    book = result.fetchone()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return dict(book._mapping)


@router.post("/", response_model=schemas.Book, status_code=status.HTTP_201_CREATED)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    """Create a new book"""
    from app.database.mongodb import get_activity_logs_collection
    
    # Check if ISBN already exists
    result = db.execute(
        text("SELECT id FROM books WHERE isbn = :isbn"),
        {"isbn": book.isbn}
    )
    existing = result.fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
    
    # Create new book
    insert_query = text("""
        INSERT INTO books (
            isbn, title, author, publisher, publication_year, category, 
            language, pages, description, cover_image_url, total_copies, 
            available_copies, location, created_at, updated_at
        ) VALUES (
            :isbn, :title, :author, :publisher, :publication_year, :category,
            :language, :pages, :description, :cover_image_url, :total_copies,
            :available_copies, :location, :created_at, :updated_at
        )
    """)
    
    now = datetime.utcnow()
    params = {
        "isbn": book.isbn,
        "title": book.title,
        "author": book.author,
        "publisher": book.publisher,
        "publication_year": book.publication_year,
        "category": book.category,
        "language": book.language or "English",
        "pages": book.pages,
        "description": book.description,
        "cover_image_url": book.cover_image_url,
        "total_copies": book.total_copies,
        "available_copies": book.total_copies,
        "location": book.location,
        "created_at": now,
        "updated_at": now
    }
    
    db.execute(insert_query, params)
    db.commit()
    
    # Get the inserted book
    result = db.execute(
        text("SELECT * FROM books WHERE isbn = :isbn"),
        {"isbn": book.isbn}
    )
    db_book = result.fetchone()
    book_dict = dict(db_book._mapping)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "book_added",
                "book_id": book_dict["id"],
                "book_title": book_dict["title"],
                "book_author": book_dict["author"],
                "isbn": book_dict["isbn"],
                "timestamp": datetime.utcnow()
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return book_dict


@router.put("/{book_id}", response_model=schemas.Book)
def update_book(book_id: int, book: schemas.BookUpdate, db: Session = Depends(get_db)):
    """Update a book"""
    from app.database.mongodb import get_activity_logs_collection
    
    # Check if book exists
    result = db.execute(
        text("SELECT * FROM books WHERE id = :book_id"),
        {"book_id": book_id}
    )
    db_book = result.fetchone()
    
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Build dynamic update query
    update_data = book.dict(exclude_unset=True)
    if not update_data:
        return dict(db_book._mapping)
    
    set_clauses = []
    params = {"book_id": book_id, "updated_at": datetime.utcnow()}
    
    for field, value in update_data.items():
        set_clauses.append(f"{field} = :{field}")
        params[field] = value
    
    set_clauses.append("updated_at = :updated_at")
    
    update_query = text(f"UPDATE books SET {', '.join(set_clauses)} WHERE id = :book_id")
    db.execute(update_query, params)
    db.commit()
    
    # Get updated book
    result = db.execute(
        text("SELECT * FROM books WHERE id = :book_id"),
        {"book_id": book_id}
    )
    updated_book = result.fetchone()
    book_dict = dict(updated_book._mapping)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "book_updated",
                "book_id": book_dict["id"],
                "book_title": book_dict["title"],
                "timestamp": datetime.utcnow()
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return book_dict


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Delete a book"""
    from app.database.mongodb import get_activity_logs_collection
    
    # Check if book exists
    result = db.execute(
        text("SELECT * FROM books WHERE id = :book_id"),
        {"book_id": book_id}
    )
    db_book = result.fetchone()
    
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check if book has active transactions
    result = db.execute(
        text("""
            SELECT id FROM transactions 
            WHERE book_id = :book_id AND status = 'checked_out'
            LIMIT 1
        """),
        {"book_id": book_id}
    )
    active_transactions = result.fetchone()
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete book with active checkouts")
    
    book_title = db_book.title  # Save for logging
    
    # Delete the book
    db.execute(
        text("DELETE FROM books WHERE id = :book_id"),
        {"book_id": book_id}
    )
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
    result = db.execute(
        text("SELECT * FROM books WHERE isbn = :isbn"),
        {"isbn": isbn}
    )
    book = result.fetchone()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return dict(book._mapping)
