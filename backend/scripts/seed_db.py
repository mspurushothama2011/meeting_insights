import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.getcwd())

from app.db_mongo import init_db, User, Meeting, SupportTicket
from app.auth import hash_password

async def seed():
    print("🌱 Starting database seeding...")
    
    # Initialize DB
    await init_db()
    
    # Clear existing data
    await User.find_all().delete()
    await Meeting.find_all().delete()
    await SupportTicket.find_all().delete()
    print("🧹 Cleared existing data")
    
    # Create Users
    users = [
        {
            "email": "admin@example.com",
            "password": "admin123",
            "full_name": "Admin User",
            "role": "admin"
        },
        {
            "email": "manager@example.com",
            "password": "manager123",
            "full_name": "Manager User",
            "role": "manager"
        },
        {
            "email": "user@example.com",
            "password": "user123",
            "full_name": "Regular User",
            "role": "member"
        }
    ]
    
    created_users = {}
    
    for u in users:
        user = User(
            email=u["email"],
            password_hash=hash_password(u["password"]),
            full_name=u["full_name"],
            role=u["role"],
            is_active=True
        )
        await user.insert()
        created_users[u["email"]] = user
        print(f"👤 Created user: {u['email']} (Password: {u['password']})")

    # Create Meetings
    meetings = [
        {
            "user_email": "user@example.com",
            "title": "Weekly Team Sync",
            "transcript": "Okay everyone, let's start the weekly sync. First item is the new design update...",
            "summary": "Weekly sync to discuss design updates.",
            "keywords": ["sync", "design", "planning"],
            "action_items": [{"text": "Review design mockups", "owner": "User", "deadline": "2024-02-01"}]
        },
        {
            "user_email": "user@example.com",
            "title": "Project Kickoff",
            "transcript": "Welcome to the new project kickoff. We are building a meeting intelligence platform...",
            "summary": "Kickoff meeting for the IMIP project.",
            "keywords": ["kickoff", "project", "imip"],
            "action_items": [{"text": "Setup repo", "owner": "Admin", "deadline": "2024-01-20"}]
        },
        {
            "user_email": "manager@example.com",
            "title": "Manager Review",
            "transcript": "Let's review the quarterly goals. I think we are on track...",
            "summary": "Quarterly goal review.",
            "keywords": ["quarterly", "goals", "review"],
            "action_items": []
        }
    ]
    
    for m in meetings:
        user = created_users.get(m["user_email"])
        if user:
            meeting = Meeting(
                user_id=str(user.id),
                title=m["title"],
                transcript=m["transcript"],
                summary=m["summary"],
                keywords=m["keywords"],
                action_items=m["action_items"],
                created_at=datetime.utcnow()
            )
            await meeting.insert()
            print(f"📅 Created meeting: '{m['title']}' for {m['user_email']}")

    print("\n✅ Database seeding completed successfully!")
    print("Check the console output above for login credentials.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
