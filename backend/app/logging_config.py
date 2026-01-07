"""Structured JSON logging configuration for production observability."""
import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON string with log data
        """
        log_data: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add request ID if available
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        # Add user ID if available
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        
        # Add extra fields if available
        if hasattr(record, 'extra'):
            log_data['extra'] = record.extra
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        # Add stack info if present
        if record.stack_info:
            log_data['stack_info'] = record.stack_info
        
        return json.dumps(log_data)


class ColoredConsoleFormatter(logging.Formatter):
    """Colored console formatter for development."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
    }
    RESET = '\033[0m'
    BOLD = '\033[1m'
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors for console.
        
        Args:
            record: Log record to format
            
        Returns:
            Colored string for console output
        """
        # Get color for level
        level_color = self.COLORS.get(record.levelname, '')
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # Format message
        message = record.getMessage()
        
        # Add request ID if available
        request_id = getattr(record, 'request_id', '')
        request_id_str = f' [{request_id[:8]}]' if request_id else ''
        
        # Build log line
        log_line = (
            f'{level_color}{self.BOLD}{record.levelname:8s}{self.RESET} '
            f'{timestamp} '
            f'{record.name}:{record.funcName}:{record.lineno}{request_id_str} - '
            f'{message}'
        )
        
        # Add exception if present
        if record.exc_info:
            log_line += '\n' + self.formatException(record.exc_info)
        
        return log_line


def setup_logging(
    log_level: str = 'INFO',
    use_json: bool = False,
    log_file: str = None
) -> logging.Logger:
    """Setup structured logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: Use JSON formatter instead of colored console
        log_file: Optional file path for log output
        
    Returns:
        Configured logger instance
    """
    # Get or create logger
    logger = logging.getLogger('imip')
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    if use_json:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(ColoredConsoleFormatter())
    
    logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


# Default logger instance
logger = setup_logging()


class LoggerAdapter(logging.LoggerAdapter):
    """Custom logger adapter for adding context to log messages."""
    
    def process(self, msg, kwargs):
        """Add extra context to log message.
        
        Args:
            msg: Log message
            kwargs: Keyword arguments
            
        Returns:
            Tuple of (message, kwargs)
        """
        # Add context from extra dict
        if 'extra' not in kwargs:
            kwargs['extra'] = {}
        
        # Merge context from adapter
        kwargs['extra'].update(self.extra)
        
        return msg, kwargs


def get_logger_with_context(request_id: str = None, user_id: str = None) -> LoggerAdapter:
    """Get logger with request/user context.
    
    Args:
        request_id: Request ID to include in logs
        user_id: User ID to include in logs
        
    Returns:
        Logger adapter with context
    """
    context = {}
    if request_id:
        context['request_id'] = request_id
    if user_id:
        context['user_id'] = user_id
    
    return LoggerAdapter(logger, context)


# Example usage functions
def log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: int,
    request_id: str = None,
    user_id: str = None
):
    """Log API request with structured data.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
        request_id: Optional request ID
        user_id: Optional user ID
    """
    context_logger = get_logger_with_context(request_id, user_id)
    
    log_data = {
        'method': method,
        'path': path,
        'status_code': status_code,
        'duration_ms': duration_ms,
    }
    
    context_logger.info(
        f'{method} {path} {status_code} {duration_ms}ms',
        extra={'api_request': log_data}
    )


def log_database_query(
    operation: str,
    collection: str,
    duration_ms: int,
    request_id: str = None
):
    """Log database query with structured data.
    
    Args:
        operation: Database operation (find, insert, update, delete)
        collection: Collection name
        duration_ms: Query duration in milliseconds
        request_id: Optional request ID
    """
    context_logger = get_logger_with_context(request_id)
    
    log_data = {
        'operation': operation,
        'collection': collection,
        'duration_ms': duration_ms,
    }
    
    context_logger.debug(
        f'DB {operation} on {collection} took {duration_ms}ms',
        extra={'db_query': log_data}
    )


def log_error(
    error_type: str,
    message: str,
    request_id: str = None,
    user_id: str = None,
    exc_info: bool = True
):
    """Log error with structured data.
    
    Args:
        error_type: Type of error
        message: Error message
        request_id: Optional request ID
        user_id: Optional user ID
        exc_info: Include exception info
    """
    context_logger = get_logger_with_context(request_id, user_id)
    
    log_data = {
        'error_type': error_type,
    }
    
    context_logger.error(
        message,
        exc_info=exc_info,
        extra={'error': log_data}
    )
