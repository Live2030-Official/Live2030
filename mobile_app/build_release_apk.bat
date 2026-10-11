@echo off
REM ==============================================================================
REM LIVE 2030 - PRODUCTION RELEASE ANDROID APK BUILD SCRIPT
REM Target Package: com.live2030.live2030
REM ==============================================================================

echo.
echo ==============================================================================
echo              BUILDING SIGNED PRODUCTION RELEASE ANDROID APK
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/4] Cleaning previous build artifacts...
call flutter clean

echo [2/4] Fetching latest production packages...
call flutter pub get

echo [3/4] Running static code analysis verification...
call flutter analyze
if %errorlevel% neq 0 (
    echo [ERROR] Static analysis failed! Please fix issues before compiling release.
    pause
    exit /b %errorlevel%
)

echo [4/4] Compiling optimized release APK with ProGuard and split-per-abi...
call flutter build apk --release --split-per-abi

echo.
echo ==============================================================================
echo                    PRODUCTION BUILD COMPLETE!
echo ==============================================================================
echo Release APKs generated in:
echo build\app\outputs\flutter-apk\
echo.
echo Standard Universal APK: app-release.apk
echo ARM64 (Modern Devices): app-arm64-v8a-release.apk
echo ARMv7 (Legacy Devices): app-armeabi-v7a-release.apk
echo ==============================================================================
echo.
pause
