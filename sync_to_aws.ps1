<#
.SYNOPSIS
  Live 2030 - Instant Local-to-AWS Live Synchronization Tool
.DESCRIPTION
  Syncs local changes to your AWS live server in 1-2 seconds with optional Watch mode and remote log streaming.
.EXAMPLE
  .\sync_to_aws.ps1                 # Single instant full sync
  .\sync_to_aws.ps1 -Watch          # Instant live sync on every file save (Hot-Reload)
  .\sync_to_aws.ps1 -Build          # Rebuild and restart Docker containers on AWS
  .\sync_to_aws.ps1 -Logs           # Stream live logs from AWS
  .\sync_to_aws.ps1 -Setup          # Initialize a fresh AWS EC2 Ubuntu instance
#>

param (
    [switch]$Watch,
    [switch]$Build,
    [switch]$Logs,
    [switch]$Setup,
    [string]$ServerIp = "",
    [string]$KeyPath = ""
)

$ErrorActionPreference = "Stop"
$ConfigFile = Join-Path $PSScriptRoot "aws_config.json"

# Load or prompt for config
$config = @{
    serverIp = ""
    keyPath = ""
    remoteUser = "ubuntu"
    remotePath = "/home/ubuntu/live2030"
}

if (Test-Path $ConfigFile) {
    try {
        $json = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($json.serverIp) { $config.serverIp = $json.serverIp }
        if ($json.keyPath) { $config.keyPath = $json.keyPath }
        if ($json.remoteUser) { $config.remoteUser = $json.remoteUser }
        if ($json.remotePath) { $config.remotePath = $json.remotePath }
    } catch {}
}

if ($ServerIp) { $config.serverIp = $ServerIp }
if ($KeyPath) { $config.keyPath = $KeyPath }

while (-not $config.serverIp) {
    $config.serverIp = Read-Host "Enter your AWS EC2 Public / Elastic IP (e.g. 54.210.xx.xx)"
}

while (-not $config.keyPath -or -not (Test-Path $config.keyPath)) {
    $config.keyPath = Read-Host "Enter the full path to your .pem key file (e.g. C:\Users\Administrator\Downloads\live2030.pem)"
}

# Save updated config
$config | ConvertTo-Json -Depth 4 | Set-Content $ConfigFile -Encoding utf8

$IP = $config.serverIp
$KEY = $config.keyPath
$USER = $config.remoteUser
$REMOTE = $config.remotePath

Write-Host "`nTarget AWS Server: $USER@$IP" -ForegroundColor Cyan
Write-Host "Key: $KEY`n" -ForegroundColor Cyan

# 1. Setup Fresh Instance
if ($Setup) {
    Write-Host "Running deploy_to_aws.sh on remote server..." -ForegroundColor Yellow
    scp -i "$KEY" -o StrictHostKeyChecking=no "$PSScriptRoot\deploy_to_aws.sh" "$USER@${IP}:/tmp/deploy_to_aws.sh"
    ssh -i "$KEY" -o StrictHostKeyChecking=no "$USER@$IP" "chmod +x /tmp/deploy_to_aws.sh && /tmp/deploy_to_aws.sh"
    Write-Host "AWS Server Setup Complete!" -ForegroundColor Green
    exit 0
}

# 2. View Live Logs
if ($Logs) {
    Write-Host "Streaming live logs from AWS backend (Ctrl+C to stop)..." -ForegroundColor Yellow
    ssh -i "$KEY" -o StrictHostKeyChecking=no "$USER@$IP" "sudo docker logs -f --tail 100 live2030_backend"
    exit 0
}

# Function to execute sync
function Push-WorkspaceSync {
    Write-Host "Syncing local project to AWS ($IP)..." -ForegroundColor Yellow
    $startTime = Get-Date

    # Create tar archive excluding bulky and generated folders
    $tarFile = Join-Path $env:TEMP "live2030_sync.tar.gz"
    if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

    $tarExclude = @(
        "--exclude=node_modules",
        "--exclude=.git",
        "--exclude=.next",
        "--exclude=dist",
        "--exclude=build",
        "--exclude=.dart_tool",
        "--exclude=*.tar.gz"
    )

    Push-Location $PSScriptRoot
    tar -czf "$tarFile" $tarExclude -C "$PSScriptRoot" .
    Pop-Location

    # Upload tar and extract on AWS
    scp -i "$KEY" -o StrictHostKeyChecking=no "$tarFile" "$USER@${IP}:/tmp/live2030_sync.tar.gz"
    ssh -i "$KEY" -o StrictHostKeyChecking=no "$USER@$IP" "mkdir -p $REMOTE && tar -xzf /tmp/live2030_sync.tar.gz -C $REMOTE && rm -f /tmp/live2030_sync.tar.gz"
    Remove-Item $tarFile -Force

    $duration = ((Get-Date) - $startTime).TotalSeconds
    Write-Host "Synced in $([math]::Round($duration, 1))s!" -ForegroundColor Green

    if ($Build) {
        Write-Host "Building and restarting containers on AWS..." -ForegroundColor Yellow
        ssh -i "$KEY" -o StrictHostKeyChecking=no "$USER@$IP" "cd $REMOTE && sudo docker compose up -d --build"
        Write-Host "Containers updated and running live!" -ForegroundColor Green
    }
}

# Single run
Push-WorkspaceSync

# 3. Continuous Watch Mode (Hot-Sync)
if ($Watch) {
    Write-Host "`nWATCH MODE ACTIVATED: Monitoring local edits in backend and admin_dashboard..." -ForegroundColor Magenta
    Write-Host "Whenever you save a file, it will sync to AWS automatically. Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $PSScriptRoot
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true
    $watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName

    $action = {
        $path = $Event.SourceEventArgs.FullPath
        if ($path -notmatch "node_modules|\.git|\.next|dist|build|\.dart_tool|\.tmp") {
            Write-Host "Change detected: $(Split-Path $path -Leaf) -> Syncing..." -ForegroundColor Cyan
            Push-WorkspaceSync
        }
    }

    Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
    Register-ObjectEvent $watcher "Created" -Action $action | Out-Null

    while ($true) {
        Start-Sleep -Seconds 1
    }
}
