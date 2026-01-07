"""MongoDB database models and operations using Beanie ODM."""
import os
from datetime import datetime, timezone
from typing import Optional, List
from beanie import Document, Indexed, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field, EmailStr
import json

# MongoDB configuration
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'imip')

# Global motor client
motor_client: Optional[AsyncIOMotorClient] = None


# ============= Beanie Document Models =============

class User(Document):
    """User document model."""
    email: Indexed(EmailStr, unique=True)  # type: ignore
    password_hash: str
    full_name: str
    role: str = Field(default='member')  # admin, manager, member, guest
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            "email",
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password_hash": "hashed_password",
                "full_name": "John Doe",
                "role": "member",
                "is_active": True
            }
        }


class Meeting(Document):
    """Meeting document model."""
    user_id: Optional[str] = None  # Store as string to match Beanie PydanticObjectId
    title: str = Field(default='Untitled')
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    transcript: Optional[str] = None
    summary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    action_items: List[dict] = Field(default_factory=list)
    decisions: List[dict] = Field(default_factory=list)
    key_topics: List[dict] = Field(default_factory=list)
    meta: Optional[str] = None

    class Settings:
        name = "meetings"
        indexes = [
            "user_id",
            "created_at",
            [("user_id", 1), ("created_at", -1)],  # Compound index for efficient user queries
            [("title", "text"), ("transcript", "text"), ("summary", "text")],  # Text index for search
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "title": "Team Meeting",
                "transcript": "Meeting transcript...",
                "summary": "Discussion about project updates",
                "keywords": ["project", "updates", "deadline"],
                "action_items": [{"text": "Complete report", "owner": "John", "deadline": "2024-01-15"}],
                "decisions": [{"decision": "Use React for frontend", "decision_maker": "Team", "impact": "Faster development"}],
                "key_topics": [{"topic": "Project Timeline", "description": "Discussion about project deadlines", "importance_level": "High"}],
                "meta": "{}"
            }
        }


class SupportTicket(Document):
    """Support ticket document model."""
    user_id: str  # User who submitted the ticket
    user_name: str
    user_email: str
    subject: str
    message: str
    category: str = Field(default='general')  # general, technical, feature, bug, account, billing
    priority: str = Field(default='medium')  # low, medium, high, urgent
    status: str = Field(default='open')  # open, in_progress, resolved, closed
    admin_response: Optional[str] = None
    resolved_by: Optional[str] = None  # Admin user ID who resolved it
    resolved_at: Optional[datetime] = None
    assigned_admin_id: Optional[str] = None  # Admin assigned to handle this ticket
    assigned_admin_email: Optional[str] = None  # Email of assigned admin
    messages: List[dict] = Field(default_factory=list)  # Conversation thread messages
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "support_tickets"
        indexes = [
            "user_id",
            "status",
            "created_at",
            "priority",
            "assigned_admin_id",
            [("status", 1), ("created_at", -1)],  # Compound index for admin queries
            [("assigned_admin_id", 1), ("status", 1)],  # Index for filtering by assigned admin
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "user_name": "John Doe",
                "user_email": "john@example.com",
                "subject": "Login issue",
                "message": "I cannot log into my account...",
                "category": "technical",
                "priority": "high",
                "status": "open",
                "admin_response": None,
                "resolved_by": None,
                "resolved_at": None,
                "created_at": "2025-01-21T10:00:00Z",
                "updated_at": "2025-01-21T10:00:00Z"
            }
        }


# ============= Database Initialization =============

async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    global motor_client
    
    try:
        # Create motor client with connection pooling
        motor_client = AsyncIOMotorClient(
            MONGODB_URL,
            maxPoolSize=50,  # Maximum number of connections in the pool
            minPoolSize=10,  # Minimum number of connections to maintain
            maxIdleTimeMS=45000,  # Close connections after 45 seconds of inactivity
            serverSelectionTimeoutMS=5000,  # Timeout for server selection
            connectTimeoutMS=10000,  # Timeout for initial connection
            socketTimeoutMS=45000,  # Timeout for socket operations
        )
        
        # Get database
        database = motor_client[DATABASE_NAME]
        
        # Initialize beanie with document models
        await init_beanie(
            database=database,
            document_models=[User, Meeting, SupportTicket]
        )
        
        print(f"Connected to MongoDB: {MONGODB_URL}/{DATABASE_NAME}")
        return True
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise


