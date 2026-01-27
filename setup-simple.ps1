# Simple Secret Setup Script
Write-Host "Starting GCP Secret Manager setup..." -ForegroundColor Green

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

# Create each secret
CreateSecret "database-url" "Enter your database URL (or press Enter to skip)"
CreateSecret "database-password" "Enter your database password (or press Enter to skip)"
CreateSecret "api-key" "Enter your API key (or press Enter to skip)"

# Set permissions
Write-Host "`nSetting up permissions..." -ForegroundColor Yellow
$BUILD_SA = "$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

$secrets = @("database-url", "database-password", "api-key")
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
gcloud secrets list --format="table(name,createTime)" --filter="name:database-url OR name:database-password OR name:api-key"

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Next: git add . && git commit && git push" -ForegroundColor Cyan
