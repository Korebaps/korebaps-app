# Real Secret Setup Script - Based on your actual .env files
Write-Host "Setting up GCP Secret Manager for your actual secrets..." -ForegroundColor Green

# Check gcloud
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "Please install Google Cloud SDK first" -ForegroundColor Red
    exit 1
}

# Get project
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "No project set. Running gcloud init..." -ForegroundColor Yellow
    gcloud init
    $PROJECT_ID = gcloud config get-value project
}
Write-Host "Using project: $PROJECT_ID" -ForegroundColor Blue

# Enable Secret Manager
Write-Host "Enabling Secret Manager API..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com

# Create secrets function
function CreateSecret($secretName, $prompt) {
    Write-Host "`nSetting up $secretName..." -ForegroundColor Yellow
    $value = Read-Host $prompt
    
    if ($value) {
        $tempFile = New-TemporaryFile
        $value | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        
        try {
            gcloud secrets create $secretName --data-file=$tempFile --replication-policy="automatic"
            Write-Host "Secret '$secretName' created" -ForegroundColor Green
        } catch {
            gcloud secrets versions add $secretName --data-file=$tempFile
            Write-Host "Secret '$secretName' updated" -ForegroundColor Green
        } finally {
            Remove-Item $tempFile -Force
        }
    }
}

# Create server secrets
Write-Host "`n=== Server Secrets ===" -ForegroundColor Cyan
CreateSecret "db-host" "Enter DB_HOST (mysql-11d32079-tkim5770-0631.g.aivencloud.com)"
CreateSecret "db-port" "Enter DB_PORT (20247)"
CreateSecret "db-name" "Enter DB_NAME (defaultdb)"
CreateSecret "db-user" "Enter DB_USER (backend)"
CreateSecret "db-password" "Enter DB_PASSWORD (your actual password)"
CreateSecret "admin-password" "Enter ADMIN_PASSWORD (admin)"

# Create client secrets
Write-Host "`n=== Client Secrets ===" -ForegroundColor Cyan
CreateSecret "react-app-api-base-url" "Enter REACT_APP_API_BASE_URL (your Cloud Run URL)"
CreateSecret "react-app-youtube-rss-url" "Enter REACT_APP_YOUTUBE_RSS_URL (YouTube RSS URL)"

# Set permissions
Write-Host "`nSetting up permissions..." -ForegroundColor Yellow
$BUILD_SA = "$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

$secrets = @("db-host", "db-port", "db-name", "db-user", "db-password", "admin-password", "react-app-api-base-url", "react-app-youtube-rss-url")
foreach ($secret in $secrets) {
    try {
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$BUILD_SA" --role="roles/secretmanager.secretAccessor" --quiet
        Write-Host "Granted access to '$secret'" -ForegroundColor Green
    } catch {
        Write-Host "Could not grant access to '$secret'" -ForegroundColor Yellow
    }
}

# Verify
Write-Host "`nVerifying setup..." -ForegroundColor Yellow
gcloud secrets list --format="table(name,createTime)" --filter="name:db-host OR name:db-port OR name:db-name OR name:db-user OR name:db-password OR name:admin-password OR name:react-app-api-base-url OR name:react-app-youtube-rss-url"

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Next: git add . && git commit && git push" -ForegroundColor Cyan
Write-Host "Then deploy via GCP Cloud Run with GitHub integration" -ForegroundColor Cyan
