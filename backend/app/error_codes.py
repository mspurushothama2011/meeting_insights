"""
Error codes taxonomy for IMIP API.
Provides structured error codes for consistent error handling and debugging.
"""

from enum import Enum
from typing import Dict, Any


class ErrorCode(str, Enum):
    """Standardized error codes for the API."""
    
    # Authentication errors (AUTH_4xx)
    AUTH_401_INVALID_TOKEN = "AUTH_401_INVALID_TOKEN"
    AUTH_401_EXPIRED_TOKEN = "AUTH_401_EXPIRED_TOKEN"
    AUTH_401_MISSING_TOKEN = "AUTH_401_MISSING_TOKEN"
    AUTH_401_INVALID_CREDENTIALS = "AUTH_401_INVALID_CREDENTIALS"
    AUTH_401_USER_NOT_FOUND = "AUTH_401_USER_NOT_FOUND"
    AUTH_401_USER_INACTIVE = "AUTH_401_USER_INACTIVE"
    
    # Authorization errors (AUTHZ_4xx)
    AUTHZ_403_FORBIDDEN = "AUTHZ_403_FORBIDDEN"
    AUTHZ_403_ROLE_MISMATCH = "AUTHZ_403_ROLE_MISMATCH"
    AUTHZ_403_INSUFFICIENT_PERMISSIONS = "AUTHZ_403_INSUFFICIENT_PERMISSIONS"
    AUTHZ_403_ADMIN_SELF_OPERATION = "AUTHZ_403_ADMIN_SELF_OPERATION"
    AUTHZ_403_RESOURCE_ACCESS_DENIED = "AUTHZ_403_RESOURCE_ACCESS_DENIED"
    
    # Validation errors (VAL_4xx)
    VAL_400_INVALID_INPUT = "VAL_400_INVALID_INPUT"
    VAL_400_MISSING_FIELD = "VAL_400_MISSING_FIELD"
    VAL_400_INVALID_EMAIL = "VAL_400_INVALID_EMAIL"
    VAL_400_WEAK_PASSWORD = "VAL_400_WEAK_PASSWORD"
    VAL_400_INVALID_FILE_TYPE = "VAL_400_INVALID_FILE_TYPE"
    VAL_400_FILE_TOO_LARGE = "VAL_400_FILE_TOO_LARGE"
    VAL_400_INVALID_ROLE = "VAL_400_INVALID_ROLE"
    VAL_422_VALIDATION_ERROR = "VAL_422_VALIDATION_ERROR"
    
    # Resource errors (RES_4xx)
    RES_404_NOT_FOUND = "RES_404_NOT_FOUND"
    RES_404_USER_NOT_FOUND = "RES_404_USER_NOT_FOUND"
    RES_404_MEETING_NOT_FOUND = "RES_404_MEETING_NOT_FOUND"
    RES_409_ALREADY_EXISTS = "RES_409_ALREADY_EXISTS"
    RES_409_EMAIL_TAKEN = "RES_409_EMAIL_TAKEN"
    
    # Rate limiting errors (RATE_4xx)
    RATE_429_TOO_MANY_REQUESTS = "RATE_429_TOO_MANY_REQUESTS"
    RATE_429_LOGIN_ATTEMPTS_EXCEEDED = "RATE_429_LOGIN_ATTEMPTS_EXCEEDED"
    
    # Server errors (SRV_5xx)
    SRV_500_INTERNAL_ERROR = "SRV_500_INTERNAL_ERROR"
    SRV_500_DATABASE_ERROR = "SRV_500_DATABASE_ERROR"
    SRV_500_OPENAI_ERROR = "SRV_500_OPENAI_ERROR"
    SRV_500_TRANSCRIPTION_ERROR = "SRV_500_TRANSCRIPTION_ERROR"
    SRV_503_SERVICE_UNAVAILABLE = "SRV_503_SERVICE_UNAVAILABLE"
    SRV_503_DATABASE_UNAVAILABLE = "SRV_503_DATABASE_UNAVAILABLE"


