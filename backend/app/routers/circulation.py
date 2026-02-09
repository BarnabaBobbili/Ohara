"""
Circulation API Router
Book checkout and return operations - Using Raw SQL
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.database.sql import get_db
from app.database.mongodb import get_activity_logs_collection
from app.models import schemas
from datetime import datetime, timedelta

router = APIRouter(prefix="/circulation", tags=["circulation"])


@router.post("/checkout", response_model=schemas.Transaction)
def checkout_book(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db)
):
    """Checkout a book to a member"""
    # Verify book exists and is available
    result = db.execute(
        text("SELECT * FROM books WHERE id = :book_id"),
        {"book_id": transaction.book_id}
    )
    book = result.fetchone()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies available")
    
    # Verify member exists and is active
    result = db.execute(
        text("SELECT * FROM members WHERE id = :member_id"),
        {"member_id": transaction.member_id}
    )
    member = result.fetchone()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.status != "active":
        raise HTTPException(status_code=400, detail="Member is not active")
    
    # Check if member has overdue books
    result = db.execute(
        text("""
            SELECT id FROM transactions 
            WHERE member_id = :member_id AND status = 'overdue'
            LIMIT 1
        """),
        {"member_id": transaction.member_id}
    )
    overdue = result.fetchone()
    
    if overdue:
        raise HTTPException(status_code=400, detail="Member has overdue books")
    
    # Create transaction
    insert_query = text("""
        INSERT INTO transactions (
            book_id, member_id, staff_id, checkout_date, due_date, return_date,
            status, checkout_condition, return_condition, fine_amount, fine_paid, notes
        ) VALUES (
            :book_id, :member_id, :staff_id, :checkout_date, :due_date, :return_date,
            :status, :checkout_condition, :return_condition, :fine_amount, :fine_paid, :notes
        )
    """)
    
    params = {
        "book_id": transaction.book_id,
        "member_id": transaction.member_id,
        "staff_id": transaction.staff_id if hasattr(transaction, 'staff_id') else None,
        "checkout_date": transaction.checkout_date if hasattr(transaction, 'checkout_date') else datetime.utcnow(),
        "due_date": transaction.due_date,
        "return_date": None,
        "status": "checked_out",
        "checkout_condition": transaction.checkout_condition if hasattr(transaction, 'checkout_condition') else "good",
        "return_condition": None,
        "fine_amount": 0.0,
        "fine_paid": False,
        "notes": None
    }
    
    db.execute(insert_query, params)
    
    # Update book availability
    db.execute(
        text("UPDATE books SET available_copies = available_copies - 1 WHERE id = :book_id"),
        {"book_id": transaction.book_id}
    )
    
    # Update member last visit
    db.execute(
        text("UPDATE members SET last_visit = :last_visit WHERE id = :member_id"),
        {"member_id": transaction.member_id, "last_visit": datetime.utcnow()}
    )
    
    db.commit()
    
    # Get the created transaction
    result = db.execute(
        text("""
            SELECT * FROM transactions 
            WHERE book_id = :book_id AND member_id = :member_id 
            ORDER BY checkout_date DESC LIMIT 1
        """),
        {"book_id": transaction.book_id, "member_id": transaction.member_id}
    )
    db_transaction = result.fetchone()
    transaction_dict = dict(db_transaction._mapping)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "checkout",
                "book_id": book.id,
                "book_title": book.title,
                "member_id": member.id,
                "member_name": member.name,
                "timestamp": datetime.utcnow(),
                "transaction_id": transaction_dict["id"]
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return transaction_dict


@router.post("/checkin/{transaction_id}", response_model=schemas.Transaction)
def checkin_book(
    transaction_id: int,
    return_data: schemas.TransactionReturn,
    db: Session = Depends(get_db)
):
    """Return a checked-out book"""
    # Get transaction
    result = db.execute(
        text("SELECT * FROM transactions WHERE id = :transaction_id"),
        {"transaction_id": transaction_id}
    )
    transaction = result.fetchone()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status == "returned":
        raise HTTPException(status_code=400, detail="Book already returned")
    
    # Calculate fine if overdue
    return_date = datetime.utcnow()
    fine_amount = 0.0
    
    if return_date > transaction.due_date:
        days_overdue = (return_date - transaction.due_date).days
        fine_per_day = 10.0  # ₹10 per day
        fine_amount = days_overdue * fine_per_day
        
        # Add to member's total fines
        db.execute(
            text("UPDATE members SET fines = fines + :fine_amount WHERE id = :member_id"),
            {"fine_amount": fine_amount, "member_id": transaction.member_id}
        )
    
    # Update transaction
    update_query = text("""
        UPDATE transactions 
        SET return_date = :return_date, 
            return_condition = :return_condition,
            status = 'returned',
            fine_amount = :fine_amount,
            notes = :notes
        WHERE id = :transaction_id
    """)
    
    db.execute(update_query, {
        "return_date": return_date,
        "return_condition": return_data.return_condition,
        "fine_amount": fine_amount,
        "notes": return_data.notes if hasattr(return_data, 'notes') and return_data.notes else transaction.notes,
        "transaction_id": transaction_id
    })
    
    # Update book availability
    db.execute(
        text("UPDATE books SET available_copies = available_copies + 1 WHERE id = :book_id"),
        {"book_id": transaction.book_id}
    )
    
    db.commit()
    
    # Get updated transaction
    result = db.execute(
        text("SELECT * FROM transactions WHERE id = :transaction_id"),
        {"transaction_id": transaction_id}
    )
    updated_transaction = result.fetchone()
    transaction_dict = dict(updated_transaction._mapping)
    
    # Get book info for logging
    result = db.execute(
        text("SELECT title FROM books WHERE id = :book_id"),
        {"book_id": transaction.book_id}
    )
    book = result.fetchone()
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "checkin",
                "book_id": transaction.book_id,
                "book_title": book.title if book else "Unknown",
                "member_id": transaction.member_id,
                "timestamp": datetime.utcnow(),
                "transaction_id": transaction_id,
                "fine": fine_amount
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return transaction_dict


@router.get("/active", response_model=List[schemas.Transaction])
def get_active_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all active (checked out) transactions"""
    result = db.execute(
        text("""
            SELECT * FROM transactions 
            WHERE status IN ('checked_out', 'overdue')
            LIMIT :limit OFFSET :skip
        """),
        {"limit": limit, "skip": skip}
    )
    transactions = result.fetchall()
    
    return [dict(row._mapping) for row in transactions]


@router.get("/overdue", response_model=List[schemas.Transaction])
def get_overdue_transactions(db: Session = Depends(get_db)):
    """Get all overdue transactions"""
    # Update overdue status
    now = datetime.utcnow()
    db.execute(
        text("""
            UPDATE transactions 
            SET status = 'overdue' 
            WHERE status = 'checked_out' AND due_date < :now
        """),
        {"now": now}
    )
    db.commit()
    
    # Get overdue transactions
    result = db.execute(
        text("SELECT * FROM transactions WHERE status = 'overdue'")
    )
    transactions = result.fetchall()
    
    return [dict(row._mapping) for row in transactions]


@router.get("/member/{member_id}", response_model=List[schemas.Transaction])
def get_member_transactions(member_id: int, db: Session = Depends(get_db)):
    """Get transaction history for a member"""
    result = db.execute(
        text("""
            SELECT * FROM transactions 
            WHERE member_id = :member_id 
            ORDER BY checkout_date DESC
        """),
        {"member_id": member_id}
    )
    transactions = result.fetchall()
    
    return [dict(row._mapping) for row in transactions]
