from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Response, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import time
import tempfile
import uuid
import os
import traceback
from dotenv import load_dotenv, find_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# load environment variables from .env if present (override any existing env vars)
load_dotenv(find_dotenv(), override=True)

from app.audio_processor import AudioProcessor
from app.speech_to_text import SpeechToText
from app.nlp_analyzer import NLPAnalyzer
from app import db_mongo as db
from app.db_mongo import SupportTicket
from app.config import config
from app.auth import hash_password, verify_password, create_access_token, decode_access_token, create_refresh_token, decode_refresh_token
import re

app = FastAPI(title='IMIP Prototype API')

# ----- Compression Middleware -----
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB

# ----- Rate Limiting Setup -----
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ----- Custom Exception Classes -----
class AppException(Exception):
    """Base exception for application errors."""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(AppException):
    """Validation error exception."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status_code=400, details=details)

class ResourceNotFoundError(AppException):
    """Resource not found exception."""
    def __init__(self, message: str):
        super().__init__(message, status_code=404)

class AuthenticationError(AppException):
    """Authentication error exception."""
    def __init__(self, message: str):
        super().__init__(message, status_code=401)

# ----- Global Exception Handlers -----
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "request_id": request.headers.get('X-Request-ID')
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    _logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Don't expose internal error details in production
    error_detail = "Internal server error"
    if config.DEBUG:
        error_detail = str(exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": error_detail,
            "request_id": request.headers.get('X-Request-ID'),
            "type": type(exc).__name__
        }
    )

# Simple root endpoint to avoid 404 at /
@app.get("/")
async def root():
    return {"message": "IMIP Prototype API", "docs": "/docs"}

# Lightweight healthcheck
@app.get('/health')
async def health():
    """Healthcheck endpoint returning service and DB status."""
    from datetime import datetime
    db_status = 'ok'
    try:
        # lightweight DB operation
        from app import db_mongo as db
        await db.count_meetings(user_id=None)
    except Exception:
        db_status = 'error'
    return {
        'status': 'ok',
        'db': db_status,
        'time': datetime.utcnow().isoformat()
    }

# CORS configuration with environment-based restrictions
if config.DEBUG:
    # Development: More permissive CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
        max_age=600,  # Cache preflight requests for 10 minutes
    )
else:
    # Production: Restrictive CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,  # Should be explicitly set in production
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # No OPTIONS in production
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Type",
            "Authorization",
            "X-Request-ID",
        ],
        expose_headers=["X-Request-ID"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )

audio_processor = AudioProcessor()
# Initialize ASR with VOSK_MODEL_PATH from environment if set
vosk_path = os.environ.get('VOSK_MODEL_PATH')
# Use HF_HOME hub cache directory
hf_cache_dir = os.path.join(config.HF_HOME, 'hub')
asr = SpeechToText(model_name=config.WHISPER_MODEL, vosk_model_path=vosk_path, cache_dir=hf_cache_dir)
nlp = NLPAnalyzer()

# MongoDB initialization happens in startup event (see below)

@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection and pre-load models on startup."""
    # Initialize MongoDB
    await db.init_db()
    
    # Pre-load ASR model to reduce first-request latency
    _logger.info("Pre-loading ASR model...")
    try:
        asr._ensure_model()
        _logger.info(f"✅ ASR model loaded successfully (backend: {asr.backend})")
    except Exception as e:
        _logger.warning(f"⚠️  Failed to pre-load ASR model: {e}")
    
    # Pre-load NLP/OpenAI/Gemini client
    if nlp.openai_client:
        _logger.info(f"✅ OpenAI client initialized (summary: {nlp.openai_summary_model}, action: {nlp.openai_action_model})")
    elif nlp.gemini_client:
        _logger.info(f"✅ Gemini client initialized (model: {nlp.gemini_model})")
    else:
        _logger.warning("⚠️  AI clients not configured - using basic extraction")

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown."""
    await db.close_db()

# Security helper for JWT
security = HTTPBearer()

# ----- Authentication Helper Functions -----

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and verify user from JWT token.
    If Bearer token missing and cookie-auth is enabled, fall back to cookie.
    """
    token = None
    # Prefer Authorization header
    if credentials and credentials.scheme and credentials.credentials:
        token = credentials.credentials
    # Fallback to cookie when enabled
    if not token and config.COOKIE_AUTH_ENABLED:
        token = request.cookies.get('access_token')
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = await db.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    return user

def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# ----- Authentication Routes -----

@app.post('/auth/register')
async def register(email: str = Form(...), password: str = Form(...), full_name: str = Form(...)):
    """Register a new user."""
    # Validate inputs
    if not email or not password or not full_name:
        return JSONResponse({'error': 'All fields are required'}, status_code=400)
    
    if not validate_email(email):
        return JSONResponse({'error': 'Invalid email format'}, status_code=400)
    
    if len(password) < 6:
        return JSONResponse({'error': 'Password must be at least 6 characters'}, status_code=400)
    
    # Check if user already exists
    existing_user = await db.get_user_by_email(email)
    if existing_user:
        return JSONResponse({'error': 'Email already registered'}, status_code=400)
    
    # Hash password and create user
    try:
        password_hash = hash_password(password)
        user_id = await db.create_user(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role='member'
        )
        
        return {
            'success': True,
            'user_id': user_id,
            'email': email,
            'message': 'Registration successful'
        }
    except Exception as e:
        return JSONResponse({'error': f'Registration failed: {str(e)}'}, status_code=500)

