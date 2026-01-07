import os
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, event, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, Session, relationship
from sqlalchemy import create_engine, text as sql_text

from app.config import config

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default='member')  # admin, manager, member, guest
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Meeting(Base):
    __tablename__ = 'meetings'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)  # nullable for backwards compatibility
    title = Column(String(255), default='Untitled')
    created_at = Column(DateTime, default=datetime.utcnow)
    transcript = Column(Text)
    summary = Column(Text)
    keywords = Column(Text)  # JSON array of keywords
    action_items = Column(Text)  # JSON array of action items
    meta = Column(Text)
    
    # Relationship
    user = relationship("User", backref="meetings")


def get_engine(sqlite_path: str = 'data/meetings.db'):
    os.makedirs(os.path.dirname(sqlite_path) or '.', exist_ok=True)
    if config.DATABASE_URL:
        # Use DATABASE_URL if provided (e.g., postgres://)
        engine = create_engine(config.DATABASE_URL)
    else:
        engine = create_engine(f'sqlite:///{sqlite_path}', connect_args={"check_same_thread": False})
    return engine


def init_db(engine=None):
    engine = engine or get_engine()
    
    # Create tables
    Base.metadata.create_all(engine)
    
    # If using SQLite, ensure FTS5 virtual table exists and is synced
    if not config.DATABASE_URL or config.DATABASE_URL.startswith('sqlite'):
        with engine.connect() as conn:
            # Check if we need to add new columns to existing tables
            result = conn.execute(sql_text(
                "PRAGMA table_info(meetings)"
            ))
            columns = [row[1] for row in result]
            
            if 'keywords' not in columns:
                conn.execute(sql_text("ALTER TABLE meetings ADD COLUMN keywords TEXT DEFAULT '[]'"))
                conn.commit()
            
            if 'action_items' not in columns:
                conn.execute(sql_text("ALTER TABLE meetings ADD COLUMN action_items TEXT DEFAULT '[]'"))
                conn.commit()
            
            if 'user_id' not in columns:
                conn.execute(sql_text("ALTER TABLE meetings ADD COLUMN user_id INTEGER"))
                conn.commit()
            
            # Check if FTS table exists
            result = conn.execute(sql_text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='meetings_fts'"
            ))
            if not result.fetchone():
                # Create FTS5 virtual table
                conn.execute(sql_text(
                    """CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
                        meeting_id UNINDEXED,
                        title,
                        transcript,
                        summary,
                        keywords,
                        content=meetings,
                        content_rowid=id
                    )"""
                ))
                # Populate FTS table with existing data
                conn.execute(sql_text(
                    """INSERT INTO meetings_fts (meeting_id, title, transcript, summary, keywords)
                       SELECT id, title, transcript, summary, COALESCE(keywords, '') FROM meetings"""
                ))
                conn.commit()


def save_meeting(title: str, transcript: str, summary: str, keywords: list = None, action_items: list = None, meta: str = None, user_id: int = None, engine=None) -> int:
    engine = engine or get_engine()
    with Session(engine) as session:
        m = Meeting(
            title=title, 
            transcript=transcript, 
            summary=summary,
            keywords=json.dumps(keywords) if keywords else '[]',
            action_items=json.dumps(action_items) if action_items else '[]',
            meta=meta or '',
            user_id=user_id
        )
        session.add(m)
        session.commit()
        session.refresh(m)
        
        # Update FTS index for SQLite only
        if not config.DATABASE_URL or config.DATABASE_URL.startswith('sqlite'):
            with engine.connect() as conn:
                conn.execute(sql_text(
                    """INSERT INTO meetings_fts (meeting_id, title, transcript, summary, keywords)
                       VALUES (:id, :title, :transcript, :summary, :keywords)"""
                ), {
                    'id': m.id,
                    'title': m.title,
                    'transcript': m.transcript,
                    'summary': m.summary,
                    'keywords': ' '.join(keywords) if keywords else ''
                })
                conn.commit()
        
        return m.id


def list_meetings(limit: int = 50, offset: int = 0, user_id: int = None, engine=None):
    """List meetings with pagination support. Optionally filter by user_id."""
    engine = engine or get_engine()
    with Session(engine) as session:
        query = session.query(Meeting)
        if user_id is not None:
            query = query.filter(Meeting.user_id == user_id)
        return query.order_by(Meeting.created_at.desc()).offset(offset).limit(limit).all()


def get_meeting(meeting_id: int, engine=None):
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.get(Meeting, meeting_id)


def update_meeting(meeting_id: int, title: str = None, transcript: str = None, summary: str = None, keywords: list = None, action_items: list = None, meta: str = None, engine=None) -> bool:
    """Update a meeting's fields. Returns True if successful."""
    engine = engine or get_engine()
    with Session(engine) as session:
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            return False
        
        if title is not None:
            meeting.title = title
        if transcript is not None:
            meeting.transcript = transcript
        if summary is not None:
            meeting.summary = summary
        if keywords is not None:
            meeting.keywords = json.dumps(keywords)
        if action_items is not None:
            meeting.action_items = json.dumps(action_items)
        if meta is not None:
            meeting.meta = meta
        
        session.commit()
        
        # Update FTS index for SQLite only
        if not config.DATABASE_URL or config.DATABASE_URL.startswith('sqlite'):
            with engine.connect() as conn:
                conn.execute(sql_text(
                    """UPDATE meetings_fts 
                       SET title = :title, transcript = :transcript, summary = :summary, keywords = :keywords
                       WHERE meeting_id = :id"""
                ), {
                    'id': meeting_id,
                    'title': meeting.title,
                    'transcript': meeting.transcript,
                    'summary': meeting.summary,
                    'keywords': ' '.join(json.loads(meeting.keywords)) if meeting.keywords else ''
                })
                conn.commit()
        
        return True


