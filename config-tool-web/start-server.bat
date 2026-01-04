@echo off
echo Starting local HTTP server...
echo.
echo Open your browser and go to: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
python -m http.server 8000
if errorlevel 1 (
    echo.
    echo Python not found! Trying Python 3...
    python3 -m http.server 8000
    if errorlevel 1 (
        echo.
        echo Python not found! Please install Python or use another HTTP server.
        echo.
        echo Alternative: Use VS Code's "Live Server" extension
        echo Or use: npx http-server
        pause
    )
)

