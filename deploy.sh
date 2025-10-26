#!/bin/bash
# Vercel Deployment Quick Start Script
# Run this script to prepare for Vercel deployment

echo "🚀 Photography Booking System - Vercel Deployment Prep"
echo "========================================================"
echo ""

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

echo "✅ Git: $(git --version)"
echo ""

# Initialize Git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - ready for Vercel deployment"
fi

echo ""
echo "📋 Deployment Checklist:"
echo "========================================================"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "⚠️  .env file not found - Copy .env.production and update values"
fi

# Check package.json
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found"
fi

# Check required API file
if [ -f "api/index.js" ]; then
    echo "✅ api/index.js (Vercel entry point) found"
else
    echo "⚠️  api/index.js not found"
fi

# Check vercel.json
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json configuration found"
else
    echo "⚠️  vercel.json not found"
fi

echo ""
echo "📝 Next Steps:"
echo "========================================================"
echo ""
echo "1. Update .env.production with your production values:"
echo "   - MongoDB Atlas URI"
echo "   - Stripe LIVE keys (not test keys!)"
echo "   - Email credentials"
echo "   - Zoho Calendar tokens"
echo "   - All other required variables"
echo ""
echo "2. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "3. Go to https://vercel.com"
echo "   - Sign in with GitHub"
echo "   - Click 'Add New Project'"
echo "   - Select your repository"
echo "   - Let Vercel detect settings (should show Express.js)"
echo ""
echo "4. Add Environment Variables in Vercel:"
echo "   - Go to Project Settings → Environment Variables"
echo "   - Add all variables from .env.production"
echo ""
echo "5. Deploy and Monitor:"
echo "   - Vercel will auto-deploy on push"
echo "   - Check deployments tab for logs"
echo "   - Test all endpoints after deployment"
echo ""
echo "6. Update Stripe Webhook:"
echo "   - Set endpoint URL to: https://your-domain.vercel.app/api/webhooks/stripe"
echo "   - Add signing secret to Vercel env vars"
echo ""
echo "✨ Done! Your app will be live at https://your-project.vercel.app"
echo ""
