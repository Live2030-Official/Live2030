@echo off
REM Live 2030 - Instant AWS Sync Batch Launcher
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "%~dp0sync_to_aws.ps1" %*
pause
