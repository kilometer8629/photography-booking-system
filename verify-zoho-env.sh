#!/bin/bash

# Verify Zoho API Credentials Are Set in Vercel
# This script shows you EXACTLY what needs to be configured

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     ZOHO API ENVIRONMENT VARIABLES - VERIFICATION GUIDE        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔴 CURRENT STATUS: Environment variables NOT in Vercel production"
echo ""
echo "❌ ERROR IN LOGS:"
echo "   'Zoho OAuth credentials are missing'"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 REQUIRED SETUP - Copy these variables to Vercel:"
echo ""
echo "Go to: https://vercel.com/kilometer8629/photography-booking-system"
echo "Click: Settings → Environment Variables"
echo ""
echo "Then ADD each of these (with their values from your .env file):"
echo ""

# Extract from .env file
if [ -f ".env" ]; then
  echo "From your .env file:"
  echo "─────────────────────────────────────────────────────────────"
  
  vars=(
    "ZOHO_OAUTH_CLIENT_ID"
    "ZOHO_OAUTH_CLIENT_SECRET"
    "ZOHO_OAUTH_REFRESH_TOKEN"
    "ZOHO_ACCOUNTS_BASE_URL"
    "ZOHO_CALENDAR_BASE_URL"
    "ZOHO_CALENDAR_ID"
    "ZOHO_FREEBUSY_USER"
    "ZOHO_OAUTH_REDIRECT_URI"
    "ZOHO_TIMEZONE"
  )
  
  for var in "${vars[@]}"; do
    value=$(grep "^${var}=" .env | cut -d'=' -f2-)
    if [ -n "$value" ]; then
      # Truncate long values for display
      if [ ${#value} -gt 50 ]; then
        display="${value:0:50}..."
      else
        display="$value"
      fi
      echo "✓ $var"
      echo "  Value: $display"
      echo ""
    else
      echo "✗ $var (NOT FOUND)"
      echo ""
    fi
  done
else
  echo "❌ .env file not found!"
  exit 1
fi

echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "🚀 AFTER ADDING VARIABLES:"
echo ""
echo "1. Save all variables in Vercel"
echo "2. Go to Deployments → Click latest (345537e)"
echo "3. Click 'Redeploy'"
echo "4. Wait 2-3 minutes"
echo "5. Visit booking page - availability should now load! ✅"
echo ""
echo "════════════════════════════════════════════════════════════════════"
