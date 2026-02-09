"""
Members API Router
CRUD endpoints for member management - Using Raw SQL
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.database.sql import get_db
from app.models import schemas
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
    query_str = "SELECT * FROM members WHERE 1=1"
    params = {}
    
    if member_type:
        query_str += " AND member_type = :member_type"
        params["member_type"] = member_type
    
    if status:
        query_str += " AND status = :status"
        params["status"] = status
    
    if search:
        query_str += " AND (name LIKE :search OR email LIKE :search OR card_id LIKE :search)"
        params["search"] = f"%{search}%"
    
    query_str += " LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query_str), params)
    members = result.fetchall()
    
    return [dict(row._mapping) for row in members]


@router.get("/{member_id}", response_model=schemas.Member)
def get_member(member_id: int, db: Session = Depends(get_db)):
    """Get a specific member by ID"""
    result = db.execute(
        text("SELECT * FROM members WHERE id = :member_id"),
        {"member_id": member_id}
    )
    member = result.fetchone()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return dict(member._mapping)


@router.post("/", response_model=schemas.Member, status_code=status.HTTP_201_CREATED)
def create_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    """Create a new member"""
    # Check if email already exists
    result = db.execute(
        text("SELECT id FROM members WHERE email = :email"),
        {"email": member.email}
    )
    existing = result.fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Member with this email already exists")
    
    # Generate unique card ID
    card_id = generate_card_id()
    result = db.execute(
        text("SELECT id FROM members WHERE card_id = :card_id"),
        {"card_id": card_id}
    )
    while result.fetchone():
        card_id = generate_card_id()
        result = db.execute(
            text("SELECT id FROM members WHERE card_id = :card_id"),
            {"card_id": card_id}
        )
    
    # Set expiry date (1 year from now)
    expiry_date = datetime.utcnow() + timedelta(days=365)
    
    # Create new member
    insert_query = text("""
        INSERT INTO members (
            card_id, name, email, phone, address, password_hash,
            member_type, status, fines, joined_date, expiry_date, last_visit
        ) VALUES (
            :card_id, :name, :email, :phone, :address, :password_hash,
            :member_type, :status, :fines, :joined_date, :expiry_date, :last_visit
        )
    """)
    
    params = {
        "card_id": card_id,
        "name": member.name,
        "email": member.email,
        "phone": member.phone,
        "address": member.address,
        "password_hash": member.password_hash if hasattr(member, 'password_hash') else None,
        "member_type": member.member_type,
        "status": "active",
        "fines": 0.0,
        "joined_date": datetime.utcnow(),
        "expiry_date": expiry_date,
        "last_visit": None
    }
    
    db.execute(insert_query, params)
    db.commit()
    
    # Get the inserted member
    result = db.execute(
        text("SELECT * FROM members WHERE card_id = :card_id"),
        {"card_id": card_id}
    )
    db_member = result.fetchone()
    
    return dict(db_member._mapping)


@router.put("/{member_id}", response_model=schemas.Member)
def update_member(member_id: int, member: schemas.MemberUpdate, db: Session = Depends(get_db)):
    """Update a member"""
    # Check if member exists
    result = db.execute(
        text("SELECT * FROM members WHERE id = :member_id"),
        {"member_id": member_id}
    )
    db_member = result.fetchone()
    
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Build dynamic update query
    update_data = member.dict(exclude_unset=True)
    if not update_data:
        return dict(db_member._mapping)
    
    set_clauses = []
    params = {"member_id": member_id}
    
    for field, value in update_data.items():
        set_clauses.append(f"{field} = :{field}")
        params[field] = value
    
    update_query = text(f"UPDATE members SET {', '.join(set_clauses)} WHERE id = :member_id")
    db.execute(update_query, params)
    db.commit()
    
    # Get updated member
    result = db.execute(
        text("SELECT * FROM members WHERE id = :member_id"),
        {"member_id": member_id}
    )
    updated_member = result.fetchone()
    
    return dict(updated_member._mapping)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    """Delete a member"""
    # Check if member exists
    result = db.execute(
        text("SELECT * FROM members WHERE id = :member_id"),
        {"member_id": member_id}
    )
    db_member = result.fetchone()
    
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if member has active transactions
    result = db.execute(
        text("""
            SELECT id FROM transactions 
            WHERE member_id = :member_id AND status = 'checked_out'
            LIMIT 1
        """),
        {"member_id": member_id}
    )
    active_transactions = result.fetchone()
    
    if active_transactions:
        raise HTTPException(status_code=400, detail="Cannot delete member with active checkouts")
    
    # Check if member has unpaid fines
    if db_member.fines > 0:
        raise HTTPException(status_code=400, detail="Cannot delete member with unpaid fines")
    
    # Delete the member
    db.execute(
        text("DELETE FROM members WHERE id = :member_id"),
        {"member_id": member_id}
    )
    db.commit()
    
    return None


@router.get("/card/{card_id}", response_model=schemas.Member)
def get_member_by_card(card_id: str, db: Session = Depends(get_db)):
    """Get member by card ID"""
    result = db.execute(
        text("SELECT * FROM members WHERE card_id = :card_id"),
        {"card_id": card_id}
    )
    member = result.fetchone()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return dict(member._mapping)
