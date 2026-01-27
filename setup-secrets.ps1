# Secret Management Setup Script
# Run this script to automatically configure GCP secrets for your deployment

Write-Host "🔐 Setting up GCP Secret Manager for your deployment..." -ForegroundColor Green

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host "Please install it first: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Or run: winget install Google.CloudSDK" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green

# Get project info
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "🔧 No project set. Initializing..." -ForegroundColor Yellow
    gcloud init
    $PROJECT_ID = gcloud config get-value project
}

Write-Host "📋 Using project: $PROJECT_ID" -ForegroundColor Blue

# Enable Secret Manager API
Write-Host "🔧 Enabling Secret Manager API..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com
Write-Host "✅ Secret Manager API enabled" -ForegroundColor Green

# Function to create secret with user input
function Create-Secret {
    param (
        [string]$SecretName,
        [string]$Prompt
    )
    
    Write-Host "`n🔐 Setting up $SecretName..." -ForegroundColor Yellow
    $value = Read-Host $Prompt
    
    if ($value) {
        # Create temporary file with the secret
        $tempFile = New-TemporaryFile
        $value | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        
        try {
            # Create the secret
            gcloud secrets create $SecretName --data-file=$tempFile --replication-policy="automatic"
            Write-Host "✅ Secret '$SecretName' created successfully" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Secret '$SecretName' might already exist. Updating..." -ForegroundColor Yellow
            # Add new version if secret exists
            gcloud secrets versions add $SecretName --data-file=$tempFile
            Write-Host "✅ Secret '$SecretName' updated" -ForegroundColor Green
        } finally {
            Remove-Item $tempFile -Force
        }
    } else {
        Write-Host "⚠️  Skipping $SecretName (empty value)" -ForegroundColor Yellow
    }
}

# Create secrets
Create-Secret -SecretName "database-url" -Prompt "Enter your database URL (or press Enter to skip)"
Create-Secret -SecretName "database-password" -Prompt "Enter your database password (or press Enter to skip)"
Create-Secret -SecretName "api-key" -Prompt "Enter your API key (or press Enter to skip)"

# Get Cloud Build service account
Write-Host "`n🔧 Setting up permissions..." -ForegroundColor Yellow
$BUILD_SA = "$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
Write-Host "📋 Cloud Build service account: $BUILD_SA" -ForegroundColor Blue

# Grant permissions to secrets
$secrets = @("database-url", "database-password", "api-key")

foreach ($secret in $secrets) {
    try {
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$BUILD_SA" --role="roles/secretmanager.secretAccessor" --quiet
        Write-Host "✅ Granted access to '$secret'" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not grant access to '$secret' (secret might not exist)" -ForegroundColor Yellow
    }
}

# Verify setup
Write-Host "`n🔍 Verifying secret setup..." -ForegroundColor Yellow
Write-Host "Available secrets:" -ForegroundColor Blue
gcloud secrets list --format="table(name,createTime)" --filter="name:database-url OR name:database-password OR name:api-key"

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "Your secrets are now configured in GCP Secret Manager." -ForegroundColor Cyan
Write-Host "You can now push to GitHub and deploy through Cloud Run." -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. git add . && git commit -m 'Add secret management setup'" -ForegroundColor Gray
Write-Host "2. git push origin main" -ForegroundColor Gray
Write-Host "3. Deploy via GCP Cloud Run with GitHub integration" -ForegroundColor Gray