async def _perform_login(email: str, password: str, expected_role: Optional[str] = None):
    """Core login logic that can be reused across different login endpoints.
    
    Args:
        email: User email
        password: User password
        expected_role: If provided, validates user has this specific role
        
    Returns:
        dict: Login response with token and user info
        
    Raises:
        HTTPException: For various authentication failures
    """
    if not email or not password:
        raise HTTPException(status_code=400, detail='Email and password required')
    
    # Get user by email
    user = await db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    # Verify password
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=401, detail='Account is inactive')
    
    # If a specific role is expected, validate the user has that role
    if expected_role and user.role != expected_role:
        raise HTTPException(
            status_code=403,
            detail=f'This login portal is for {expected_role}s only. Please use the correct login page.'
        )
    
    # Create JWT tokens
    token_data = {
        'user_id': str(user.id),
        'email': user.email,
        'role': user.role
    }
    access_token = create_access_token(token_data)
    
    # Create refresh token with minimal data
    refresh_token_data = {
        'user_id': str(user.id)
    }
    refresh_token = create_refresh_token(refresh_token_data)
    
    return {
        'success': True,
        'token': access_token,  # For backward compatibility
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role
        }
    }

@app.post('/auth/login')
@limiter.limit(config.RATE_LIMIT_LOGIN)
async def login(request: Request, response: Response, email: str = Form(...), password: str = Form(...)):
    """General login endpoint - accepts any valid user regardless of role."""
    result = await _perform_login(email, password)
    if config.COOKIE_AUTH_ENABLED:
        # Set HttpOnly cookies
        response.set_cookie('access_token', result['access_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
        response.set_cookie('refresh_token', result['refresh_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_REFRESH_MAX_AGE)
        # Simple CSRF double-submit cookie
        import secrets
        csrf = secrets.token_urlsafe(32)
        response.set_cookie('csrf_token', csrf, httponly=False, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
    return result

@app.post('/auth/login/admin')
@limiter.limit(config.RATE_LIMIT_LOGIN_ADMIN)
async def login_admin(request: Request, response: Response, email: str = Form(...), password: str = Form(...)):
    """Admin-specific login endpoint - validates user has 'admin' role."""
    result = await _perform_login(email, password, expected_role='admin')
    if config.COOKIE_AUTH_ENABLED:
        response.set_cookie('access_token', result['access_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
        response.set_cookie('refresh_token', result['refresh_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_REFRESH_MAX_AGE)
        import secrets
        csrf = secrets.token_urlsafe(32)
        response.set_cookie('csrf_token', csrf, httponly=False, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
    return result

@app.post('/auth/login/manager')
@limiter.limit(config.RATE_LIMIT_LOGIN)
async def login_manager(request: Request, response: Response, email: str = Form(...), password: str = Form(...)):
    """Manager-specific login endpoint - validates user has 'manager' role."""
    result = await _perform_login(email, password, expected_role='manager')
    if config.COOKIE_AUTH_ENABLED:
        response.set_cookie('access_token', result['access_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
        response.set_cookie('refresh_token', result['refresh_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_REFRESH_MAX_AGE)
        import secrets
        csrf = secrets.token_urlsafe(32)
        response.set_cookie('csrf_token', csrf, httponly=False, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
    return result

@app.post('/auth/login/member')
@limiter.limit(config.RATE_LIMIT_LOGIN)
async def login_member(request: Request, response: Response, email: str = Form(...), password: str = Form(...)):
    """Member-specific login endpoint - validates user has 'member' role."""
    result = await _perform_login(email, password, expected_role='member')
    if config.COOKIE_AUTH_ENABLED:
        response.set_cookie('access_token', result['access_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
        response.set_cookie('refresh_token', result['refresh_token'], httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_REFRESH_MAX_AGE)
        import secrets
        csrf = secrets.token_urlsafe(32)
        response.set_cookie('csrf_token', csrf, httponly=False, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
    return result

@app.get('/auth/me')
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information from token."""
    return {
        'id': str(current_user.id),
        'email': current_user.email,
        'full_name': current_user.full_name,
        'role': current_user.role,
        'created_at': current_user.created_at.isoformat() if current_user.created_at else None
    }

@app.post('/auth/logout')
async def logout(response: Response, current_user = Depends(get_current_user)):
    """Logout user; clear cookies if cookie-auth is enabled."""
    if config.COOKIE_AUTH_ENABLED:
        response.delete_cookie('access_token', domain=config.COOKIE_DOMAIN)
        response.delete_cookie('refresh_token', domain=config.COOKIE_DOMAIN)
        response.delete_cookie('csrf_token', domain=config.COOKIE_DOMAIN)
    return {
        'success': True,
        'message': 'Logged out successfully'
    }

@app.post('/auth/refresh')
@limiter.limit(config.RATE_LIMIT_REFRESH)
async def refresh_token(request: Request, response: Response, refresh_token: str = Form(...)):
    """Refresh access token using a valid refresh token.
    
    Args:
        refresh_token: Valid refresh token from previous login
        
    Returns:
        New access token and optionally a new refresh token
    """
    # Decode and verify refresh token
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=401, 
            detail='Invalid or expired refresh token'
        )
    
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=401, 
            detail='Invalid refresh token payload'
        )
    
    # Get user from database
    user = await db.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401, 
            detail='User not found or inactive'
        )
    
    # Create new access token
    token_data = {
        'user_id': str(user.id),
        'email': user.email,
        'role': user.role
    }
    new_access_token = create_access_token(token_data)
    
    # Optionally create a new refresh token (token rotation)
    # This enhances security by rotating refresh tokens
    new_refresh_token_data = {
        'user_id': str(user.id)
    }
    new_refresh_token = create_refresh_token(new_refresh_token_data)
    
    _logger.info(
        f"Token refreshed for user {user.email} (role: {user.role})",
        extra={
            'user_id': str(user.id),
            'role': user.role,
            'action': 'token_refresh'
        }
    )
    
    # Set cookies if cookie-auth enabled
    if config.COOKIE_AUTH_ENABLED:
        response.set_cookie('access_token', new_access_token, httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_ACCESS_MAX_AGE)
        response.set_cookie('refresh_token', new_refresh_token, httponly=True, secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, domain=config.COOKIE_DOMAIN, max_age=config.COOKIE_REFRESH_MAX_AGE)

    return {
        'success': True,
        'access_token': new_access_token,
        'refresh_token': new_refresh_token,  # Return new refresh token (rotation)
        'token': new_access_token,  # For backward compatibility
        'user': {
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role
        }
    }

# ----- Admin-Only Routes -----
from app.authz import require_admin, require_manager_or_admin

@app.get('/admin/users')
async def list_all_users(current_user = Depends(require_admin)):
    """List all users in the system (admin only)."""
    try:
        users = await db.get_all_users()
        return {
            'success': True,
            'users': [
                {
                    'id': str(user.id),
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None
                }
                for user in users
            ],
            'count': len(users)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@app.get('/admin/meetings/all')
async def list_all_meetings(current_user = Depends(require_admin)):
    """List all meetings from all users (admin only)."""
    try:
        meetings = await db.get_all_meetings()
        return {
            'success': True,
            'meetings': [meeting_to_dict(m) for m in meetings],
            'count': len(meetings)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list meetings: {str(e)}")

@app.get('/meetings')
async def list_user_meetings(
    limit: int = 1000,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """List meetings for the current user."""
    try:
        # Get meetings for the current user
        meetings = await db.list_meetings(
            limit=limit,
            offset=offset,
            user_id=str(current_user.id)
        )
        
        # Get total count for the user
        total = await db.count_meetings(user_id=str(current_user.id))
        
        return {
            'success': True,
            'meetings': [meeting_to_dict(m) for m in meetings],
            'total': total,
            'count': len(meetings)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list meetings: {str(e)}")

@app.patch('/meetings/{meeting_id}')
async def update_meeting(
    meeting_id: str,
    title: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    """Update a meeting's title."""
    try:
        # Get the meeting to verify ownership
        meeting = await db.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check if user owns this meeting
        if meeting.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="You can only update your own meetings")
        
        # Update the meeting
        success = await db.update_meeting(meeting_id, title=title)
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return {
            'success': True,
            'message': 'Meeting updated successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update meeting: {str(e)}")

@app.delete('/admin/users/{user_id}')
async def delete_user_by_admin(user_id: str, current_user = Depends(require_admin)):
    """Delete a user by ID (admin only). Cannot delete yourself."""
    # Prevent admin from deleting themselves
    if str(current_user.id) == user_id:
        _logger.warning({
            "event": "admin_action_denied",
            "action": "delete_user",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "target_user_id": user_id,
            "reason": "Cannot delete own account"
        })
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    try:
        success = await db.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Audit log for successful deletion
        _logger.warning({
            "event": "admin_action",
            "action": "delete_user",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "admin_role": current_user.role,
            "target_user_id": user_id,
            "status": "success"
        })
        
        return {
            'success': True,
            'message': f'User {user_id} deleted successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        _logger.error({
            "event": "admin_action_error",
            "action": "delete_user",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "target_user_id": user_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

from pydantic import BaseModel

class UpdateRoleRequest(BaseModel):
    role: str

@app.put('/admin/users/{user_id}/role')
async def update_user_role_by_admin(user_id: str, request: UpdateRoleRequest, current_user = Depends(require_admin)):
    """Update a user's role (admin only). Cannot change your own role."""
    role = request.role
    
    # Validate role
    valid_roles = ['guest', 'member', 'manager', 'admin']
    if role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Prevent admin from changing their own role
    if str(current_user.id) == user_id:
        _logger.warning({
            "event": "admin_action_denied",
            "action": "change_role",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "target_user_id": user_id,
            "new_role": role,
            "reason": "Cannot change own role"
        })
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    try:
        # Get old role before update for audit trail
        user_before = await db.get_user_by_id(user_id)
        old_role = user_before.role if user_before else None
        
        success = await db.update_user_role(user_id, role)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Audit log for successful role change
        _logger.warning({
            "event": "admin_action",
            "action": "change_role",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "admin_role": current_user.role,
            "target_user_id": user_id,
            "old_role": old_role,
            "new_role": role,
            "status": "success"
        })
        
        return {
            'success': True,
            'message': f'User role updated to {role}'
        }
    except HTTPException:
        raise
    except Exception as e:
        _logger.error({
            "event": "admin_action_error",
            "action": "change_role",
            "admin_id": str(current_user.id),
            "admin_email": current_user.email,
            "target_user_id": user_id,
            "new_role": role,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Failed to update user role: {str(e)}")

# ----- Request ID + structured logging middleware -----
import uuid as _uuid
import logging as _logging
import time as _time
_logger = _logging.getLogger("imip")

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID and log requests with user context."""
    rid = request.headers.get('X-Request-ID', str(_uuid.uuid4()))
    start = _time.time()
    
    # Try to extract user info from token (if present)
    user_id = None
    user_email = None
    user_role = None
    
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        try:
            token = auth_header.split(' ')[1]
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get('user_id')
                user_email = payload.get('email')
                user_role = payload.get('role')
        except Exception:
            pass  # Invalid token, continue without user context
    
    response = await call_next(request)
    response.headers['X-Request-ID'] = rid
    
    # Enhanced structured logging
    try:
        log_data = {
            "event": "request",
            "rid": rid,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": int((_time.time() - start) * 1000),
            "client_ip": request.client.host if request.client else None,
        }
        
        # Add user context if available
        if user_id:
            log_data["user_id"] = user_id
        if user_email:
            log_data["user_email"] = user_email
        if user_role:
            log_data["user_role"] = user_role
        
        # Log at appropriate level based on status code
        if response.status_code >= 500:
            _logger.error(log_data)
        elif response.status_code >= 400:
            _logger.warning(log_data)
        else:
            _logger.info(log_data)
            
    except Exception as e:
        _logger.error(f"Error logging request: {e}")
    
    return response


def _safe_unlink(path: str, retries: int = 6, delay: float = 0.5):
    """Attempt to delete a file with retries to avoid WinError 32 (in-use)."""
    if not path:
        return
    for _ in range(retries):
        try:
            if os.path.exists(path):
                os.unlink(path)
            return
        except PermissionError:
            time.sleep(delay)
        except Exception:
            # Any other exception: wait a bit and retry a couple times anyway
            time.sleep(delay)
    # Last attempt without catching to surface any persistent error
    try:
        if os.path.exists(path):
            os.unlink(path)
    except Exception:
        # Give up silently; temp files will be cleaned by OS later
        pass


def _delayed_unlink(path: str, delay: float = 2.0):
    time.sleep(delay)
    _safe_unlink(path)


def _wait_for_file_ready(path: str, retries: int = 20, delay: float = 0.25):
    """Wait until a file exists and can be opened for reading (not locked)."""
    for _ in range(retries):
        try:
            if os.path.exists(path):
                with open(path, 'rb') as _f:
                    _f.read(1)
                return True
        except Exception:
            time.sleep(delay)
    return False


def meeting_to_dict(m):
    """Convert meeting object to dictionary for API response."""
    return {
        'id': str(m.id),
        'title': m.title,
        'created_at': m.created_at.isoformat() if m.created_at else None,
        'summary': (m.summary or '')[:1000],
        'keywords': m.keywords if isinstance(m.keywords, list) else [],
        'action_items': m.action_items if isinstance(m.action_items, list) else [],
    }

@app.get('/healthz')
async def healthz():
    return {"ok": True}

@app.get('/readyz')
async def readyz():
    probe = SpeechToText.probe_backends()
    try:
        # Test MongoDB connection by attempting a simple query
        await db.User.find_one()
        db_ok = True
    except Exception:
        db_ok = False
    return {"db": db_ok, "asr": probe}

@app.get('/status')
async def status():
    """Status endpoint with database and AI service checks"""
    probe = SpeechToText.probe_backends()
    probe['VOSK_MODEL_PATH'] = os.environ.get('VOSK_MODEL_PATH')
    # Report discovered paths from config (no hardcoded user paths)
    probe['config'] = {
        'FFMPEG_BIN': config.FFMPEG_BIN,
        'VOSK_MODEL_PATH': config.VOSK_MODEL_PATH,
        'HF_HOME': config.HF_HOME,
        'WHISPER_MODEL': config.WHISPER_MODEL,
        'MAX_UPLOAD_SIZE': config.MAX_UPLOAD_SIZE,
    }
    probe['vosk_model_discovered'] = bool(config.VOSK_MODEL_PATH)
    
    # NLP / AI status - including Gemini
    try:
        probe['nlp'] = {
            'openai_enabled': bool(nlp.openai_client),
            'openai_summary_model': getattr(nlp, 'openai_summary_model', None),
            'openai_action_model': getattr(nlp, 'openai_action_model', None),
            'gemini_enabled': bool(getattr(nlp, 'gemini_client', None)),
            'gemini_model': getattr(nlp, 'gemini_model', None)
        }
    except Exception:
        probe['nlp'] = {
            'openai_enabled': False,
            'openai_summary_model': None,
            'openai_action_model': None,
            'gemini_enabled': False,
            'gemini_model': None
        }
    
    # Database status
    try:
        import app.db_mongo as db_mongo
        if db_mongo.motor_client:
            await db_mongo.motor_client.admin.command('ping')
            probe['db'] = 'ok'
        else:
            probe['db'] = 'error'
    except Exception as e:
        probe['db'] = 'error'
        probe['db_error'] = str(e)
    
    # API status
    probe['status'] = 'ok'
    probe['time'] = datetime.now().isoformat()
    
    return probe

@app.post('/config/vosk')
async def set_vosk_model(path: str = Form(...)):
    """Set VOSK_MODEL_PATH at runtime (affects current process) and update ASR instance."""
    # set in env for current process
    os.environ['VOSK_MODEL_PATH'] = path
    # update asr instance
    try:
        asr.set_vosk_model_path(path)
    except Exception:
        pass
    exists = os.path.isdir(path)
    return {'VOSK_MODEL_PATH': path, 'exists': exists}

@app.get('/config/vosk')
async def get_vosk_config():
    path = os.environ.get('VOSK_MODEL_PATH')
    exists = bool(path and os.path.isdir(path))
    return {'VOSK_MODEL_PATH': path, 'exists': exists}

@app.post('/transcribe')
@limiter.limit(config.RATE_LIMIT_TRANSCRIBE)
async def transcribe(request: Request, file: UploadFile = File(None), pasted: str = Form(None)):
    if file is None and (not pasted):
        return JSONResponse({'error': 'No file or pasted text provided.'}, status_code=400)

    if file is not None:
        # Validate extension
        filename = file.filename or ''
        ext = '.' + filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
        if ext not in config.ALLOWED_UPLOAD_EXTENSIONS:
            return JSONResponse({'error': f'Unsupported file extension: {ext}'}, status_code=400)

        # Read file and enforce max size
        content = await file.read()
        if len(content) > config.MAX_UPLOAD_SIZE:
            return JSONResponse({'error': f'File too large. Max size is {config.MAX_UPLOAD_SIZE} bytes'}, status_code=413)

        # MIME sniffing
        try:
            import magic as _magic
            mime = _magic.from_buffer(content, mime=True)
            allowed_mime = {
                'audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/ogg',
                'video/webm','video/mp4','video/x-msvideo','video/quicktime','video/x-matroska','video/x-flv','video/x-ms-wmv'
            }
            if mime not in allowed_mime:
                return JSONResponse({'error': f'Unsupported MIME type: {mime}'}, status_code=400)
        except Exception:
            # If magic unavailable, proceed with extension-only validation
            pass

        # Convert to wav
        tmp_root = str(config.TMP_DIR)
        os.makedirs(tmp_root, exist_ok=True)
        wav_path = os.path.join(tmp_root, f"{uuid.uuid4().hex}.wav")
        try:
            wav_bytes = audio_processor.convert_to_wav_bytes(content)
            with open(wav_path, 'wb') as wf:
                wf.write(wav_bytes)
            result = asr.transcribe(wav_path)
            return {'text': result.get('text', ''), 'segments': result.get('segments', [])}
        finally:
            _safe_unlink(wav_path)
    else:
        return {'text': pasted, 'segments': []}

@app.post('/transcribe-path')
@limiter.limit(config.RATE_LIMIT_TRANSCRIBE)
async def transcribe_from_path(request: Request, background_tasks: BackgroundTasks, file_path: str = Form(...)):
    # Guarded by configuration
    if not config.ENABLE_PATH_TRANSCRIPTION:
        return JSONResponse({'error': 'Path transcription is disabled by configuration.'}, status_code=403)

    if not file_path or not file_path.strip():
        return JSONResponse({'error': 'No file path provided.'}, status_code=400)

    # If allowed directories are defined, enforce restriction
    if config.PATH_TRANSCRIPTION_DIRS:
        normalized_path = os.path.abspath(file_path)
        allowed = any(normalized_path.startswith(os.path.abspath(d)) for d in config.PATH_TRANSCRIPTION_DIRS)
        if not allowed:
            return JSONResponse({'error': 'Path not allowed by server configuration.'}, status_code=403)
    
    if not os.path.exists(file_path):
        return JSONResponse({'error': f'File not found: {file_path}'}, status_code=404)
    
    try:
        # Read the file and convert to wav
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Create a temp directory and unique WAV path without pre-opening the file (avoids Windows locks)
        tmp_root = str(config.TMP_DIR)
        os.makedirs(tmp_root, exist_ok=True)
        wav_path = os.path.join(tmp_root, f"{uuid.uuid4().hex}.wav")
        
        # Convert in-memory to WAV to avoid intermediate locks; then write once
        wav_bytes = audio_processor.convert_to_wav_bytes(content)
        with open(wav_path, 'wb') as wf:
            wf.write(wav_bytes)
        result = asr.transcribe(wav_path)
        
        # Schedule cleanup with a slight delay to avoid Windows file locking
        background_tasks.add_task(_delayed_unlink, wav_path)
        
        return {'text': result.get('text', ''), 'segments': result.get('segments', [])}
    except Exception as e:
        return JSONResponse({'error': f'Failed to process file: {str(e)}'}, status_code=500)

@app.post('/summarize')
@limiter.limit(config.RATE_LIMIT_SUMMARIZE)
async def summarize(request: Request, text: str = Form(...), meeting_date: str = Form(None), attendees: str = Form(None)):
    if not text:
        return JSONResponse({'error': 'No text provided.'}, status_code=400)
    
    # Parse attendees if provided
    attendees_list = None
    if attendees:
        attendees_list = [a.strip() for a in attendees.split(',') if a.strip()]
    
    summary = nlp.summarize(text)
    extraction_result = nlp.extract_action_items(text, meeting_date=meeting_date, attendees=attendees_list)
    keywords = nlp.extract_keywords(text)
    
    # Enhanced response format with backward compatibility
    response = {
        'summary': summary, 
        'keywords': keywords,
        'action_items': extraction_result.get('action_items', []),  # Legacy format
        'decisions': extraction_result.get('decisions', []),
        'key_topics': extraction_result.get('key_topics', []),
        'extraction_metadata': extraction_result.get('metadata', {})
    }
    
    return response

@app.post('/save')
@limiter.limit(config.RATE_LIMIT_SAVE)
async def save_meeting(request: Request, title: str = Form('Untitled'), transcript: str = Form(''), summary: str = Form(''),
                      meeting_date: str = Form(None), attendees: str = Form(None),
                      current_user = Depends(get_current_user)):
    # CSRF protection (double-submit cookie) when cookie-auth is enabled
    if config.COOKIE_AUTH_ENABLED:
        cookie_csrf = request.cookies.get('csrf_token')
        header_csrf = request.headers.get('x-csrf-token')
        if not cookie_csrf or not header_csrf or cookie_csrf != header_csrf:
            raise HTTPException(status_code=403, detail='CSRF token missing or invalid')
    import json
    # Parse attendees if provided
    attendees_list = None
    if attendees:
        attendees_list = [a.strip() for a in attendees.split(',') if a.strip()]
    
    # Extract action items, decisions, and keywords from transcript
    if transcript:
        extraction_result = nlp.extract_action_items(transcript, meeting_date=meeting_date, attendees=attendees_list)
        action_items = extraction_result.get('action_items', [])
        decisions = extraction_result.get('decisions', [])
        key_topics = extraction_result.get('key_topics', [])
        keywords = nlp.extract_keywords(transcript)
        
        # Store enhanced metadata
        extraction_meta = {
            'decisions': decisions,
            'key_topics': key_topics,
            'extraction_metadata': extraction_result.get('metadata', {})
        }
        meta_json = json.dumps(extraction_meta)
    else:
        action_items = []
        keywords = []
        meta_json = '{}'
    
    mid = await db.save_meeting(
        title=title, 
        transcript=transcript, 
        summary=summary,
        keywords=keywords,
        action_items=action_items,
        meta=meta_json,
        user_id=str(current_user.id)
    )
    return {'id': mid}

@app.get('/meetings')
async def list_meetings(limit: int = 100, offset: int = 0, search: str = None, 
                       current_user = Depends(get_current_user)):
    """List meetings with pagination and optional search (filtered by role)."""
    # Admins and Managers see all meetings, Members see only their own
    user_id_filter = None if current_user.role in ['admin', 'manager'] else str(current_user.id)
    
    if search:
        rows = await db.search_meetings(query=search, limit=limit, offset=offset, user_id=user_id_filter)
    else:
        rows = await db.list_meetings(limit=limit, offset=offset, user_id=user_id_filter)
    
    total = await db.count_meetings(user_id=user_id_filter)
    return {
        'meetings': [meeting_to_dict(r) for r in rows],
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': offset + limit < total
    }

@app.get('/meetings/{meeting_id}')
async def get_meeting(meeting_id: str, current_user = Depends(get_current_user)):
    import json
    m = await db.get_meeting(meeting_id)
    if not m:
        return JSONResponse({'error': 'Meeting not found'}, status_code=404)
    
    # Verify ownership
    if m.user_id != str(current_user.id):
        return JSONResponse({'error': 'Access denied'}, status_code=403)
    
    # Parse enhanced metadata
    meta_data = {}
    if hasattr(m, 'meta') and m.meta:
        try:
            meta_data = json.loads(m.meta)
        except json.JSONDecodeError:
            meta_data = {}
    
    response = {
        'id': str(m.id),
        'title': m.title,
        'created_at': m.created_at.isoformat() if m.created_at else None,
        'transcript': m.transcript,
        'summary': m.summary,
        'keywords': m.keywords if isinstance(m.keywords, list) else [],
        'action_items': m.action_items if isinstance(m.action_items, list) else [],
        'meta': m.meta
    }
    
    # Add enhanced data if available
    if meta_data:
        response['decisions'] = meta_data.get('decisions', [])
        response['key_topics'] = meta_data.get('key_topics', [])
        response['extraction_metadata'] = meta_data.get('extraction_metadata', {})
    
    return response

@app.put('/meetings/{meeting_id}')
async def update_meeting(meeting_id: str, title: str = Form(None), transcript: str = Form(None), summary: str = Form(None),
                        current_user = Depends(get_current_user)):
    """Update a meeting's details."""
    # Verify ownership first
    m = await db.get_meeting(meeting_id)
    if not m:
        return JSONResponse({'error': 'Meeting not found'}, status_code=404)
    if m.user_id != str(current_user.id):
        return JSONResponse({'error': 'Access denied'}, status_code=403)
    
    success = await db.update_meeting(
        meeting_id=meeting_id,
        title=title,
        transcript=transcript,
        summary=summary
    )
    
    if not success:
        return JSONResponse({'error': 'Meeting not found'}, status_code=404)
    
    return {'success': True, 'id': meeting_id}

@app.delete('/meetings/{meeting_id}')
async def delete_meeting(meeting_id: str, current_user = Depends(get_current_user)):
    """Delete a meeting."""
    # Verify ownership first
    m = await db.get_meeting(meeting_id)
    if not m:
        return JSONResponse({'error': 'Meeting not found'}, status_code=404)
    if m.user_id != str(current_user.id):
        return JSONResponse({'error': 'Access denied'}, status_code=403)
    
    success = await db.delete_meeting(meeting_id)
    
    if not success:
        return JSONResponse({'error': 'Meeting not found'}, status_code=404)
    
    return {'success': True, 'id': meeting_id}

@app.post('/transcribe_video')
async def transcribe_video(file: UploadFile = File(...)):
    """Deprecated: use /transcribe instead. Kept for backward compatibility."""
    try:
        # Validate extension
        filename = file.filename or ''
        ext = '.' + filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
        if ext not in config.ALLOWED_UPLOAD_EXTENSIONS:
            return JSONResponse({'error': f'Unsupported file extension: {ext}'}, status_code=400)

        content = await file.read()
        if len(content) > config.MAX_UPLOAD_SIZE:
            return JSONResponse({'error': f'File too large. Max size is {config.MAX_UPLOAD_SIZE} bytes'}, status_code=413)

        tmp_root = str(config.TMP_DIR)
        os.makedirs(tmp_root, exist_ok=True)
        wav_path = os.path.join(tmp_root, f"{uuid.uuid4().hex}.wav")

        # Convert fully in-memory first, then write
        wav_bytes = audio_processor.convert_to_wav_bytes(content)
        with open(wav_path, 'wb') as wf:
            wf.write(wav_bytes)
        
        # Transcribe the audio
        result = asr.transcribe(wav_path)
        
        return {'transcript': result.get('text', '')}

    except Exception as e:
        return JSONResponse(content={'error': str(e)}, status_code=500)
    
    finally:
        # Clean up temporary files
        if 'wav_path' in locals():
            _safe_unlink(wav_path)
            pass


# ============= Manager/Team Endpoints =============

@app.get('/manager/team/members')
async def get_team_members(current_user = Depends(require_manager_or_admin)):
    """Get list of team members with their activity statistics (manager/admin only)."""
    try:
        members = await db.get_team_members_with_stats()
        return {
            'success': True,
            'members': members,
            'total': len(members)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch team members: {str(e)}")


@app.get('/manager/team/stats')
async def get_team_stats(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user = Depends(require_manager_or_admin)
):
    """Get aggregated team statistics (manager/admin only)."""
    try:
        date_from_dt = datetime.fromisoformat(date_from) if date_from else None
        date_to_dt = datetime.fromisoformat(date_to) if date_to else None
        
        stats = await db.get_team_statistics(date_from=date_from_dt, date_to=date_to_dt)
        return {
            'success': True,
            'stats': stats
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch team stats: {str(e)}")


@app.get('/manager/reports/date-range')
async def get_meetings_by_date_range(
    date_from: str,
    date_to: str,
    current_user = Depends(require_manager_or_admin)
):
    """Get meetings within a date range (manager/admin only)."""
    try:
        date_from_dt = datetime.fromisoformat(date_from)
        date_to_dt = datetime.fromisoformat(date_to)
        
        # Ensure date_to includes the entire day
        if date_to_dt.hour == 0 and date_to_dt.minute == 0 and date_to_dt.second == 0:
            date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        meetings = await db.get_meetings_in_date_range(date_from=date_from_dt, date_to=date_to_dt)
        meetings_dict = [db.meeting_to_dict(m) for m in meetings]
        
        return {
            'success': True,
            'meetings': meetings_dict,
            'count': len(meetings_dict),
            'date_from': date_from,
            'date_to': date_to
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings by date range: {str(e)}")


@app.get('/manager/reports/action-items')
async def get_action_items_report(
    current_user = Depends(require_manager_or_admin)
):
    """Get summary of all action items cross team (manager/admin only)."""
    try:
        summary = await db.get_action_items_summary()
        return {
            'success': True,
            **summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch action items report: {str(e)}")


# ============= Support Ticket Endpoints =============

class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    category: str = 'general'
    priority: str = 'medium'
    admin_email: str  # Email of admin to assign ticket to


@app.post('/support/tickets')
async def create_support_ticket(
    ticket_data: SupportTicketCreate,
    current_user = Depends(get_current_user)
):
    """Create a new support ticket assigned to a specific admin."""
    try:
        # Find admin by email
        admin_user = await db.get_user_by_email(ticket_data.admin_email)
        
        if not admin_user:
            raise HTTPException(
                status_code=400, 
                detail=f"No user found with email '{ticket_data.admin_email}'. Please provide a valid admin email address."
            )
        
        if admin_user.role != 'admin':
            raise HTTPException(
                status_code=400, 
                detail=f"User '{ticket_data.admin_email}' is not an admin. Please provide a valid admin email address."
            )
        
        # Create ticket assigned to specific admin
        ticket_id = await db.create_support_ticket(
            user_id=str(current_user.id),
            user_name=current_user.full_name,
            user_email=current_user.email,
            subject=ticket_data.subject,
            message=ticket_data.message,
            category=ticket_data.category,
            priority=ticket_data.priority,
            assigned_admin_email=admin_user.email
        )
        
        return {
            'success': True,
            'ticket_id': ticket_id,
            'message': f'Support ticket created successfully and assigned to {admin_user.full_name}'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create support ticket: {str(e)}")


@app.get('/support/tickets')
async def get_user_support_tickets(
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """Get support tickets for the current user."""
    try:
        tickets = await db.get_user_support_tickets(
            user_id=str(current_user.id),
            limit=limit,
            offset=offset
        )
        
        return {
            'success': True,
            'tickets': [db.support_ticket_to_dict(ticket) for ticket in tickets],
            'total': len(tickets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch support tickets: {str(e)}")


@app.get('/support/tickets/{ticket_id}')
async def get_support_ticket(
    ticket_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific support ticket by ID."""
    try:
        ticket = await db.get_support_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found")
        
        # Check if user owns the ticket or is admin
        if ticket.user_id != str(current_user.id) and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            'success': True,
            'ticket': db.support_ticket_to_dict(ticket)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch support ticket: {str(e)}")


# ============= Admin Support Management Endpoints =============

@app.get('/admin/support/tickets')
async def get_all_support_tickets_admin(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    current_user = Depends(require_admin)
):
    """Get all support tickets (admin only)."""
    try:
        tickets = await db.get_all_support_tickets(
            limit=limit,
            offset=offset,
            status=status
        )
        
        return {
            'success': True,
            'tickets': [db.support_ticket_to_dict(ticket) for ticket in tickets],
            'total': len(tickets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch support tickets: {str(e)}")


@app.post('/support/tickets/{ticket_id}/messages')
async def add_ticket_message(
    ticket_id: str,
    message: str = Form(...),
    current_user = Depends(get_current_user)
):
    """Add a message to a support ticket conversation thread."""
    try:
        # Get the ticket
        ticket = await db.get_support_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found")
        
        # Check permissions: Members can only reply to their own tickets, Admins can reply to any
        if current_user.role not in ['admin', 'manager'] and ticket.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="You can only reply to your own tickets")
        
        # Determine sender type
        sender_type = 'admin' if current_user.role in ['admin', 'manager'] else 'member'
        
        # Create message object
        new_message = {
            'sender_type': sender_type,
            'sender_id': str(current_user.id),
            'sender_name': current_user.full_name,
            'text': message,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Use motor_client directly to access MongoDB collection
        from bson import ObjectId
        # Use initialized motor_client from main db module
        # from app.db_mongo_support import motor_client, DATABASE_NAME
        
        collection = db.motor_client[db.DATABASE_NAME]["support_tickets"]
        
        # Initialize messages array if it doesn't exist and migrate old data
        await collection.update_one(
            {"_id": ObjectId(ticket_id), "messages": {"$exists": False}},
            {
                "$set": {"messages": []}
            }
        )
        
        # Add the new message
        result = await collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$push": {"messages": new_message},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return {
            'success': True,
            'message': 'Message added successfully',
            'new_message': new_message
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")


@app.patch('/admin/support/tickets/{ticket_id}')
async def update_support_ticket_admin(
    ticket_id: str,
    status: Optional[str] = None,
    admin_response: Optional[str] = None,
    current_user = Depends(require_admin)
):
    """Update a support ticket (admin only)."""
    try:
        success = await db.update_support_ticket_status(
            ticket_id=ticket_id,
            status=status,
            admin_response=admin_response,
            resolved_by=str(current_user.id)
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Support ticket not found")
        
        return {
            'success': True,
            'message': 'Support ticket updated successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update support ticket: {str(e)}")
