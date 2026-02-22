"""
Authentication service for AURA.

Handles user registration and login.

Collections
-----------
users — one document per user account.
        Fields: _id (uuid), email, hashed_password, name, patient_id, created_at

On registration a linked patient document is automatically created so that
session data can be stored against the user from their very first test.
"""

from __future__ import annotations

import uuid
import bcrypt
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.mongodb_atlas_service import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Collection helper
# ---------------------------------------------------------------------------

def _users():
    return get_db()["users"]

def _patients():
    return get_db()["patients"]


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    user_id: str
    patient_id: str
    email: str
    name: str


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    email = body.email.strip().lower()
    name = body.name.strip()

    if not email or not body.password or not name:
        raise HTTPException(status_code=400, detail="Email, password, and name are required.")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Check for duplicate email
    existing = await _users().find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_id = str(uuid.uuid4())
    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Create user account
    await _users().insert_one({
        "_id": user_id,
        "email": email,
        "hashed_password": _hash_password(body.password),
        "name": name,
        "patient_id": patient_id,
        "created_at": now,
    })

    # Auto-create linked patient document
    await _patients().insert_one({
        "_id": patient_id,
        "name": name,
        "email": email,
        "user_id": user_id,
        "age": None,
        "surgery_type": None,
        "surgery_date": None,
        "medications": [],
        "conditions": [],
        "assigned_physician_id": None,
        "baseline": None,
        "created_at": now,
    })

    return AuthResponse(user_id=user_id, patient_id=patient_id, email=email, name=name)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    email = body.email.strip().lower()

    if not email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = await _users().find_one({"email": email})
    if not user or not _verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(
        user_id=user["_id"],
        patient_id=user["patient_id"],
        email=user["email"],
        name=user["name"],
    )
