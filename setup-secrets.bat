@echo off
echo 🔐 Starting GCP Secret Manager setup...
powershell -ExecutionPolicy Bypass -File "setup-secrets.ps1"
pause
