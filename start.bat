@echo off
REM Starts the whole dev stack (FastAPI backend + Vite frontend) in Docker.
REM Usage: start.bat          -> build if needed, start, open the browser
REM        Ctrl+C             -> stop the containers
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop and try again.
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo Docker is not running. Start Docker Desktop, wait until it is ready, then run this again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo No .env found - copying .env.example. Add your API keys to .env and re-run.
  copy ".env.example" ".env" >nul
)

echo Starting EarningsLens...
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000/docs
echo.

REM Open the browser a few seconds after containers start (first run installs npm packages, so refresh if blank).
start "" /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:5173"

docker compose up --build
docker compose down
