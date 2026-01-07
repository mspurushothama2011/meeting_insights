"""Authentication utilities for password hashing and JWT token management."""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict

import jwt
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
REFRESH_SECRET_KEY = os.getenv('REFRESH_SECRET_KEY', 'your-refresh-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Long-lived refresh tokens


# ============= Password Hashing =============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    # Convert password to bytes and hash
    # Using 10 rounds instead of default 12 for better performance
    # while still maintaining strong security (2^10 = 1024 iterations)
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


# ============= JWT Token Management =============

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.
    
    Args:
        data: Dictionary containing user data (user_id, email, role, etc.)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'access'  # Token type identifier
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict) -> str:
    """Create a JWT refresh token.
    
    Args:
        data: Dictionary containing minimal user data (user_id only)
        
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'refresh'  # Token type identifier
    })
    
    # Use separate secret key for refresh tokens for added security
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict]:
    """Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary containing token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Verify this is an access token
        if payload.get('type') != 'access':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token


def decode_refresh_token(token: str) -> Optional[Dict]:
    """Decode and verify a JWT refresh token.
    
    Args:
        token: JWT refresh token string
        
    Returns:
        Dictionary containing token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        # Verify this is a refresh token
        if payload.get('type') != 'refresh':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token


def get_user_from_token(token: str) -> Optional[int]:
    """Extract user ID from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID if token is valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get('user_id')
    return None