class ErrorResponse:
    """Helper class to create structured error responses."""
    
    @staticmethod
    def create(
        code: ErrorCode,
        message: str,
        status_code: int = 400,
        details: Dict[str, Any] = None,
        request_id: str = None
    ) -> Dict[str, Any]:
        """
        Create a structured error response.
        
        Args:
            code: Error code from ErrorCode enum
            message: Human-readable error message
            status_code: HTTP status code
            details: Optional additional details
            request_id: Optional request ID for tracking
            
        Returns:
            Dictionary containing structured error response
        """
        response = {
            "error": {
                "code": code.value,
                "message": message,
                "status": status_code
            }
        }
        
        if details:
            response["error"]["details"] = details
            
        if request_id:
            response["error"]["request_id"] = request_id
            
        return response
    
    @staticmethod
    def from_exception(
        exc: Exception,
        code: ErrorCode = ErrorCode.SRV_500_INTERNAL_ERROR,
        status_code: int = 500,
        request_id: str = None,
        include_traceback: bool = False
    ) -> Dict[str, Any]:
        """
        Create error response from an exception.
        
        Args:
            exc: The exception to convert
            code: Error code to use
            status_code: HTTP status code
            request_id: Optional request ID
            include_traceback: Whether to include traceback in response
            
        Returns:
            Dictionary containing structured error response
        """
        details = {
            "exception_type": type(exc).__name__,
        }
        
        if include_traceback:
            import traceback
            details["traceback"] = traceback.format_exc()
        
        return ErrorResponse.create(
            code=code,
            message=str(exc),
            status_code=status_code,
            details=details,
            request_id=request_id
        )


# Error code to HTTP status code mapping
ERROR_CODE_STATUS_MAP = {
    # 401 Unauthorized
    ErrorCode.AUTH_401_INVALID_TOKEN: 401,
    ErrorCode.AUTH_401_EXPIRED_TOKEN: 401,
    ErrorCode.AUTH_401_MISSING_TOKEN: 401,
    ErrorCode.AUTH_401_INVALID_CREDENTIALS: 401,
    ErrorCode.AUTH_401_USER_NOT_FOUND: 401,
    ErrorCode.AUTH_401_USER_INACTIVE: 401,
    
    # 403 Forbidden
    ErrorCode.AUTHZ_403_FORBIDDEN: 403,
    ErrorCode.AUTHZ_403_ROLE_MISMATCH: 403,
    ErrorCode.AUTHZ_403_INSUFFICIENT_PERMISSIONS: 403,
    ErrorCode.AUTHZ_403_ADMIN_SELF_OPERATION: 403,
    ErrorCode.AUTHZ_403_RESOURCE_ACCESS_DENIED: 403,
    
    # 400 Bad Request
    ErrorCode.VAL_400_INVALID_INPUT: 400,
    ErrorCode.VAL_400_MISSING_FIELD: 400,
    ErrorCode.VAL_400_INVALID_EMAIL: 400,
    ErrorCode.VAL_400_WEAK_PASSWORD: 400,
    ErrorCode.VAL_400_INVALID_FILE_TYPE: 400,
    ErrorCode.VAL_400_FILE_TOO_LARGE: 400,
    ErrorCode.VAL_400_INVALID_ROLE: 400,
    
    # 422 Unprocessable Entity
    ErrorCode.VAL_422_VALIDATION_ERROR: 422,
    
    # 404 Not Found
    ErrorCode.RES_404_NOT_FOUND: 404,
    ErrorCode.RES_404_USER_NOT_FOUND: 404,
    ErrorCode.RES_404_MEETING_NOT_FOUND: 404,
    
    # 409 Conflict
    ErrorCode.RES_409_ALREADY_EXISTS: 409,
    ErrorCode.RES_409_EMAIL_TAKEN: 409,
    
    # 429 Too Many Requests
    ErrorCode.RATE_429_TOO_MANY_REQUESTS: 429,
    ErrorCode.RATE_429_LOGIN_ATTEMPTS_EXCEEDED: 429,
    
    # 500 Internal Server Error
    ErrorCode.SRV_500_INTERNAL_ERROR: 500,
    ErrorCode.SRV_500_DATABASE_ERROR: 500,
    ErrorCode.SRV_500_OPENAI_ERROR: 500,
    ErrorCode.SRV_500_TRANSCRIPTION_ERROR: 500,
    
    # 503 Service Unavailable
    ErrorCode.SRV_503_SERVICE_UNAVAILABLE: 503,
    ErrorCode.SRV_503_DATABASE_UNAVAILABLE: 503,
}


