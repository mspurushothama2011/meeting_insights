"""Authorization utilities for role-based access control.

This module provides dependency functions for FastAPI endpoints to enforce
role-based access control (RBAC).
"""
from fastapi import Depends, HTTPException
from typing import Callable


def require_roles(*allowed_roles: str) -> Callable:
    """Create a dependency that requires user to have one of the allowed roles.
    
    This function returns a FastAPI dependency that checks if the current user
    has one of the specified roles. If not, it raises a 403 Forbidden exception.
    
    Args:
        *allowed_roles: One or more role names (e.g., 'admin', 'manager', 'member')
    
    Returns:
        Callable: Dependency function that checks user role
        
    Raises:
        HTTPException: 403 if user doesn't have required role
        
    Example:
        ```python
        @app.get('/admin/users')
        async def list_users(current_user = Depends(require_roles('admin'))):
            # Only admins can access this endpoint
            ...
        ```
    """
    # Import here to avoid circular imports
    from app.api import get_current_user
    
    async def role_checker(current_user = Depends(get_current_user)):
        """Check if current user has one of the required roles."""
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# Convenience aliases for common role combinations
require_admin = require_roles('admin')
"""Require admin role only."""

require_manager_or_admin = require_roles('manager', 'admin')
"""Require manager or admin role."""

require_member_or_above = require_roles('member', 'manager', 'admin')
"""Require member, manager, or admin role (excludes guests)."""

require_any_authenticated = require_roles('guest', 'member', 'manager', 'admin')
"""Require any authenticated user (any role)."""
