$ErrorActionPreference = "Stop"

function Invoke-RetryPull {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Image,
        [int]$Attempts = 3
    )

    for ($count = 1; $count -le $Attempts; $count++) {
        Write-Host "Pulling $Image (attempt $count/$Attempts)..."
        docker pull $Image

        if ($LASTEXITCODE -eq 0) {
            return
        }

        if ($count -lt $Attempts) {
            Write-Host "Pull failed for $Image, retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }

    throw "Unable to pull $Image after $Attempts attempts."
}

Invoke-RetryPull -Image "maven:3.9.6-eclipse-temurin-21"
Invoke-RetryPull -Image "eclipse-temurin:21-jdk-alpine"

docker compose up --build