async def close_db():
    """Close MongoDB connection."""
    global motor_client
    if motor_client:
        motor_client.close()
        print("Closed MongoDB connection")


# ============= Meeting CRUD Operations =============

async def save_meeting(
    title: str,
    transcript: str,
    summary: str,
    keywords: list = None,
    action_items: list = None,
    decisions: list = None,
    key_topics: list = None,
    meta: str = None,
    user_id: str = None
) -> str:
    """Create a new meeting. Returns meeting ID."""
    meeting = Meeting(
        user_id=user_id,
        title=title,
        transcript=transcript,
        summary=summary,
        keywords=keywords or [],
        action_items=action_items or [],
        decisions=decisions or [],
        key_topics=key_topics or [],
        meta=meta or ''
    )
    await meeting.insert()
    return str(meeting.id)


async def list_meetings(limit: int = 50, offset: int = 0, user_id: str = None) -> List[Meeting]:
    """List meetings with pagination. Optionally filter by user_id."""
    query = Meeting.find()
    
    if user_id is not None:
        query = query.find(Meeting.user_id == user_id)
    
    meetings = await query.sort(-Meeting.created_at).skip(offset).limit(limit).to_list()
    return meetings


async def get_meeting(meeting_id: str) -> Optional[Meeting]:
    """Get a meeting by ID."""
    try:
        return await Meeting.get(meeting_id)
    except Exception:
        return None


async def update_meeting(
    meeting_id: str,
    title: str = None,
    transcript: str = None,
    summary: str = None,
    keywords: list = None,
    action_items: list = None,
    meta: str = None
) -> bool:
    """Update a meeting's fields. Returns True if successful."""
    meeting = await get_meeting(meeting_id)
    if not meeting:
        return False
    
    update_data = {}
    if title is not None:
        update_data['title'] = title
    if transcript is not None:
        update_data['transcript'] = transcript
    if summary is not None:
        update_data['summary'] = summary
    if keywords is not None:
        update_data['keywords'] = keywords
    if action_items is not None:
        update_data['action_items'] = action_items
    if meta is not None:
        update_data['meta'] = meta
    
    if update_data:
        await meeting.set(update_data)
    
    return True


async def delete_meeting(meeting_id: str) -> bool:
    """Delete a meeting. Returns True if successful."""
    meeting = await get_meeting(meeting_id)
    if not meeting:
        return False
    
    await meeting.delete()
    return True


async def count_meetings(user_id: str = None) -> int:
    """Count total number of meetings. Optionally filter by user_id."""
    query = Meeting.find()
    
    if user_id is not None:
        query = query.find(Meeting.user_id == user_id)
    
    return await query.count()


async def search_meetings(
    query: str,
    limit: int = 10,
    offset: int = 0,
    user_id: str = None
) -> List[Meeting]:
    """Full-text search in meetings using MongoDB text index."""
    if not query or not query.strip():
        # If no query, return recent meetings
        return await list_meetings(limit=limit, offset=offset, user_id=user_id)
    
    # MongoDB text search
    search_query = Meeting.find({"$text": {"$search": query}})
    
    if user_id is not None:
        search_query = search_query.find(Meeting.user_id == user_id)
    
    meetings = await search_query.skip(offset).limit(limit).to_list()
    return meetings


# ============= User CRUD Operations =============

async def create_user(
    email: str,
    password_hash: str,
    full_name: str,
    role: str = 'member'
) -> str:
    """Create a new user. Returns user ID."""
    user = User(
        email=email.lower(),
        password_hash=password_hash,
        full_name=full_name,
        role=role
    )
    await user.insert()
    return str(user.id)


