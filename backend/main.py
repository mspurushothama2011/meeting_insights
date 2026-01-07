"""Main entry point for the Intelligent Meeting Insights Platform API server."""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Import and setup configuration
from app.config import config

# Setup environment based on configuration
config.setup_environment()

# Validate configuration
validation_status = config.validate()

from app.api import app

if __name__ == "__main__":
    print("🚀 Starting Intelligent Meeting Insights Platform API...")
    print("📱 React Frontend: http://localhost:5173")
    print(f"🔧 API Server: http://{config.HOST}:{config.PORT}")
    print(f"📚 API Documentation: http://{config.HOST}:{config.PORT}/docs")
    print()
    
    # Print configuration status
    print("📋 Configuration Status:")
    for key, value in validation_status.items():
        if isinstance(value, dict) and 'found' in value:
            status = "✅" if value['found'] else "❌"
            print(f"  {status} {key}: {value.get('path', 'Not found')}")
    print()
    
    uvicorn.run(
        "app.api:app", 
        host=config.HOST, 
        port=config.PORT, 
        reload=config.RELOAD,
        log_level=config.LOG_LEVEL
    )
