@echo off
echo Setting up GCP Secret Manager for your actual secrets...
powershell -ExecutionPolicy Bypass -File "setup-real.ps1"
pause
