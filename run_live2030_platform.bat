@echo off
REM ==============================================================================
REM LIVE 2030 — MASTER PLATFORM COMMAND CENTER
REM Package: com.live2030.app
REM ==============================================================================

:menu
cls
echo.
echo ==============================================================================
echo                      LIVE 2030 MASTER PLATFORM LAUNCHER
echo              Bigo Live Enterprise Architecture (1M+ CCU Scalable)
echo ==============================================================================
echo.
echo   [1] Launch Full Production Docker Stack (Postgres, Redis, Backend, Admin)
echo   [2] Start Backend Engine Locally (NestJS + Socket.io + Agora on Port 4000)
echo   [3] Start Enterprise Admin & Agency Portal Locally (Next.js on Port 3000)
echo   [4] Run Flutter Mobile App (Chrome / Desktop / Android)
echo   [5] Run High-Concurrency Signaling Stress Test (10,000+ Sockets)
echo   [6] Build Signed Production Release Android APK
echo   [7] Open AWS Production Architecture Guide
echo   [8] Open Master Client Acceptance Test Matrix
echo   [0] Exit
echo.
echo ==============================================================================
set /p choice="Enter your selection [0-8]: "

if "%choice%"=="1" goto docker_up
if "%choice%"=="2" goto run_backend
if "%choice%"=="3" goto run_admin
if "%choice%"=="4" goto run_mobile
if "%choice%"=="5" goto run_stress
if "%choice%"=="6" goto build_apk
if "%choice%"=="7" goto view_aws
if "%choice%"=="8" goto view_matrix
if "%choice%"=="0" exit /b 0

echo Invalid selection. Please try again.
timeout /t 2 >nul
goto menu

:docker_up
cls
echo Starting full production stack with Docker Compose...
docker-compose up --build -d
echo.
echo Production stack running!
echo - Web Admin & Agency Portal : http://localhost:3000
echo - Backend REST & Swagger    : http://localhost:4000/api/docs
pause
goto menu

:run_backend
cls
echo Starting Backend API and Real-Time Gateway on port 4000...
cd "%~dp0backend"
call npm run build
node dist/main.js
pause
goto menu

:run_admin
cls
echo Starting Enterprise Web Admin & Agency Portal on port 3000...
cd "%~dp0admin_dashboard"
call npm run start
pause
goto menu

:run_mobile
cls
echo Launching Flutter Mobile Client...
cd "%~dp0mobile_app"
flutter run
pause
goto menu

:run_stress
cls
echo Running High-Scale WebSocket & Signaling Concurrency Benchmark...
cd "%~dp0backend"
node tests/stress_test.js
pause
goto menu

:build_apk
cls
echo Compiling signed production release Android APK...
cd "%~dp0mobile_app"
call build_release_apk.bat
pause
goto menu

:view_aws
cls
echo Opening AWS_PRODUCTION_SETUP_GUIDE.md...
start "" "%~dp0AWS_PRODUCTION_SETUP_GUIDE.md"
goto menu

:view_matrix
cls
echo Opening ACCEPTANCE_TEST_MATRIX.md...
start "" "%~dp0ACCEPTANCE_TEST_MATRIX.md"
goto menu
