"""
Password policy enforcement module.

Implements password strength validation, entropy calculation,
and integration with Have I Been Pwned (HIBP) API for breach detection.
"""

import re
import math
import hashlib
import requests
from typing import Dict, List, Tuple
from dataclasses import dataclass


@dataclass
class PasswordStrength:
    """Password strength assessment result."""
    score: int  # 0-5 (0=very weak, 5=very strong)
    is_valid: bool
    feedback: List[str]
    suggestions: List[str]
    entropy: float
    estimated_crack_time: str
    is_breached: bool = False
    breach_count: int = 0


class PasswordPolicy:
    """
    Password policy enforcer with configurable rules.
    
    Features:
    - Minimum length requirements
    - Character type requirements (uppercase, lowercase, digits, special)
    - Common password blacklist
    - Entropy calculation
    - Password breach detection (HIBP)
    - Strength scoring
    """
    
    def __init__(
        self,
        min_length: int = 8,
        require_uppercase: bool = True,
        require_lowercase: bool = True,
        require_digits: bool = True,
        require_special: bool = True,
        min_entropy: float = 30.0,
        check_breaches: bool = True,
        check_common_passwords: bool = True
    ):
        """
        Initialize password policy.
        
        Args:
            min_length: Minimum password length
            require_uppercase: Require at least one uppercase letter
            require_lowercase: Require at least one lowercase letter
            require_digits: Require at least one digit
            require_special: Require at least one special character
            min_entropy: Minimum entropy bits for password strength
            check_breaches: Check against HIBP breach database
            check_common_passwords: Check against common password list
        """
        self.min_length = min_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digits = require_digits
        self.require_special = require_special
        self.min_entropy = min_entropy
        self.check_breaches = check_breaches
        self.check_common_passwords = check_common_passwords
        
        # Common weak passwords list (subset - in production, use larger list)
        self.common_passwords = {
            'password', 'password123', '12345678', 'qwerty', 'abc123',
            'monkey', '1234567890', 'letmein', 'trustno1', 'dragon',
            'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
            'bailey', 'shadow', '123123', '654321', 'superman',
            'qazwsx', 'michael', 'football', 'password1', 'admin',
            'welcome', 'login', 'admin123', 'root', 'toor',
            'pass', 'test', 'guest', 'user', 'default'
        }
    
    def calculate_entropy(self, password: str) -> float:
        """
        Calculate password entropy (randomness measure).
        
        Args:
            password: Password to analyze
            
        Returns:
            Entropy in bits
        """
        # Determine character pool size
        pool_size = 0
        
        if any(c.islower() for c in password):
            pool_size += 26  # lowercase letters
        if any(c.isupper() for c in password):
            pool_size += 26  # uppercase letters
        if any(c.isdigit() for c in password):
            pool_size += 10  # digits
        if any(not c.isalnum() for c in password):
            pool_size += 32  # special characters (approximate)
        
        # Entropy = length * log2(pool_size)
        if pool_size > 0:
            entropy = len(password) * math.log2(pool_size)
        else:
            entropy = 0
        
        return entropy
    
    def estimate_crack_time(self, entropy: float) -> str:
        """
        Estimate time to crack password based on entropy.
        
        Assumes 10 billion guesses per second (modern GPU).
        
        Args:
            entropy: Password entropy in bits
            
        Returns:
            Human-readable crack time estimate
        """
        guesses = 2 ** entropy
        guesses_per_second = 10_000_000_000  # 10 billion
        seconds = guesses / guesses_per_second
        
        # Convert to human-readable format
        if seconds < 1:
            return "instant"
        elif seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            return f"{int(seconds / 60)} minutes"
        elif seconds < 86400:
            return f"{int(seconds / 3600)} hours"
        elif seconds < 31536000:
            return f"{int(seconds / 86400)} days"
        elif seconds < 31536000 * 100:
            return f"{int(seconds / 31536000)} years"
        else:
            return "centuries"
    
    def check_hibp(self, password: str) -> Tuple[bool, int]:
        """
        Check if password appears in Have I Been Pwned breach database.
        
        Uses k-anonymity model - only sends first 5 chars of SHA-1 hash.
        
        Args:
            password: Password to check
            
        Returns:
            Tuple of (is_breached, breach_count)
        """
        if not self.check_breaches:
            return False, 0
        
        try:
            # Calculate SHA-1 hash
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]
            
            # Query HIBP API with k-anonymity
            url = f"https://api.pwnedpasswords.com/range/{prefix}"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                # Parse response
                hashes = response.text.splitlines()
                for line in hashes:
                    hash_suffix, count = line.split(':')
                    if hash_suffix == suffix:
                        return True, int(count)
                
                return False, 0
            else:
                # API error - fail open (don't block user)
                return False, 0
                
        except Exception as e:
            # Network error or timeout - fail open
            print(f"HIBP check failed: {e}")
            return False, 0
    
    def validate_password(self, password: str) -> PasswordStrength:
        """
        Validate password against policy and assess strength.
        
        Args:
            password: Password to validate
            
        Returns:
            PasswordStrength object with validation results
        """
        feedback = []
        suggestions = []
        is_valid = True
        
        # Check minimum length
        if len(password) < self.min_length:
            is_valid = False
            feedback.append(f"Password must be at least {self.min_length} characters long")
            suggestions.append(f"Add {self.min_length - len(password)} more characters")
        
        # Check character requirements
        if self.require_uppercase and not any(c.isupper() for c in password):
            is_valid = False
            feedback.append("Password must contain at least one uppercase letter")
            suggestions.append("Add an uppercase letter (A-Z)")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            is_valid = False
            feedback.append("Password must contain at least one lowercase letter")
            suggestions.append("Add a lowercase letter (a-z)")
        
        if self.require_digits and not any(c.isdigit() for c in password):
            is_valid = False
            feedback.append("Password must contain at least one digit")
            suggestions.append("Add a number (0-9)")
        
        if self.require_special and not any(not c.isalnum() for c in password):
            is_valid = False
            feedback.append("Password must contain at least one special character")
            suggestions.append("Add a special character (!@#$%^&*)")
        
        # Check against common passwords
        if self.check_common_passwords and password.lower() in self.common_passwords:
            is_valid = False
            feedback.append("This is a commonly used password")
            suggestions.append("Choose a more unique password")
        
        # Check for sequential characters
        if re.search(r'(012|123|234|345|456|567|678|789|abc|bcd|cde|def)', password.lower()):
            feedback.append("Avoid sequential characters")
            suggestions.append("Mix up character order for better security")
        
        # Check for repeated characters
        if re.search(r'(.)\1{2,}', password):
            feedback.append("Avoid repeated characters")
            suggestions.append("Use varied characters")
        
        # Calculate entropy
        entropy = self.calculate_entropy(password)
        
        # Check minimum entropy
        if entropy < self.min_entropy:
            feedback.append(f"Password is not random enough (entropy: {entropy:.1f} bits, minimum: {self.min_entropy} bits)")
            suggestions.append("Use a mix of different character types")
        
        # Estimate crack time
        crack_time = self.estimate_crack_time(entropy)
        
        # Check breach database
        is_breached = False
        breach_count = 0
        if self.check_breaches:
            is_breached, breach_count = self.check_hibp(password)
            if is_breached:
                is_valid = False
                feedback.append(f"⚠️  This password was found in {breach_count:,} data breaches!")
                suggestions.append("Never use a breached password - choose a new one immediately")
        
        # Calculate strength score (0-5)
        score = self._calculate_score(password, entropy, is_breached)
        
        # Add positive feedback
        if is_valid and not feedback:
            feedback.append("✓ Password meets all requirements")
        
        return PasswordStrength(
            score=score,
            is_valid=is_valid,
            feedback=feedback,
            suggestions=suggestions,
            entropy=entropy,
            estimated_crack_time=crack_time,
            is_breached=is_breached,
            breach_count=breach_count
        )
    
    def _calculate_score(self, password: str, entropy: float, is_breached: bool) -> int:
        """
        Calculate password strength score (0-5).
        
        Args:
            password: Password to score
            entropy: Password entropy
            is_breached: Whether password is breached
            
        Returns:
            Score from 0 (very weak) to 5 (very strong)
        """
        if is_breached:
            return 0  # Breached password is always very weak
        
        score = 0
        
        # Length contribution
        if len(password) >= 12:
            score += 2
        elif len(password) >= 10:
            score += 1
        
        # Entropy contribution
        if entropy >= 60:
            score += 2
        elif entropy >= 40:
            score += 1
        
        # Variety contribution
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(not c.isalnum() for c in password)
        
        variety = sum([has_upper, has_lower, has_digit, has_special])
        if variety == 4:
            score += 1
        
        return min(score, 5)  # Cap at 5
    
    def get_strength_label(self, score: int) -> str:
        """Get human-readable strength label."""
        labels = {
            0: "Very Weak",
            1: "Weak",
            2: "Fair",
            3: "Good",
            4: "Strong",
            5: "Very Strong"
        }
        return labels.get(score, "Unknown")
    
    def get_strength_color(self, score: int) -> str:
        """Get color code for strength (for UI)."""
        colors = {
            0: "#dc2626",  # red-600
            1: "#ea580c",  # orange-600
            2: "#f59e0b",  # amber-500
            3: "#eab308",  # yellow-500
            4: "#84cc16",  # lime-500
            5: "#22c55e",  # green-500
        }
        return colors.get(score, "#6b7280")