async def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email address."""
    return await User.find_one(User.email == email.lower())


async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID."""
    try:
        return await User.get(user_id)
    except Exception:
        return None


async def update_user(user_id: str, **kwargs) -> bool:
    """Update user fields. Returns True if successful."""
    user = await get_user_by_id(user_id)
    if not user:
        return False
    
    # Update timestamp
    kwargs['updated_at'] = datetime.utcnow()
    
    if kwargs:
        await user.set(kwargs)
    
    return True


async def list_users(limit: int = 50, offset: int = 0) -> List[User]:
    """List all active users with pagination."""
    users = await User.find(User.is_active == True).skip(offset).limit(limit).to_list()
    return users


async def get_all_users() -> List[User]:
    """Get all users (including inactive). Admin function."""
    users = await User.find().to_list()
    return users


async def delete_user(user_id: str) -> bool:
    """Delete a user permanently. Returns True if successful.
    
    Note: This is a hard delete. In production, consider soft delete
    by setting is_active = False instead.
    """
    user = await get_user_by_id(user_id)
    if not user:
        return False
    
    # Delete user
    await user.delete()
    
    # Optionally: Also delete all meetings owned by this user
    # await Meeting.find(Meeting.user_id == user_id).delete()
    
    return True


async def update_user_role(user_id: str, role: str) -> bool:
    """Update a user's role. Returns True if successful."""
    user = await get_user_by_id(user_id)
    if not user:
        return False
    
    # Update role and timestamp
    await user.set({
        'role': role,
        'updated_at': datetime.utcnow()
    })
    
    return True


async def get_all_meetings() -> List[Meeting]:
    """Get all meetings from all users. Admin function."""
    meetings = await Meeting.find().sort(-Meeting.created_at).to_list()
    return meetings


# ============= Helper Functions for Legacy Compatibility =============

def meeting_to_dict(meeting: Meeting) -> dict:
    """Convert Meeting document to dictionary for API responses."""
    # Ensure created_at is timezone-aware and in UTC
    created_at = meeting.created_at
    if created_at and created_at.tzinfo is None:
        # If naive datetime, assume it's UTC
        created_at = created_at.replace(tzinfo=timezone.utc)
    
    return {
        'id': str(meeting.id),
        'user_id': meeting.user_id,
        'title': meeting.title,
        'created_at': created_at.isoformat() if created_at else None,
        'transcript': meeting.transcript,
        'summary': meeting.summary,
        'keywords': meeting.keywords,
        'action_items': meeting.action_items,
        'decisions': meeting.decisions,
        'key_topics': meeting.key_topics,
        'meta': meeting.meta
    }


def user_to_dict(user: User) -> dict:
    """Convert User document to dictionary for API responses."""
    # Ensure timestamps are timezone-aware and in UTC
    created_at = user.created_at
    updated_at = user.updated_at
    
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    
    if updated_at and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    
    return {
        'id': str(user.id),
        'email': user.email,
        'full_name': user.full_name,
        'role': user.role,
        'is_active': user.is_active,
        'created_at': created_at.isoformat() if created_at else None,
        'updated_at': updated_at.isoformat() if updated_at else None
    }


# ============= Manager-Specific Functions =============

async def get_team_members_with_stats() -> List[dict]:
    """Get all team members (non-admin users) with their meeting statistics.
    
    Returns list of dicts with user info and stats:
    - user info (id, email, full_name, role)
    - meeting_count: total meetings created
    - last_meeting_date: date of most recent meeting
    - total_action_items: count of action items across all meetings
    """
    # Get all non-admin users
    users = await User.find(User.role != 'admin', User.is_active == True).to_list()
    
    result = []
    for user in users:
        user_id = str(user.id)
        
        # Get meeting count
        meeting_count = await Meeting.find(Meeting.user_id == user_id).count()
        
        # Get last meeting date
        last_meeting = await Meeting.find(Meeting.user_id == user_id).sort(-Meeting.created_at).first_or_none()
        last_meeting_date = last_meeting.created_at if last_meeting else None
        
        # Count total action items
        meetings = await Meeting.find(Meeting.user_id == user_id).to_list()
        total_action_items = sum(len(m.action_items) for m in meetings if m.action_items)
        
        result.append({
            'id': user_id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'meeting_count': meeting_count,
            'last_meeting_date': last_meeting_date.isoformat() if last_meeting_date else None,
            'total_action_items': total_action_items
        })
    
    return result


