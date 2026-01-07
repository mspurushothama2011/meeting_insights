"""
Reset passwords for test users.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app import db_mongo as db
from app.auth import hash_password


async def reset_passwords():
    """Reset passwords for test users."""
    print("🔄 Resetting test user passwords...")
    print("-" * 50)
    
    try:
        await db.init_db()
        
        # Define users and their new passwords
        updates = [
            ('admin@test.com', 'admin123!@#'),
            ('manager@test.com', 'manager123!@#'),
            ('member@test.com', 'member123!@#'),
        ]
        
        for email, new_password in updates:
            # Get user
            user = await db.get_user_by_email(email)
            
            if not user:
                print(f"✗ User '{email}' not found")
                continue
            
            # Update password
            new_hash = hash_password(new_password)
            
            # Use the update_user function
            success = await db.update_user(
                user_id=str(user.id),
                password_hash=new_hash
            )
            
            if success:
                print(f"✅ Updated password for {email}")
            else:
                print(f"✗ Failed to update password for {email}")
        
        await db.close_db()
        
        print()
        print("-" * 50)
        print("🎉 Password reset complete!")
        print()
        print("You can now login with:")
        print("  • admin@test.com / admin123!@#")
        print("  • manager@test.com / manager123!@#")
        print("  • member@test.com / member123!@#")
        print()
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(reset_passwords())
