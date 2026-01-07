@echo off
setlocal

echo ===================================================
echo    IMIP Project Launcher
echo ===================================================

REM Check if MongoDB is running (simple check)
tasklist | find "mongod.exe" >nul
if errorlevel 1 (
    echo [WARNING] MongoDB does not appear to be running!
    echo Please make sure MongoDB is started.
    echo.
) else (
    echo [OK] MongoDB process found.
)

REM Start Backend
echo Starting Backend Server...
REM Use direct python executable to avoid activation issues
start "IMIP Backend" cmd /k "cd /d %~dp0backend && ..\venv\Scripts\python.exe main.py"

REM Wait a moment for backend to initialize
timeout /t 5 /nobreak >nul

REM Start Frontend
echo Starting Frontend Server...
start "IMIP Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo    Servers are starting in new windows.
echo    Backend: http://localhost:8000
echo    Frontend: http://localhost:5173
echo ===================================================
echo.
pause