def delete_meeting(meeting_id: int, engine=None) -> bool:
    """Delete a meeting. Returns True if successful."""
    engine = engine or get_engine()
    with Session(engine) as session:
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            return False
        
        session.delete(meeting)
        session.commit()
        
        # Delete from FTS index for SQLite only
        if not config.DATABASE_URL or config.DATABASE_URL.startswith('sqlite'):
            with engine.connect() as conn:
                conn.execute(sql_text(
                    "DELETE FROM meetings_fts WHERE meeting_id = :id"
                ), {'id': meeting_id})
                conn.commit()
        
        return True


def count_meetings(user_id: int = None, engine=None) -> int:
    """Count total number of meetings. Optionally filter by user_id."""
    engine = engine or get_engine()
    with Session(engine) as session:
        query = session.query(Meeting)
        if user_id is not None:
            query = query.filter(Meeting.user_id == user_id)
        return query.count()


def search_meetings(query: str, limit: int = 10, offset: int = 0, user_id: int = None, engine=None):
    """Full-text search: use SQLite FTS5 if SQLite; simple LIKE fallback for Postgres until tsvector is added."""
    engine = engine or get_engine()
    
    if not query or not query.strip():
        # If no query, return recent meetings
        return list_meetings(limit=limit, offset=offset, user_id=user_id, engine=engine)
    
    if not config.DATABASE_URL or config.DATABASE_URL.startswith('sqlite'):
        with engine.connect() as conn:
            # Use FTS5 MATCH for full-text search
            where_clause = "meetings_fts MATCH :query"
            params = {'query': query, 'limit': limit, 'offset': offset}
            
            if user_id is not None:
                where_clause += " AND m.user_id = :user_id"
                params['user_id'] = user_id
            
            results = conn.execute(sql_text(
                f"""SELECT m.* FROM meetings m
                   JOIN meetings_fts fts ON m.id = fts.meeting_id
                   WHERE {where_clause}
                   ORDER BY rank
                   LIMIT :limit OFFSET :offset"""
            ), params)
            
            meetings = []
            for row in results:
                meeting = Meeting(
                    id=row.id,
                    title=row.title,
                    created_at=row.created_at,
                    transcript=row.transcript,
                    summary=row.summary,
                    keywords=row.keywords,
                    action_items=row.action_items,
                    meta=row.meta
                )
                meetings.append(meeting)
            
            return meetings
    else:
        # Simple LIKE fallback for Postgres (replace with tsvector later)
        with engine.connect() as conn:
            where_clause = "(title ILIKE :q OR summary ILIKE :q OR transcript ILIKE :q)"
            params = {'q': f'%{query}%', 'limit': limit, 'offset': offset}
            
            if user_id is not None:
                where_clause += " AND user_id = :user_id"
                params['user_id'] = user_id
            
            results = conn.execute(sql_text(
                f"""SELECT * FROM meetings
                   WHERE {where_clause}
                   ORDER BY created_at DESC
                   LIMIT :limit OFFSET :offset"""
            ), params)
            meetings = []
            for row in results:
                meeting = Meeting(
                    id=row.id,
                    title=row.title,
                    created_at=row.created_at,
                    transcript=row.transcript,
                    summary=row.summary,
                    keywords=row.keywords,
                    action_items=row.action_items,
                    meta=row.meta
                )
                meetings.append(meeting)
            return meetings


# ============= User Management Functions =============

def create_user(email: str, password_hash: str, full_name: str, role: str = 'member', engine=None) -> int:
    """Create a new user. Returns user ID."""
    engine = engine or get_engine()
    with Session(engine) as session:
        user = User(
            email=email.lower(),
            password_hash=password_hash,
            full_name=full_name,
            role=role
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user.id


def get_user_by_email(email: str, engine=None):
    """Get user by email address."""
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.query(User).filter(User.email == email.lower()).first()


def get_user_by_id(user_id: int, engine=None):
    """Get user by ID."""
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.get(User, user_id)


def update_user(user_id: int, **kwargs):
    """Update user fields."""
    engine = kwargs.pop('engine', None) or get_engine()
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            return False
        
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        session.commit()
        return True


def list_users(limit: int = 50, offset: int = 0, engine=None):
    """List all users with pagination."""
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.query(User).filter(User.is_active == True).offset(offset).limit(limit).all()


def get_all_users(engine=None):
    """Get all users (including inactive). Admin function."""
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.query(User).all()


def delete_user(user_id: int, engine=None) -> bool:
    """Delete a user permanently. Returns True if successful."""
    engine = engine or get_engine()
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            return False
        
        session.delete(user)
        session.commit()
        return True


def update_user_role(user_id: int, role: str, engine=None) -> bool:
    """Update a user's role. Returns True if successful."""
    return update_user(user_id, role=role, engine=engine)


def get_all_meetings(engine=None):
    """Get all meetings from all users. Admin function."""
    engine = engine or get_engine()
    with Session(engine) as session:
        return session.query(Meeting).order_by(Meeting.created_at.desc()).all()


def close_db():
    """Close DB connection (no-op for SQLite/SQLAlchemy as engine manages pool)."""
    pass

