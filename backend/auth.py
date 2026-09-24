import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from backend.database import get_db
from backend.models import User, UserRole, UserStatus

import secrets

load_dotenv()

_env_secret = os.getenv("SECRET_KEY")
if not _env_secret or _env_secret == "super-secret-jwt-key-change-in-production-2026":
    # Generate cryptographically secure random key if none specified
    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
else:
    SECRET_KEY = _env_secret

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    pwd_context = None

# Password Hashing Utilities (bcrypt/PBKDF2 with legacy fallback support)
def hash_password(password: str) -> str:
    if pwd_context is not None:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    # Cryptographically secure PBKDF2-SHA256 with random per-password salt
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    
    # 1. Check passlib / bcrypt
    if pwd_context is not None and (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$")):
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass

    # 2. Check PBKDF2-SHA256 format
    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed_password.split("$")
            if len(parts) == 3:
                rounds = int(parts[0].split(":")[2])
                salt = parts[1]
                expected_key = parts[2]
                computed = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), rounds).hex()
                return hmac.compare_digest(computed, expected_key)
        except Exception:
            pass

    # 3. Legacy HMAC fallback for existing development DBs
    salt = "volunteer_system_salt_2026"
    legacy_hash = hmac.new(salt.encode('utf-8'), plain_password.encode('utf-8'), hashlib.sha256).hexdigest()
    return hmac.compare_digest(legacy_hash, hashed_password)

# Token Utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        print(f"[AUTH ERROR] JWT Decode Failed: {type(e).__name__} - {e}")
        return None

# Dependency: Get Current User
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    sub = payload.get("sub")
    if sub is None:
        raise credentials_exception
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Dependency: Get Current Admin
def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privilege required."
        )
    return current_user

# Dependency: Get Approved User (Volunteer or Admin)
def get_current_approved_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.status != UserStatus.APPROVED.value and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending admin approval."
        )
    return current_user