# Preset policies for different security levels
class PasswordPolicyPresets:
    """Predefined password policies for different security requirements."""
    
    @staticmethod
    def strict() -> PasswordPolicy:
        """Strict policy for high-security applications."""
        return PasswordPolicy(
            min_length=12,
            require_uppercase=True,
            require_lowercase=True,
            require_digits=True,
            require_special=True,
            min_entropy=50.0,
            check_breaches=True,
            check_common_passwords=True
        )
    
    @staticmethod
    def moderate() -> PasswordPolicy:
        """Moderate policy (default - balanced security)."""
        return PasswordPolicy(
            min_length=8,
            require_uppercase=True,
            require_lowercase=True,
            require_digits=True,
            require_special=True,
            min_entropy=30.0,
            check_breaches=True,
            check_common_passwords=True
        )
    
    @staticmethod
    def lenient() -> PasswordPolicy:
        """Lenient policy for low-security applications."""
        return PasswordPolicy(
            min_length=6,
            require_uppercase=False,
            require_lowercase=True,
            require_digits=True,
            require_special=False,
            min_entropy=20.0,
            check_breaches=True,
            check_common_passwords=True
        )
    
    @staticmethod
    def development() -> PasswordPolicy:
        """Very permissive policy for development/testing."""
        return PasswordPolicy(
            min_length=4,
            require_uppercase=False,
            require_lowercase=False,
            require_digits=False,
            require_special=False,
            min_entropy=0.0,
            check_breaches=False,
            check_common_passwords=False
        )


