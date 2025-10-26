# ✅ GitHub & Vercel Deployment - Complete Instructions

## What You Need to Do

You asked to complete the GitHub update and Vercel connection. Here's exactly what to do:

---

## 📋 Follow These 6 Phases (35 minutes total)

### Phase 1: Git Setup (5 min)
**PowerShell Commands:**
```powershell
cd "c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main"
git init
git add .
git commit -m "Initial commit - Photography Booking System ready for Vercel"
```

✅ **If you see:** "X files changed" message → Success!

---

### Phase 2: GitHub Setup (5 min)
**In Browser:**
1. Go to: https://github.com/new
2. Create repository named: `photography-booking`
3. Click **Create repository**
4. GitHub shows you commands
5. Copy those exact commands

---

### Phase 3: Push to GitHub (2 min)
**PowerShell Commands (from GitHub):**
```powershell
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

✅ **If you see:** All files uploaded to GitHub → Success!

---

### Phase 4: Connect Vercel (5 min)
**In Browser:**
1. Go to: https://vercel.com
2. Sign In with GitHub
3. Click **Add New Project**
4. Select `photography-booking` repository
5. Click **Import**
6. Wait for import (build may fail - OK!)

---

### Phase 5: Add Environment Variables (10 min)
**In Vercel Dashboard:**
1. Click **Settings** → **Environment Variables**
2. Add all variables from `.env.production`
3. Fill in YOUR values (MongoDB, Stripe, Email, etc.)
4. Click **Save**
5. Vercel auto-redeploys

✅ **When you see:** Green checkmark in Deployments → Success!

---

### Phase 6: Configure Stripe Webhook (5 min)
**In Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com
2. Click **Developers** → **Webhooks** → **Add endpoint**
3. Endpoint URL: `https://your-project-name.vercel.app/api/webhooks/stripe`
4. Select events: checkout.session.completed, payment_intent.succeeded, charge.failed
5. Copy signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel
7. Redeploy

---

## 📖 Detailed Instructions

I've created 2 comprehensive guides for you:

1. **`GITHUB-VERCEL-SETUP-INSTRUCTIONS.md`** - Full step-by-step guide (with screenshots tips)
2. **`GITHUB-VERCEL-CHECKLIST.md`** - Quick checklist to follow

Open and follow these files for detailed instructions!

---

## 🚀 Quick Start

### Prerequisites (Do First)
```
☐ Install Git: https://git-scm.com/download/win
☐ Create GitHub account: https://github.com
☐ Create Vercel account: https://vercel.com
```

### Commands to Run in PowerShell
```powershell
# Phase 1: Initialize Git
cd "c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main"
git init
git add .
git commit -m "Initial commit - ready for Vercel"

# Phase 2-3: Connect to GitHub (commands from github.com/new)
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

### In Vercel Dashboard
```
1. Import GitHub repo
2. Add environment variables
3. Redeploy
4. Configure Stripe webhook
5. Done! ✅
```

---

## 📁 Files I Created for You

1. **`GITHUB-VERCEL-SETUP-INSTRUCTIONS.md`** - Complete step-by-step with all details
2. **`GITHUB-VERCEL-CHECKLIST.md`** - Quick reference checklist

Use these to guide you through the process!

---

## ✅ Success Indicators

### After Each Phase, Check:
- ✅ Phase 1: Git initialized (see `.git` folder)
- ✅ Phase 2: GitHub repo created (see your repository)
- ✅ Phase 3: Code pushed to GitHub (files visible)
- ✅ Phase 4: Vercel imported (see deployments)
- ✅ Phase 5: Env vars added (see green checkmark)
- ✅ Phase 6: Webhook configured (Stripe dashboard)

---

## 🎯 Your Final URLs

After completing all phases:
- **Main Site:** `https://photography-booking-main.vercel.app` (or your chosen name)
- **Booking:** `https://your-domain.vercel.app/booking.html`
- **Admin:** `https://your-domain.vercel.app/admin.html`
- **API Health:** `https://your-domain.vercel.app/api/admin/health`

---

## 📚 Next Steps

1. **Read:** `GITHUB-VERCEL-CHECKLIST.md` (quick reference)
2. **Follow:** `GITHUB-VERCEL-SETUP-INSTRUCTIONS.md` (detailed steps)
3. **Execute:** Phase by phase in order
4. **Test:** Verify each phase completed
5. **Deploy:** Your site goes live! 🎉

---

**You're all set! Follow the instructions in the guides and your site will be live in ~35 minutes! 🚀**
