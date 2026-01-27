"""
Circulation API Router
Book checkout and return operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.sql import get_db
from app.database.mongodb import get_activity_logs_collection
from app.models import sql_models, schemas
from datetime import datetime, timedelta

router = APIRouter(prefix="/circulation", tags=["circulation"])


@router.post("/checkout", response_model=schemas.Transaction)
def checkout_book(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db)
):
    """Checkout a book to a member"""
    # Verify book exists and is available
    book = db.query(sql_models.Book).filter(sql_models.Book.id == transaction.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies available")
    
    # Verify member exists and is active
    member = db.query(sql_models.Member).filter(sql_models.Member.id == transaction.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.status != "active":
        raise HTTPException(status_code=400, detail="Member is not active")
    
    # Check if member has overdue books
    overdue = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.member_id == transaction.member_id,
        sql_models.Transaction.status == "overdue"
    ).first()
    
    if overdue:
        raise HTTPException(status_code=400, detail="Member has overdue books")
    
    # Create transaction
    db_transaction = sql_models.Transaction(**transaction.dict())
    
    # Update book availability
    book.available_copies -= 1
    
    # Update member last visit
    member.last_visit = datetime.utcnow()
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
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
                "transaction_id": db_transaction.id
            })
    except Exception as e:
        # Log error but don't fail the transaction
        print(f"MongoDB logging failed: {e}")
    
    return db_transaction


@router.post("/checkin/{transaction_id}", response_model=schemas.Transaction)
def checkin_book(
    transaction_id: int,
    return_data: schemas.TransactionReturn,
    db: Session = Depends(get_db)
):
    """Return a checked-out book"""
    # Get transaction
    transaction = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status == "returned":
        raise HTTPException(status_code=400, detail="Book already returned")
    
    # Update transaction
    transaction.return_date = datetime.utcnow()
    transaction.return_condition = return_data.return_condition
    transaction.status = "returned"
    
    if return_data.notes:
        transaction.notes = return_data.notes
    
    # Calculate fine if overdue
    if transaction.return_date > transaction.due_date:
        days_overdue = (transaction.return_date - transaction.due_date).days
        fine_per_day = 10.0  # ₹10 per day
        transaction.fine_amount = days_overdue * fine_per_day
        
        # Add to member's total fines
        member = db.query(sql_models.Member).filter(
            sql_models.Member.id == transaction.member_id
        ).first()
        member.fines += transaction.fine_amount
    
    # Update book availability
    book = db.query(sql_models.Book).filter(sql_models.Book.id == transaction.book_id).first()
    book.available_copies += 1
    
    db.commit()
    db.refresh(transaction)
    
    # Log to MongoDB
    try:
        logs = get_activity_logs_collection()
        if logs is not None:
            logs.insert_one({
                "action": "checkin",
                "book_id": book.id,
                "book_title": book.title,
                "member_id": transaction.member_id,
                "timestamp": datetime.utcnow(),
                "transaction_id": transaction.id,
                "fine": transaction.fine_amount
            })
    except Exception as e:
        print(f"MongoDB logging failed: {e}")
    
    return transaction


@router.get("/active", response_model=List[schemas.Transaction])
def get_active_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all active (checked out) transactions"""
    transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.status.in_(["checked_out", "overdue"])
    ).offset(skip).limit(limit).all()
    
    return transactions


@router.get("/overdue", response_model=List[schemas.Transaction])
def get_overdue_transactions(db: Session = Depends(get_db)):
    """Get all overdue transactions"""
    # Update overdue status
    now = datetime.utcnow()
    db.query(sql_models.Transaction).filter(
        sql_models.Transaction.status == "checked_out",
        sql_models.Transaction.due_date < now
    ).update({"status": "overdue"})
    db.commit()
    
    transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.status == "overdue"
    ).all()
    
    return transactions


@router.get("/member/{member_id}", response_model=List[schemas.Transaction])
def get_member_transactions(member_id: int, db: Session = Depends(get_db)):
    """Get transaction history for a member"""
    transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.member_id == member_id
    ).order_by(sql_models.Transaction.checkout_date.desc()).all()
    
    return transactions
