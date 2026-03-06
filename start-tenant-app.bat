@echo off
echo ==========================================
echo   Starting Tenant Management App...
echo ==========================================

:: Start Backend Server
echo.
echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd /d C:\Users\sanja\tenant-management\server && npm start"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend Server
echo [2/2] Starting Frontend (React)...
start "Frontend Server" cmd /k "cd /d C:\Users\sanja\tenant-management\client && npm run dev"

echo.
echo ==========================================
echo   App is starting up!
echo   Backend  -> http://localhost:5000
echo   Frontend -> http://localhost:5173
echo ==========================================
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the app.
pause