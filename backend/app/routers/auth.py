"""
Authentication Router
Handles user registration, login, and authentication - Using Raw SQL
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.database.sql import get_db
from app.models import sql_models, schemas
from app.services.auth_utils import hash_password, verify_password, create_access_token, decode_access_token
from datetime import datetime
import secrets
import string

router = APIRouter(prefix="/auth", tags=["Authentication"])


def generate_card_id() -> str:
    """Generate a unique library card ID"""
    # Format: LC-XXXXXX (e.g., LC-A1B2C3)
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"LC-{random_part}"


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> dict:
    """Dependency to get current authenticated user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Get user from database
    result = db.execute(
        text("SELECT * FROM members WHERE id = :user_id"),
        {"user_id": int(user_id)}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return dict(user._mapping)


@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserSignup, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if email already exists
    result = db.execute(
        text("SELECT id FROM members WHERE email = :email"),
        {"email": user_data.email}
    )
    existing_user = result.fetchone()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
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
    
    # Hash password
    password_hash_value = hash_password(user_data.password)
    
    # Create new member
    insert_query = text("""
        INSERT INTO members (
            card_id, name, email, phone, address, member_type,
            password_hash, status, fines, joined_date
        ) VALUES (
            :card_id, :name, :email, :phone, :address, :member_type,
            :password_hash, :status, :fines, :joined_date
        )
    """)
    
    db.execute(insert_query, {
        "card_id": card_id,
        "name": user_data.name,
        "email": user_data.email,
        "phone": user_data.phone,
        "address": user_data.address,
        "member_type": user_data.member_type,
        "password_hash": password_hash_value,
        "status": "active",
        "fines": 0.0,
        "joined_date": datetime.utcnow()
    })
    db.commit()
    
    # Get the created member
    result = db.execute(
        text("SELECT * FROM members WHERE card_id = :card_id"),
        {"card_id": card_id}
    )
    new_member = result.fetchone()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(new_member.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    
    # Find user by email
    result = db.execute(
        text("SELECT * FROM members WHERE email = :email"),
        {"email": credentials.email}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not user.password_hash or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    # Update last visit
    db.execute(
        text("UPDATE members SET last_visit = :last_visit WHERE id = :user_id"),
        {"last_visit": datetime.utcnow(), "user_id": user.id}
    )
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's information"""
    return current_user
