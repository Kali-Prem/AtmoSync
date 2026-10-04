# PowerShell Development Helper for ATMOSYNC (Windows)
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "ATMOSYNC - Windows Developer Commands" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "  .\run.ps1 install       - Install Python and Node dependencies"
    Write-Host "  .\run.ps1 db-init       - Initialize database schema"
    Write-Host "  .\run.ps1 db-seed       - Seed Delhi NCR monitoring stations"
    Write-Host "  .\run.ps1 test          - Run pytest test suite"
    Write-Host "  .\run.ps1 run-api       - Run FastAPI server (http://localhost:8000)"
    Write-Host "  .\run.ps1 run-web       - Run Next.js server (http://localhost:3000)"
    Write-Host "  .\run.ps1 build-web     - Build Next.js production bundle"
    Write-Host "  .\run.ps1 clean         - Clean pycache and build directories"
}

switch ($Command.ToLower()) {
    "install" {
        Write-Host "Installing Python dependencies..." -ForegroundColor Green
        & .\.venv\Scripts\pip.exe install -r apps\api\requirements.txt
        Write-Host "Installing Frontend dependencies..." -ForegroundColor Green
        Set-Location apps\web
        & npm install
        Set-Location ..\..
    }
    "db-init" {
        & .\.venv\Scripts\python.exe scripts\cli.py db init
    }
    "db-seed" {
        & .\.venv\Scripts\python.exe scripts\cli.py db seed
    }
    "test" {
        & .\.venv\Scripts\pytest.exe -v tests\
    }
    "run-api" {
        Write-Host "Starting FastAPI backend at http://localhost:8000..." -ForegroundColor Cyan
        & .\.venv\Scripts\uvicorn.exe apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload
    }
    "run-web" {
        Write-Host "Starting Next.js frontend at http://localhost:3000..." -ForegroundColor Cyan
        Set-Location apps\web
        & npm run dev
    }
    "build-web" {
        Write-Host "Building Next.js frontend..." -ForegroundColor Cyan
        Set-Location apps\web
        & npm run build
        Set-Location ..\..
    }
    "clean" {
        Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
        Get-ChildItem -Path . -Recurse -Directory -Filter ".pytest_cache" | Remove-Item -Recurse -Force
        if (Test-Path "apps\web\.next") { Remove-Item -Recurse -Force "apps\web\.next" }
        Write-Host "Cache files cleaned." -ForegroundColor Green
    }
    default {
        Show-Help
    }
}
