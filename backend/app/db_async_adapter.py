from app import db
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional

# Re-export models
User = db.User
Meeting = db.Meeting

async def init_db():
    await run_in_threadpool(db.init_db)

async def close_db():
    await run_in_threadpool(db.close_db)

def _to_int(val):
    if val is None:
        return None
    try:
        return int(val)
    except ValueError:
        return None

async def save_meeting(title: str, transcript: str, summary: str, keywords: list = None, action_items: list = None, meta: str = None, user_id: str = None) -> str:
    uid = _to_int(user_id)
    mid = await run_in_threadpool(db.save_meeting, title, transcript, summary, keywords, action_items, meta, uid)
    return str(mid)

async def list_meetings(limit: int = 50, offset: int = 0, user_id: str = None) -> List[Meeting]:
    uid = _to_int(user_id)
    return await run_in_threadpool(db.list_meetings, limit, offset, uid)

async def get_meeting(meeting_id: str) -> Optional[Meeting]:
    mid = _to_int(meeting_id)
    if mid is None:
        return None
    return await run_in_threadpool(db.get_meeting, mid)

async def update_meeting(meeting_id: str, title: str = None, transcript: str = None, summary: str = None, keywords: list = None, action_items: list = None, meta: str = None) -> bool:
    mid = _to_int(meeting_id)
    if mid is None:
        return False
    return await run_in_threadpool(db.update_meeting, mid, title, transcript, summary, keywords, action_items, meta)

async def delete_meeting(meeting_id: str) -> bool:
    mid = _to_int(meeting_id)
    if mid is None:
        return False
    return await run_in_threadpool(db.delete_meeting, mid)

async def count_meetings(user_id: str = None) -> int:
    uid = _to_int(user_id)
    return await run_in_threadpool(db.count_meetings, uid)

async def search_meetings(query: str, limit: int = 10, offset: int = 0, user_id: str = None) -> List[Meeting]:
    uid = _to_int(user_id)
    return await run_in_threadpool(db.search_meetings, query, limit, offset, uid)

async def create_user(email: str, password_hash: str, full_name: str, role: str = 'member') -> str:
    uid = await run_in_threadpool(db.create_user, email, password_hash, full_name, role)
    return str(uid)

async def get_user_by_email(email: str) -> Optional[User]:
    return await run_in_threadpool(db.get_user_by_email, email)

async def get_user_by_id(user_id: str) -> Optional[User]:
    uid = _to_int(user_id)
    if uid is None:
        return None
    return await run_in_threadpool(db.get_user_by_id, uid)

async def update_user(user_id: str, **kwargs) -> bool:
    uid = _to_int(user_id)
    if uid is None:
        return False
    return await run_in_threadpool(db.update_user, uid, **kwargs)

async def list_users(limit: int = 50, offset: int = 0) -> List[User]:
    return await run_in_threadpool(db.list_users, limit, offset)

async def get_all_users() -> List[User]:
    return await run_in_threadpool(db.get_all_users)

async def delete_user(user_id: str) -> bool:
    uid = _to_int(user_id)
    if uid is None:
        return False
    return await run_in_threadpool(db.delete_user, uid)

async def update_user_role(user_id: str, role: str) -> bool:
    uid = _to_int(user_id)
    if uid is None:
        return False
    return await run_in_threadpool(db.update_user_role, uid, role)

async def get_all_meetings() -> List[Meeting]:
    return await run_in_threadpool(db.get_all_meetings)

# Helpers
def meeting_to_dict(m):
    # db.py Meeting object has attributes, need to ensure compatibility
    import json
    keywords = []
    if m.keywords:
        try:
            keywords = json.loads(m.keywords)
        except:
            keywords = []
            
    action_items = []
    if m.action_items:
        try:
            action_items = json.loads(m.action_items)
        except:
            action_items = []
            
    return {
        'id': str(m.id),
        'user_id': str(m.user_id) if m.user_id else None,
        'title': m.title,
        'created_at': m.created_at.isoformat() if m.created_at else None,
        'transcript': m.transcript,
        'summary': m.summary,
        'keywords': keywords,
        'action_items': action_items,
        'meta': m.meta
    }

def user_to_dict(u):
    return {
        'id': str(u.id),
        'email': u.email,
        'full_name': u.full_name,
        'role': u.role,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'updated_at': u.updated_at.isoformat() if u.updated_at else None
    }
