"""
Brute-force protection module for login attempts.
Implements IP-based and account-based lockout with exponential backoff.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import asyncio


@dataclass
class LoginAttempt:
    """Represents a login attempt with timing information."""
    timestamp: float
    success: bool
    ip_address: str
    email: str


@dataclass
class LockoutStatus:
    """Represents lockout status for an IP or account."""
    failed_attempts: int = 0
    first_attempt_time: Optional[float] = None
    last_attempt_time: Optional[float] = None
    locked_until: Optional[float] = None
    lockout_count: int = 0  # Number of times locked out
    attempts: list = field(default_factory=list)


class BruteForceProtection:
    """
    Brute-force protection system with configurable thresholds and exponential backoff.
    
    Features:
    - IP-based rate limiting
    - Account-based rate limiting
    - Exponential backoff on repeated failures
    - Automatic cleanup of old data
    - Configurable thresholds and lockout durations
    """
    
    def __init__(
        self,
        max_attempts: int = 5,
        lockout_duration: int = 300,  # 5 minutes in seconds
        exponential_backoff: bool = True,
        max_lockout_duration: int = 3600,  # 1 hour max
        window_duration: int = 900,  # 15 minutes
        cleanup_interval: int = 3600  # Cleanup every hour
    ):
        """
        Initialize brute-force protection.
        
        Args:
            max_attempts: Maximum failed attempts before lockout
            lockout_duration: Initial lockout duration in seconds
            exponential_backoff: Enable exponential backoff for repeated violations
            max_lockout_duration: Maximum lockout duration in seconds
            window_duration: Time window to count attempts in seconds
            cleanup_interval: How often to clean up old data in seconds
        """
        self.max_attempts = max_attempts
        self.lockout_duration = lockout_duration
        self.exponential_backoff = exponential_backoff
        self.max_lockout_duration = max_lockout_duration
        self.window_duration = window_duration
        self.cleanup_interval = cleanup_interval
        
        # Storage for IP-based tracking
        self.ip_attempts: Dict[str, LockoutStatus] = defaultdict(LockoutStatus)
        
        # Storage for account-based tracking
        self.account_attempts: Dict[str, LockoutStatus] = defaultdict(LockoutStatus)
        
        # Last cleanup time
        self.last_cleanup = time.time()
    
    def _calculate_lockout_duration(self, lockout_count: int) -> int:
        """
        Calculate lockout duration with exponential backoff.
        
        Args:
            lockout_count: Number of times previously locked out
            
        Returns:
            Lockout duration in seconds
        """
        if not self.exponential_backoff or lockout_count == 0:
            return self.lockout_duration
        
        # Exponential backoff: 2^lockout_count * base_duration
        duration = self.lockout_duration * (2 ** lockout_count)
        return min(duration, self.max_lockout_duration)
    
    def _cleanup_old_data(self):
        """Remove old attempt data to prevent memory bloat."""
        current_time = time.time()
        
        # Only cleanup if interval has passed
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_time = current_time - self.window_duration
        
        # Cleanup IP attempts
        ips_to_remove = []
        for ip, status in self.ip_attempts.items():
            if status.locked_until and status.locked_until < current_time:
                # Remove if lockout has expired and no recent attempts
                if not status.attempts or max(a.timestamp for a in status.attempts) < cutoff_time:
                    ips_to_remove.append(ip)
        
        for ip in ips_to_remove:
            del self.ip_attempts[ip]
        
        # Cleanup account attempts
        accounts_to_remove = []
        for email, status in self.account_attempts.items():
            if status.locked_until and status.locked_until < current_time:
                if not status.attempts or max(a.timestamp for a in status.attempts) < cutoff_time:
                    accounts_to_remove.append(email)
        
        for email in accounts_to_remove:
            del self.account_attempts[email]
        
        self.last_cleanup = current_time
    
    def _prune_old_attempts(self, status: LockoutStatus):
        """Remove attempts outside the time window."""
        current_time = time.time()
        cutoff_time = current_time - self.window_duration
        
        status.attempts = [
            attempt for attempt in status.attempts
            if attempt.timestamp > cutoff_time
        ]
        
        # Recalculate failed attempts based on remaining attempts
        status.failed_attempts = sum(
            1 for attempt in status.attempts
            if not attempt.success
        )
    
    def is_ip_locked(self, ip_address: str) -> Tuple[bool, Optional[int]]:
        """
        Check if an IP address is locked out.
        
        Args:
            ip_address: IP address to check
            
        Returns:
            Tuple of (is_locked, seconds_until_unlock)
        """
        self._cleanup_old_data()
        
        status = self.ip_attempts.get(ip_address)
        if not status or not status.locked_until:
            return False, None
        
        current_time = time.time()
        if status.locked_until > current_time:
            seconds_remaining = int(status.locked_until - current_time)
            return True, seconds_remaining
        
        # Lockout expired, reset
        status.locked_until = None
        return False, None
    
    def is_account_locked(self, email: str) -> Tuple[bool, Optional[int]]:
        """
        Check if an account is locked out.
        
        Args:
            email: Email address to check
            
        Returns:
            Tuple of (is_locked, seconds_until_unlock)
        """
        self._cleanup_old_data()
        
        status = self.account_attempts.get(email)
        if not status or not status.locked_until:
            return False, None
        
        current_time = time.time()
        if status.locked_until > current_time:
            seconds_remaining = int(status.locked_until - current_time)
            return True, seconds_remaining
        
        # Lockout expired, reset
        status.locked_until = None
        return False, None
    
    def record_attempt(
        self,
        ip_address: str,
        email: str,
        success: bool
    ) -> Dict[str, any]:
        """
        Record a login attempt and update lockout status.
        
        Args:
            ip_address: IP address of the attempt
            email: Email address used in attempt
            success: Whether the login was successful
            
        Returns:
            Dictionary with lockout information
        """
        current_time = time.time()
        attempt = LoginAttempt(
            timestamp=current_time,
            success=success,
            ip_address=ip_address,
            email=email
        )
        
        # Update IP tracking
        ip_status = self.ip_attempts[ip_address]
        ip_status.attempts.append(attempt)
        ip_status.last_attempt_time = current_time
        
        if not ip_status.first_attempt_time:
            ip_status.first_attempt_time = current_time
        
        # Update account tracking
        account_status = self.account_attempts[email]
        account_status.attempts.append(attempt)
        account_status.last_attempt_time = current_time
        
        if not account_status.first_attempt_time:
            account_status.first_attempt_time = current_time
        
        # If successful, reset failed attempt counters
        if success:
            ip_status.failed_attempts = 0
            account_status.failed_attempts = 0
            return {
                "locked": False,
                "reason": None,
                "lockout_duration": 0
            }
        
        # Prune old attempts
        self._prune_old_attempts(ip_status)
        self._prune_old_attempts(account_status)
        
        # Increment failed attempt counters
        ip_status.failed_attempts += 1
        account_status.failed_attempts += 1
        
        # Check if lockout threshold reached
        lockout_result = {
            "locked": False,
            "reason": None,
            "lockout_duration": 0,
            "ip_locked": False,
            "account_locked": False
        }
        
        # Check IP lockout
        if ip_status.failed_attempts >= self.max_attempts:
            lockout_duration = self._calculate_lockout_duration(ip_status.lockout_count)
            ip_status.locked_until = current_time + lockout_duration
            ip_status.lockout_count += 1
            lockout_result["locked"] = True
            lockout_result["ip_locked"] = True
            lockout_result["reason"] = "ip"
            lockout_result["lockout_duration"] = lockout_duration
        
        # Check account lockout
        if account_status.failed_attempts >= self.max_attempts:
            lockout_duration = self._calculate_lockout_duration(account_status.lockout_count)
            account_status.locked_until = current_time + lockout_duration
            account_status.lockout_count += 1
            lockout_result["locked"] = True
            lockout_result["account_locked"] = True
            if lockout_result["reason"] == "ip":
                lockout_result["reason"] = "both"
            else:
                lockout_result["reason"] = "account"
            lockout_result["lockout_duration"] = max(
                lockout_result["lockout_duration"],
                lockout_duration
            )
        
        return lockout_result
    
    def reset_ip(self, ip_address: str):
        """Reset lockout status for an IP address (admin function)."""
        if ip_address in self.ip_attempts:
            del self.ip_attempts[ip_address]
    
    def reset_account(self, email: str):
        """Reset lockout status for an account (admin function)."""
        if email in self.account_attempts:
            del self.account_attempts[email]
    
    def get_status(self, ip_address: str = None, email: str = None) -> Dict:
        """
        Get current status for an IP or account.
        
        Args:
            ip_address: IP address to check (optional)
            email: Email address to check (optional)
            
        Returns:
            Status information dictionary
        """
        result = {}
        
        if ip_address:
            ip_status = self.ip_attempts.get(ip_address)
            if ip_status:
                is_locked, remaining = self.is_ip_locked(ip_address)
                result["ip"] = {
                    "failed_attempts": ip_status.failed_attempts,
                    "locked": is_locked,
                    "seconds_remaining": remaining,
                    "lockout_count": ip_status.lockout_count
                }
        
        if email:
            account_status = self.account_attempts.get(email)
            if account_status:
                is_locked, remaining = self.is_account_locked(email)
                result["account"] = {
                    "failed_attempts": account_status.failed_attempts,
                    "locked": is_locked,
                    "seconds_remaining": remaining,
                    "lockout_count": account_status.lockout_count
                }
        
        return result


# Global instance - should be initialized in app startup
brute_force_protection: Optional[BruteForceProtection] = None


def init_brute_force_protection(**kwargs) -> BruteForceProtection:
    """Initialize the global brute-force protection instance."""
    global brute_force_protection
    brute_force_protection = BruteForceProtection(**kwargs)
    return brute_force_protection


def get_brute_force_protection() -> BruteForceProtection:
    """Get the global brute-force protection instance."""
    global brute_force_protection
    if brute_force_protection is None:
        brute_force_protection = BruteForceProtection()
    return brute_force_protection
