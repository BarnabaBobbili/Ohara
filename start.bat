@echo off
echo Starting Library Management System...
echo.

REM Start backend
echo [1/2] Starting Backend API...
start "Backend API" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo [2/2] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✓ Backend running on http://localhost:8000
echo ✓ Frontend running on http://localhost:5173
echo.
echo Press any key to close this window (services will keep running)...
pause > nul