# Global policy instance
_password_policy: PasswordPolicy = None


def init_password_policy(preset: str = "moderate", **kwargs) -> PasswordPolicy:
    """
    Initialize global password policy.
    
    Args:
        preset: Policy preset name ('strict', 'moderate', 'lenient', 'development')
        **kwargs: Additional policy configuration
        
    Returns:
        Initialized PasswordPolicy instance
    """
    global _password_policy
    
    if preset == "strict":
        _password_policy = PasswordPolicyPresets.strict()
    elif preset == "moderate":
        _password_policy = PasswordPolicyPresets.moderate()
    elif preset == "lenient":
        _password_policy = PasswordPolicyPresets.lenient()
    elif preset == "development":
        _password_policy = PasswordPolicyPresets.development()
    else:
        _password_policy = PasswordPolicy(**kwargs)
    
    return _password_policy


def get_password_policy() -> PasswordPolicy:
    """Get the global password policy instance."""
    global _password_policy
    if _password_policy is None:
        _password_policy = PasswordPolicyPresets.moderate()
    return _password_policy


def validate_password(password: str) -> PasswordStrength:
    """
    Validate password using global policy.
    
    Args:
        password: Password to validate
        
    Returns:
        PasswordStrength object
    """
    policy = get_password_policy()
    return policy.validate_password(password)
