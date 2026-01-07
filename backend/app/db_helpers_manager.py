# Manager/Team helper functions for reports and analytics
from datetime import datetime
from typing import Optional, List

async def get_team_members_with_stats() -> List[dict]:
    """Get all team members with their meeting statistics."""
    users = await User.find(User.role != 'admin', User.is_active == True).to_list()
    
    result = []
    for user in users:
        user_id = str(user.id)
        meeting_count = await Meeting.find(Meeting.user_id == user_id).count()
        last_meeting = await Meeting.find(Meeting.user_id == user_id).sort(-Meeting.created_at).first_or_none()
        last_meeting_date = last_meeting.created_at if last_meeting else None
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
    """Get aggregated team statistics."""
    query = {}
    if date_from or date_to:
        query['created_at'] = {}
        if date_from:
            query['created_at']['$gte'] = date_from
        if date_to:
            query['created_at']['$lte'] = date_to
    
    all_meetings = await Meeting.find(query).to_list() if query else await Meeting.find().to_list()
    total_meetings = len(all_meetings)
    total_action_items = sum(len(m.action_items) for m in all_meetings if m.action_items)
    user_ids = list(set(m.user_id for m in all_meetings))
    active_members = len(user_ids)
    
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
    }


async def get_meetings_in_date_range(date_from: datetime, date_to: datetime) -> List[Meeting]:
    """Get meetings within a date range."""
    query = {
        'created_at': {
            '$gte': date_from,
            '$lte': date_to
        }
    }
    meetings = await Meeting.find(query).sort(-Meeting.created_at).to_list()
    return meetings


async def get_action_items_summary() -> dict:
    """Get summary of all action items across team."""
    meetings = await Meeting.find().to_list()
    
    all_action_items = []
    for meeting in meetings:
        if meeting.action_items:
            for item in meeting.action_items:
                all_action_items.append({
                    'meeting_id': str(meeting.id),
                    'meeting_title': meeting.title,
                    'user_id': meeting.user_id,
                    'action_item': item.get('task', str(item)) if isinstance(item, dict) else str(item),
                    'created_at': meeting.created_at.isoformat() if meeting.created_at else None
                })
    
    return {
        'total_action_items': len(all_action_items),
        'action_items': all_action_items
    }
