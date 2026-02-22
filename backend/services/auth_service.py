"""
Authentication service for AURA.

Handles user registration and login.

Collections
-----------
users — one document per user account.
        Fields: _id (uuid), email, hashed_password, name, patient_id,
                baseline, created_at

The users collection is the single source of truth for patient identity.
No separate patients collection is used.
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


class WhoAmIResponse(BaseModel):
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

    # Create user account (also serves as the patient record)
    await _users().insert_one({
        "_id": user_id,
        "email": email,
        "hashed_password": _hash_password(body.password),
        "name": name,
        "patient_id": patient_id,
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


@router.get("/whoami", response_model=WhoAmIResponse)
async def whoami(user_id: str):
    uid = user_id.strip()
    if not uid:
        raise HTTPException(status_code=400, detail="user_id is required.")

    user = await _users().find_one({"_id": uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return WhoAmIResponse(
        user_id=user["_id"],
        patient_id=user["patient_id"],
        email=user["email"],
        name=user["name"],
    )
