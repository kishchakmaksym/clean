# Локальний запуск Smart Clean через Docker
# Usage: .\deploy\docker-up-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.local.example") {
        Copy-Item ".env.local.example" ".env"
        Write-Host "Created .env from .env.local.example"
    } else {
        Write-Error "Missing .env — copy .env.local.example to .env first."
    }
}

docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build --remove-orphans
docker compose -f docker-compose.yml -f docker-compose.local.yml ps

Write-Host ""
Write-Host "Site:  http://localhost:8080"
Write-Host "API:   http://localhost:8080/api/reviews"
Write-Host "Admin: admin@smartclean.com.ua / (password from .env AdminSeed__Password)"
Write-Host ""
Write-Host "Logs:  docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f"
Write-Host "Stop:  docker compose -f docker-compose.yml -f docker-compose.local.yml down"
