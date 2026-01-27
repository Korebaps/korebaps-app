# Secret Management Setup Guide

This guide explains how to set up and manage secrets for your statcalculator deployment on GCP Cloud Run.

## Overview

- **Local Development**: Use `.env` files (excluded from git)
- **Production**: Use GCP Secret Manager
- **Deployment**: Cloud Build automatically injects secrets into Cloud Run

## Setup Steps

### 1. Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env` (never commit this file)

3. Install dotenv if not already installed:
   ```bash
   npm install dotenv
   ```

### 2. GCP Secret Manager Setup

1. Enable the Secret Manager API:
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. Create secrets for your sensitive data:
   ```bash
   # Create database URL secret
   echo "your-database-url" | gcloud secrets create database-url --data-file=-
   
   # Create database password secret
   echo "your-database-password" | gcloud secrets create database-password --data-file=-
   
   # Create API key secret
   echo "your-api-key" | gcloud secrets create api-key --data-file=-
   ```

3. Grant Cloud Build access to secrets:
   ```bash
   # Get the Cloud Build service account
   PROJECT_ID=$(gcloud config get-value project)
   BUILD_SA=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com
   
   # Grant access to secrets
   gcloud secrets add-iam-policy-binding database-url \
       --member="serviceAccount:$BUILD_SA" --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding database-password \
       --member="serviceAccount:$BUILD_SA" --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding api-key \
       --member="serviceAccount:$BUILD_SA" --role="roles/secretmanager.secretAccessor"
   ```

### 3. Update Secrets

To update a secret:
```bash
# Update existing secret
echo "new-value" | gcloud secrets versions add database-url --data-file=-
```

### 4. Access Secrets in Code

In your application, access environment variables as usual:
```javascript
// Using dotenv for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

## Security Best Practices

- ✅ `.env` files are excluded from git via `.gitignore`
- ✅ Production secrets are stored in GCP Secret Manager
- ✅ Secrets are injected at runtime, not build time
- ✅ Principle of least privilege for service accounts
- ✅ Regular secret rotation recommended

## Troubleshooting

### Secret Access Denied
Ensure the Cloud Build service account has the `roles/secretmanager.secretAccessor` role.

### Environment Variables Not Available
Check that:
1. Secrets are properly configured in `cloudbuild.yaml`
2. Secret names match exactly
3. Service account has proper permissions

### Local Development Issues
Verify:
1. `.env` file exists and is properly formatted
2. `dotenv` is installed and configured
3. Variables are loaded before use

## File Structure

```
.
├── .env                 # Local secrets (gitignored)
├── .env.example         # Example configuration
├── .gitignore          # Excludes .env files
├── cloudbuild.yaml     # Deployment config with secrets
└── SECRETS_SETUP.md    # This guide
```
