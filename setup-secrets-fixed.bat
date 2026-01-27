@echo off
echo 🔐 Starting GCP Secret Manager setup...
powershell -ExecutionPolicy Bypass -File "setup-secrets-fixed.ps1"
pause
