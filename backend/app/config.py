"""
Configuration management for IMIP application.
Handles environment variables, auto-discovery, and default settings.
"""

import os
import sys
from pathlib import Path
from typing import Optional
import shutil


class Config:
    """Application configuration with environment variable support and auto-discovery."""
    
    def __init__(self):
        # Base paths
        self.BASE_DIR = Path(__file__).parent.parent
        self.DATA_DIR = self.BASE_DIR / "data"
        self.TMP_DIR = self.DATA_DIR / "tmp"
        
        # Create directories if they don't exist
        self.DATA_DIR.mkdir(exist_ok=True)
        self.TMP_DIR.mkdir(exist_ok=True)
        
        # FFmpeg configuration
        self.FFMPEG_BIN = self._get_ffmpeg_path()
        
        # Model paths
        self.VOSK_MODEL_PATH = self._get_vosk_model_path()
        self.HF_HOME = self._get_hf_home()
        self.WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
        
        # API settings
        self.HOST = os.getenv("API_HOST", "0.0.0.0")
        self.PORT = int(os.getenv("API_PORT", os.getenv("PORT", "8000")))
        self.RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
        
        # Environment settings
        self.DEBUG = os.getenv("DEBUG", "true").lower() == "true"
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
        
        # Security settings
        self._setup_cors_origins()
        self.MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(500 * 1024 * 1024)))  # 500MB default
        self.ALLOWED_UPLOAD_EXTENSIONS = os.getenv(
            "ALLOWED_UPLOAD_EXTENSIONS",
            ".wav,.mp3,.m4a,.ogg,.webm,.mp4,.avi,.mov,.mkv,.flv,.wmv,.m4v"
        ).split(",")
        
        # Feature flags
        self.ENABLE_PATH_TRANSCRIPTION = os.getenv("ENABLE_PATH_TRANSCRIPTION", "false").lower() == "true"
        self.PATH_TRANSCRIPTION_DIRS = os.getenv("PATH_TRANSCRIPTION_DIRS", "").split(",") if self.ENABLE_PATH_TRANSCRIPTION else []

        # Cookie-based auth (optional for production)
        self.COOKIE_AUTH_ENABLED = os.getenv("COOKIE_AUTH_ENABLED", "false").lower() == "true"
        self.COOKIE_SECURE = os.getenv("COOKIE_SECURE", "auto").lower()
        # auto -> not secure in DEBUG, secure otherwise; true/false override
        if self.COOKIE_SECURE == "auto":
            self.COOKIE_SECURE = not self.DEBUG
        else:
            self.COOKIE_SECURE = self.COOKIE_SECURE == "true"
        self.COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()  # lax/strict/none
        self.COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "") or None
        self.COOKIE_ACCESS_MAX_AGE = int(os.getenv("COOKIE_ACCESS_MAX_AGE", "3600"))  # 1h
        self.COOKIE_REFRESH_MAX_AGE = int(os.getenv("COOKIE_REFRESH_MAX_AGE", str(7 * 24 * 3600)))  # 7d
        
        # Database
        self.DATABASE_PATH = os.getenv("DATABASE_PATH", str(self.DATA_DIR / "meetings.db"))
        self.DATABASE_URL = os.getenv("DATABASE_URL", "")  # e.g. postgres://user:pass@host:5432/db
        
        # Device settings
        self.DEVICE = os.getenv("DEVICE", "cpu")  # cpu or cuda
        
        # Rate limiting configuration
        self.RATE_LIMIT_LOGIN = os.getenv("RATE_LIMIT_LOGIN", "10/minute")
        self.RATE_LIMIT_LOGIN_ADMIN = os.getenv("RATE_LIMIT_LOGIN_ADMIN", "5/minute")
        self.RATE_LIMIT_TRANSCRIBE = os.getenv("RATE_LIMIT_TRANSCRIBE", "10/minute")
        self.RATE_LIMIT_SUMMARIZE = os.getenv("RATE_LIMIT_SUMMARIZE", "30/minute")
        self.RATE_LIMIT_SAVE = os.getenv("RATE_LIMIT_SAVE", "60/minute")
        self.RATE_LIMIT_REFRESH = os.getenv("RATE_LIMIT_REFRESH", "20/minute")
        
        # Role-based feature flags
        self.ROLE_FEATURES = self._setup_role_features()
        self.ROLE_PERMISSIONS = self._setup_role_permissions()
    
    def _setup_cors_origins(self):
        """Configure CORS origins based on environment."""
        # If explicitly set in env, use that
        env_origins = os.getenv("CORS_ORIGINS")
        if env_origins:
            self.CORS_ORIGINS = [origin.strip() for origin in env_origins.split(",")]
        elif self.ENVIRONMENT == "production":
            # Production: Only allow specific domains
            self.CORS_ORIGINS = [
                # Add your production domains here
                # "https://yourdomain.com",
                # "https://www.yourdomain.com"
            ]
        else:
            # Development: Allow common local ports
            self.CORS_ORIGINS = [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000"
            ]
    
    def _get_ffmpeg_path(self) -> Optional[str]:
        """Auto-discover FFmpeg binary path."""
        # First check environment variable
        env_path = os.getenv("FFMPEG_BIN")
        if env_path and os.path.exists(env_path):
            return env_path
        
        # Check if ffmpeg is in PATH
        ffmpeg_in_path = shutil.which("ffmpeg")
        if ffmpeg_in_path:
            return os.path.dirname(ffmpeg_in_path)
        
        # Windows-specific common locations
        if sys.platform == "win32":
            common_paths = [
                r"C:\ffmpeg\bin",
                r"C:\Program Files\ffmpeg\bin",
                r"C:\Program Files (x86)\ffmpeg\bin",
                os.path.expanduser(r"~\Downloads\Compressed\ffmpeg-release-essentials\ffmpeg-7.1.1-essentials_build\bin"),
                os.path.expanduser(r"~\ffmpeg\bin"),
            ]
            
            for path in common_paths:
                if os.path.exists(path) and os.path.exists(os.path.join(path, "ffmpeg.exe")):
                    return path
        
        # Linux/Mac common locations
        else:
            common_paths = [
                "/usr/local/bin",
                "/usr/bin",
                "/opt/ffmpeg/bin",
                os.path.expanduser("~/ffmpeg/bin"),
            ]
            
            for path in common_paths:
                if os.path.exists(os.path.join(path, "ffmpeg")):
                    return path
        
        return None
    
    def _get_vosk_model_path(self) -> Optional[str]:
        """Auto-discover Vosk model path."""
        # First check environment variable
        env_path = os.getenv("VOSK_MODEL_PATH")
        if env_path and os.path.isdir(env_path):
            return env_path
        
        # Common locations
        common_paths = [
            self.DATA_DIR / "vosk-model-small-en-us-0.15",
            Path.home() / "Downloads" / "Compressed" / "vosk-model-small-en-us-0.15" / "vosk-model-small-en-us-0.15",
            Path.home() / ".cache" / "vosk" / "vosk-model-small-en-us-0.15",
            Path("/opt/vosk/vosk-model-small-en-us-0.15"),
        ]
        
        for path in common_paths:
            if path.exists() and path.is_dir():
                return str(path)
        
        return None
    
    def _get_hf_home(self) -> str:
        """Get or create Hugging Face cache directory."""
        # Check environment variable
        env_path = os.getenv("HF_HOME")
        if env_path:
            Path(env_path).mkdir(parents=True, exist_ok=True)
            return env_path
        
        # Default to user's cache directory
        if sys.platform == "win32":
            default_path = Path.home() / ".cache" / "huggingface"
        else:
            default_path = Path.home() / ".cache" / "huggingface"
        
        default_path.mkdir(parents=True, exist_ok=True)
        return str(default_path)
    
    def _setup_role_features(self) -> dict:
        """Configure feature flags per role.
        
        Returns a dictionary mapping roles to their available features.
        This centralizes role capabilities and makes it easy to expand features.
        """
        return {
            "admin": {
                "can_manage_users": True,
                "can_view_all_meetings": True,
                "can_delete_any_meeting": True,
                "can_change_user_roles": True,
                "can_access_system_settings": True,
                "can_view_analytics": True,
                "can_export_data": True,
                "can_manage_mfa": True,
                "max_file_upload_mb": 500,
                "api_rate_limit_per_minute": 1000,
            },
            "manager": {
                "can_manage_users": False,
                "can_view_all_meetings": True,
                "can_delete_any_meeting": False,
                "can_change_user_roles": False,
                "can_access_system_settings": False,
                "can_view_analytics": True,
                "can_export_data": True,
                "can_manage_mfa": True,
                "max_file_upload_mb": 200,
                "api_rate_limit_per_minute": 500,
            },
            "member": {
                "can_manage_users": False,
                "can_view_all_meetings": False,
                "can_delete_any_meeting": False,
                "can_change_user_roles": False,
                "can_access_system_settings": False,
                "can_view_analytics": False,
                "can_export_data": False,
                "can_manage_mfa": True,
                "max_file_upload_mb": 100,
                "api_rate_limit_per_minute": 200,
            },
            "guest": {
                "can_manage_users": False,
                "can_view_all_meetings": False,
                "can_delete_any_meeting": False,
                "can_change_user_roles": False,
                "can_access_system_settings": False,
                "can_view_analytics": False,
                "can_export_data": False,
                "can_manage_mfa": False,
                "max_file_upload_mb": 50,
                "api_rate_limit_per_minute": 50,
            },
        }
    
    def _setup_role_permissions(self) -> dict:
        """Configure endpoint access permissions per role.
        
        Returns a dictionary defining which roles can access which endpoint patterns.
        """
        return {
            "public": ["*"],  # All roles
            "authenticated": ["admin", "manager", "member", "guest"],
            "elevated": ["admin", "manager"],  # Admin and manager only
            "admin_only": ["admin"],
        }
    
    def has_feature(self, role: str, feature: str) -> bool:
        """Check if a role has access to a specific feature.
        
        Args:
            role: User role (admin, manager, member, guest)
            feature: Feature name (e.g., 'can_manage_users')
        
        Returns:
            True if the role has the feature, False otherwise
        """
        role_features = self.ROLE_FEATURES.get(role, {})
        return role_features.get(feature, False)
    
    def get_role_limit(self, role: str, limit_key: str, default=0):
        """Get a numeric limit for a role.
        
        Args:
            role: User role
            limit_key: Limit name (e.g., 'max_file_upload_mb')
            default: Default value if not found
        
        Returns:
            The limit value for the role
        """
        role_features = self.ROLE_FEATURES.get(role, {})
        return role_features.get(limit_key, default)
    
    def setup_environment(self):
        """Set up environment variables based on configuration."""
        if self.FFMPEG_BIN:
            # Add FFmpeg to PATH if not already there
            if self.FFMPEG_BIN not in os.environ.get('PATH', ''):
                os.environ['PATH'] = self.FFMPEG_BIN + os.pathsep + os.environ.get('PATH', '')
        
        # Set HF_HOME
        os.environ['HF_HOME'] = self.HF_HOME
        
        # Set VOSK_MODEL_PATH if found
        if self.VOSK_MODEL_PATH:
            os.environ['VOSK_MODEL_PATH'] = self.VOSK_MODEL_PATH
    
    def validate(self) -> dict:
        """Validate configuration and return status."""
        status = {
            "ffmpeg": {
                "found": self.FFMPEG_BIN is not None,
                "path": self.FFMPEG_BIN
            },
            "vosk": {
                "found": self.VOSK_MODEL_PATH is not None,
                "path": self.VOSK_MODEL_PATH
            },
            "hf_cache": {
                "path": self.HF_HOME,
                "exists": os.path.exists(self.HF_HOME)
            },
            "database": {
                "path": self.DATABASE_PATH,
                "exists": os.path.exists(self.DATABASE_PATH)
            },
            "temp_dir": {
                "path": str(self.TMP_DIR),
                "exists": self.TMP_DIR.exists()
            }
        }
        
        # Check if ffmpeg is actually executable
        if self.FFMPEG_BIN:
            ffmpeg_exe = os.path.join(self.FFMPEG_BIN, "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
            status["ffmpeg"]["executable"] = os.path.exists(ffmpeg_exe)
        
        return status
    
    def to_dict(self) -> dict:
        """Export configuration as dictionary."""
        return {
            "BASE_DIR": str(self.BASE_DIR),
            "DATA_DIR": str(self.DATA_DIR),
            "TMP_DIR": str(self.TMP_DIR),
            "FFMPEG_BIN": self.FFMPEG_BIN,
            "VOSK_MODEL_PATH": self.VOSK_MODEL_PATH,
            "HF_HOME": self.HF_HOME,
            "WHISPER_MODEL": self.WHISPER_MODEL,
            "HOST": self.HOST,
            "PORT": self.PORT,
            "RELOAD": self.RELOAD,
            "LOG_LEVEL": self.LOG_LEVEL,
            "DEBUG": self.DEBUG,
            "ENVIRONMENT": self.ENVIRONMENT,
            "CORS_ORIGINS": self.CORS_ORIGINS,
            "MAX_UPLOAD_SIZE": self.MAX_UPLOAD_SIZE,
            "ALLOWED_UPLOAD_EXTENSIONS": self.ALLOWED_UPLOAD_EXTENSIONS,
            "ENABLE_PATH_TRANSCRIPTION": self.ENABLE_PATH_TRANSCRIPTION,
            "PATH_TRANSCRIPTION_DIRS": self.PATH_TRANSCRIPTION_DIRS,
            "DATABASE_PATH": self.DATABASE_PATH,
            "DATABASE_URL": self.DATABASE_URL,
            "DEVICE": self.DEVICE,
        }


# Create global config instance
config = Config()
