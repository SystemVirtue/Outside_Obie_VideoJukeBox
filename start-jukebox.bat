@echo off
echo --- Starting Jukebox Docker Container ---
cd /d "%~dp0"

REM Basic check if docker command exists (doesn't guarantee daemon is running)
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker command not found or Docker Desktop is not running.
    echo Please install/start Docker Desktop and ensure 'docker' is in your PATH.
    pause
    exit /b 1
)

echo Building and starting container...
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ERROR: docker-compose failed. Please check the output above.
    pause
    exit /b 1
)

echo.
echo --- Jukebox should be running ---
echo Opening browser windows (please wait a few seconds)...

REM Wait for server startup (timeout command acts like sleep)
timeout /t 5 /nobreak > nul

start http://localhost:8000
timeout /t 1 /nobreak > nul
start http://localhost:8000/player.html

echo.
echo Access Jukebox at: http://localhost:8000
echo Access Player at:  http://localhost:8000/player.html
echo To stop the jukebox, open Command Prompt in this directory (%cd%) and run: docker-compose down
echo.
pause