def get_status_code(error_code: ErrorCode) -> int:
    """Get HTTP status code for an error code."""
    return ERROR_CODE_STATUS_MAP.get(error_code, 500)


# Human-readable error messages
ERROR_MESSAGES = {
    ErrorCode.AUTH_401_INVALID_TOKEN: "Invalid authentication token",
    ErrorCode.AUTH_401_EXPIRED_TOKEN: "Authentication token has expired",
    ErrorCode.AUTH_401_MISSING_TOKEN: "Authentication token is required",
    ErrorCode.AUTH_401_INVALID_CREDENTIALS: "Invalid email or password",
    ErrorCode.AUTH_401_USER_NOT_FOUND: "User not found",
    ErrorCode.AUTH_401_USER_INACTIVE: "User account is inactive",
    
    ErrorCode.AUTHZ_403_FORBIDDEN: "Access forbidden",
    ErrorCode.AUTHZ_403_ROLE_MISMATCH: "User role does not match required role",
    ErrorCode.AUTHZ_403_INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this operation",
    ErrorCode.AUTHZ_403_ADMIN_SELF_OPERATION: "Admins cannot modify their own account",
    ErrorCode.AUTHZ_403_RESOURCE_ACCESS_DENIED: "Access to this resource is denied",
    
    ErrorCode.VAL_400_INVALID_INPUT: "Invalid input provided",
    ErrorCode.VAL_400_MISSING_FIELD: "Required field is missing",
    ErrorCode.VAL_400_INVALID_EMAIL: "Invalid email format",
    ErrorCode.VAL_400_WEAK_PASSWORD: "Password does not meet security requirements",
    ErrorCode.VAL_400_INVALID_FILE_TYPE: "Invalid file type",
    ErrorCode.VAL_400_FILE_TOO_LARGE: "File size exceeds maximum allowed",
    ErrorCode.VAL_400_INVALID_ROLE: "Invalid role specified",
    ErrorCode.VAL_422_VALIDATION_ERROR: "Validation error",
    
    ErrorCode.RES_404_NOT_FOUND: "Resource not found",
    ErrorCode.RES_404_USER_NOT_FOUND: "User not found",
    ErrorCode.RES_404_MEETING_NOT_FOUND: "Meeting not found",
    ErrorCode.RES_409_ALREADY_EXISTS: "Resource already exists",
    ErrorCode.RES_409_EMAIL_TAKEN: "Email address is already registered",
    
    ErrorCode.RATE_429_TOO_MANY_REQUESTS: "Too many requests, please try again later",
    ErrorCode.RATE_429_LOGIN_ATTEMPTS_EXCEEDED: "Too many login attempts, account temporarily locked",
    
    ErrorCode.SRV_500_INTERNAL_ERROR: "Internal server error",
    ErrorCode.SRV_500_DATABASE_ERROR: "Database error occurred",
    ErrorCode.SRV_500_OPENAI_ERROR: "OpenAI service error",
    ErrorCode.SRV_500_TRANSCRIPTION_ERROR: "Transcription service error",
    ErrorCode.SRV_503_SERVICE_UNAVAILABLE: "Service temporarily unavailable",
    ErrorCode.SRV_503_DATABASE_UNAVAILABLE: "Database temporarily unavailable",
}


def get_error_message(error_code: ErrorCode) -> str:
    """Get human-readable message for an error code."""
    return ERROR_MESSAGES.get(error_code, "An error occurred")