async def get_team_statistics(date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> dict:
    """Get aggregated team statistics.
    
    Args:
        date_from: Optional start date for filtering
        date_to: Optional end date for filtering
    
    Returns:
        Dict with team-wide statistics
    """
    # Build query for date filtering
    query = {}
    if date_from or date_to:
        query['created_at'] = {}
        if date_from:
            query['created_at']['$gte'] = date_from
        if date_to:
            query['created_at']['$lte'] = date_to
    
    # Get all team meetings (exclude admin meetings if needed)
    all_meetings = await Meeting.find(query).to_list() if query else await Meeting.find().to_list()
    
    # Calculate statistics
    total_meetings = len(all_meetings)
    total_action_items = sum(len(m.action_items) for m in all_meetings if m.action_items)
    
    # Get unique users who created meetings
    user_ids = list(set(m.user_id for m in all_meetings))
    active_members = len(user_ids)
    
    # Find most active member
    user_meeting_counts = {}
    for meeting in all_meetings:
        user_id = meeting.user_id
        user_meeting_counts[user_id] = user_meeting_counts.get(user_id, 0) + 1
    
    most_active_user_id = max(user_meeting_counts, key=user_meeting_counts.get) if user_meeting_counts else None
    most_active_user = None
    if most_active_user_id:
        user = await get_user_by_id(most_active_user_id)
        if user:
            most_active_user = {
                'id': most_active_user_id,
                'full_name': user.full_name,
                'meeting_count': user_meeting_counts[most_active_user_id]
            }
    
    return {
        'total_meetings': total_meetings,
        'total_action_items': total_action_items,
        'active_members': active_members,
        'most_active_user': most_active_user,
        'date_from': date_from.isoformat() if date_from else None,
        'date_to': date_to.isoformat() if date_to else None
    }


async def get_team_meetings(limit: int = 50, offset: int = 0, user_id: Optional[str] = None) -> List[Meeting]:
    """Get meetings from all team members (non-admin users).
    
    Args:
        limit: Maximum number of meetings to return
        offset: Number of meetings to skip
        user_id: Optional filter by specific user
    
    Returns:
        List of Meeting documents
    """
    query = {}
    if user_id:
        query['user_id'] = user_id
    
    meetings = await Meeting.find(query).sort(-Meeting.created_at).skip(offset).limit(limit).to_list()
    return meetings


async def get_meetings_in_date_range(date_from: datetime, date_to: datetime, user_ids: Optional[List[str]] = None) -> List[Meeting]:
    """Get meetings within a date range, optionally filtered by user IDs.
    
    Args:
        date_from: Start date
        date_to: End date
        user_ids: Optional list of user IDs to filter by
    
    Returns:
        List of Meeting documents
    """
    query = {
        'created_at': {
            '$gte': date_from,
            '$lte': date_to
        }
    }
    
    if user_ids:
        query['user_id'] = {'$in': user_ids}
    
    meetings = await Meeting.find(query).sort(-Meeting.created_at).to_list()
    return meetings


async def get_action_items_summary(user_ids: Optional[List[str]] = None) -> dict:
    """Get summary of all action items across team.
    
    Args:
        user_ids: Optional list of user IDs to filter by
    
    Returns:
        Dict with action items summary
    """
    query = {}
    if user_ids:
        query['user_id'] = {'$in': user_ids}
    
    meetings = await Meeting.find(query).to_list()
    
    all_action_items = []
    for meeting in meetings:
        if meeting.action_items:
            for item in meeting.action_items:
                all_action_items.append({
                    'meeting_id': str(meeting.id),
                    'meeting_title': meeting.title,
                    'user_id': meeting.user_id,
                    'action_item': item,
                    'created_at': meeting.created_at.isoformat() if meeting.created_at else None
                })
    
    return {
        'total_action_items': len(all_action_items),
        'action_items': all_action_items
    }


# ============= Support Ticket Functions =============

async def create_support_ticket(
    user_id: str,
    user_name: str,
    user_email: str,
    subject: str,
    message: str,
    category: str = 'general',
    priority: str = 'medium',
    assigned_admin_id: Optional[str] = None,
    assigned_admin_email: Optional[str] = None
) -> str:
    """Create a new support ticket. Returns ticket ID."""
    ticket = SupportTicket(
        user_id=user_id,
        user_name=user_name,
        user_email=user_email,
        subject=subject,
        message=message,
        category=category,
        priority=priority,
        status='open',
        assigned_admin_id=assigned_admin_id,
        assigned_admin_email=assigned_admin_email
    )
    await ticket.insert()
    return str(ticket.id)


async def get_user_support_tickets(
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[SupportTicket]:
    """Get support tickets for a specific user, by ID or email.

    If both user_id and user_email are provided, user_email takes precedence.
    """
    if user_email:
        query = SupportTicket.find(SupportTicket.user_email == user_email)
    elif user_id:
        query = SupportTicket.find(SupportTicket.user_id == user_id)
    else:
        # No filter -> return empty list for safety
        return []

    tickets = await query.sort(-SupportTicket.created_at).skip(offset).limit(limit).to_list()
    return tickets


async def get_all_support_tickets(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    assigned_admin_id: Optional[str] = None,
    assigned_admin_email: Optional[str] = None,
) -> List[SupportTicket]:
    """Get support tickets (admin only) with optional filters.

    Filters:
    - status: filter by ticket status
    - assigned_admin_id: only tickets assigned to this admin id
    - assigned_admin_email: only tickets assigned to this admin email
    """
    query = {}
    if status:
        query['status'] = status
    if assigned_admin_id:
        query['assigned_admin_id'] = assigned_admin_id
    if assigned_admin_email:
        query['assigned_admin_email'] = assigned_admin_email
    
    tickets = await SupportTicket.find(query).sort(-SupportTicket.created_at).skip(offset).limit(limit).to_list()
    return tickets


async def get_support_ticket_by_id(ticket_id: str) -> Optional[SupportTicket]:
    """Get a support ticket by ID."""
    try:
        ticket = await SupportTicket.get(ticket_id)
        return ticket
    except Exception:
        return None


async def update_support_ticket_status(
    ticket_id: str,
    status: str,
    admin_response: Optional[str] = None,
    resolved_by: Optional[str] = None
) -> bool:
    """Update support ticket status and admin response."""
    try:
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return False
        
        ticket.status = status
        ticket.updated_at = datetime.now(timezone.utc)
        
        if admin_response:
            ticket.admin_response = admin_response
        
        if resolved_by:
            ticket.resolved_by = resolved_by
        
        if status == 'resolved' and not ticket.resolved_at:
            ticket.resolved_at = datetime.now(timezone.utc)
        
        await ticket.save()
        return True
    except Exception:
        return False


def support_ticket_to_dict(ticket: SupportTicket) -> dict:
    """Convert SupportTicket document to dictionary for API responses."""
    return {
        'id': str(ticket.id),
        'user_id': ticket.user_id,
        'user_name': ticket.user_name,
        'user_email': ticket.user_email,
        'subject': ticket.subject,
        'message': ticket.message,
        'category': ticket.category,
        'priority': ticket.priority,
        'status': ticket.status,
        'admin_response': ticket.admin_response,
        'resolved_by': ticket.resolved_by,
        'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        'assigned_admin_id': ticket.assigned_admin_id,
        'assigned_admin_email': ticket.assigned_admin_email,
        'messages': ticket.messages if hasattr(ticket, 'messages') and ticket.messages else [],
        'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
        'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None
    }
