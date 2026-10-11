@echo off
REM ==============================================================================
REM LIVE 2030 - PRODUCTION SIGNED RELEASE ANDROID APP BUNDLE (.AAB) BUILD SCRIPT
REM Target Package: com.live2030.live2030
REM Designed for Google Play Console Upload
REM ==============================================================================

echo.
echo ==============================================================================
echo        BUILDING SIGNED PRODUCTION RELEASE ANDROID APP BUNDLE (.AAB)
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Cleaning previous build artifacts...
call flutter clean

echo [2/3] Fetching project dependencies...
call flutter pub get

echo [3/3] Compiling Signed Release App Bundle (.aab) with key.properties...
call flutter build appbundle --release

if %errorlevel% neq 0 (
    echo.
    echo ==============================================================================
    echo [ERROR] Build failed! Please review the error messages above.
    echo ==============================================================================
    pause
    exit /b %errorlevel%
)

echo.
echo ==============================================================================
echo                    PRODUCTION AAB BUILD COMPLETE!
echo ==============================================================================
echo.
echo Your Google Play Console Release AAB file is ready at:
echo build\app\outputs\bundle\release\app-release.aab
echo.
echo Full path:
echo %~dp0build\app\outputs\bundle\release\app-release.aab
echo.
echo Next steps:
echo 1. Open Google Play Console: https://play.google.com/console
echo 2. Select your app: Live2030 (Package: com.live2030.live2030)
echo 3. Go to "Production" (or "Testing" -> "Internal testing" / "Closed testing")
echo 4. Click "Create new release" and upload "app-release.aab".
echo ==============================================================================
echo.
pause
