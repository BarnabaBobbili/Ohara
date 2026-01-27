"""
Members API Router
CRUD endpoints for member management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.sql import get_db
from app.models import sql_models, schemas
from datetime import datetime, timedelta
import random
import string

router = APIRouter(prefix="/members", tags=["members"])


def generate_card_id():
    """Generate unique library card ID"""
    return f"LIB-{''.join(random.choices(string.digits, k=8))}"


@router.get("/", response_model=List[schemas.Member])
def get_members(
    skip: int = 0,
    limit: int = 100,
    member_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all members with optional filtering"""
    query = db.query(sql_models.Member)
    
    if member_type:
        query = query.filter(sql_models.Member.member_type == member_type)
    
    if status:
        query = query.filter(sql_models.Member.status == status)
    
    if search:
        query = query.filter(
            (sql_models.Member.name.contains(search)) |
            (sql_models.Member.email.contains(search)) |
            (sql_models.Member.card_id.contains(search))
        )
    
    members = query.offset(skip).limit(limit).all()
    return members


@router.get("/{member_id}", response_model=schemas.Member)
def get_member(member_id: int, db: Session = Depends(get_db)):
    """Get a specific member by ID"""
    member = db.query(sql_models.Member).filter(sql_models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.post("/", response_model=schemas.Member, status_code=status.HTTP_201_CREATED)
def create_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    """Create a new member"""
    # Check if email already exists
    existing = db.query(sql_models.Member).filter(sql_models.Member.email == member.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member with this email already exists")
    
    # Generate unique card ID
    card_id = generate_card_id()
    while db.query(sql_models.Member).filter(sql_models.Member.card_id == card_id).first():
        card_id = generate_card_id()
    
    # Set expiry date (1 year from now)
    expiry_date = datetime.utcnow() + timedelta(days=365)
    
    # Create new member
    db_member = sql_models.Member(
        **member.dict(),
        card_id=card_id,
        expiry_date=expiry_date
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member


@router.put("/{member_id}", response_model=schemas.Member)
def update_member(member_id: int, member: schemas.MemberUpdate, db: Session = Depends(get_db)):
    """Update a member"""
    db_member = db.query(sql_models.Member).filter(sql_models.Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Update fields
    update_data = member.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_member, field, value)
    
    db.commit()
    db.refresh(db_member)
    return db_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    """Delete a member"""
    db_member = db.query(sql_models.Member).filter(sql_models.Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if member has active transactions
    active_transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.member_id == member_id,
        sql_models.Transaction.status == "checked_out"
    ).first()
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete member with active checkouts")
    
    # Check if member has unpaid fines
    if db_member.fines > 0:
        raise HTTPException(status_code=400, detail="Cannot delete member with unpaid fines")
    
    db.delete(db_member)
    db.commit()
    return None


@router.get("/card/{card_id}", response_model=schemas.Member)
def get_member_by_card(card_id: str, db: Session = Depends(get_db)):
    """Get member by card ID"""
    member = db.query(sql_models.Member).filter(sql_models.Member.card_id == card_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member
