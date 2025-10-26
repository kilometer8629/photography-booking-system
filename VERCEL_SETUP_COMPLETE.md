# 🎯 Vercel Deployment - Complete Setup Summary

## ✅ Deployment Files Created

Your Photography Booking system is ready for Vercel deployment. Here's what was set up:

### Configuration Files
1. **`vercel.json`** ✅
   - Vercel serverless configuration
   - Framework detection (Express.js)
   - Build and deployment settings
   - Rewrite rules for API and static files

2. **`api/index.js`** ✅
   - Serverless function entry point
   - All Express routes and middleware
   - MongoDB integration
   - Email and Stripe handling

3. **`.env.production`** ✅
   - Environment template with all required variables
   - Copy and fill with your production values

4. **`vercel.json`** ✅
   - Deployment configuration

### Documentation Files
1. **`VERCEL_DEPLOYMENT_GUIDE.md`** (350+ lines) ✅
   - Complete step-by-step deployment guide
   - Troubleshooting section
   - MongoDB configuration
   - Stripe webhook setup
   - Performance tips

2. **`VERCEL_QUICK_REFERENCE.md`** (1-page) ✅
   - Quick reference card
   - Critical environment variables
   - 5-minute deployment steps
   - Common errors and fixes

3. **`deploy.sh`** ✅
   - Deployment preparation script
   - Prerequisite checker
   - Next steps guide

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Prepare GitHub Repository
```powershell
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Connect Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Select your GitHub repository
4. Click "Import"

### Step 3: Add Environment Variables
1. In Vercel Dashboard → Settings → Environment Variables
2. Copy all variables from `.env.production`
3. Update with YOUR values:
   - `CLIENT_URL`: Your Vercel domain
   - `MONGODB_URI`: Your MongoDB Atlas connection
   - `STRIPE_SECRET_KEY`: Your LIVE Stripe key (sk_live_...)
   - `STRIPE_WEBHOOK_SECRET`: From Stripe webhooks
   - All other required variables

### Step 4: Redeploy
1. Go to Deployments
2. Find the failed deployment
3. Click "Redeploy"
4. Wait 2-3 minutes

### Step 5: Test Your Site
- Visit: https://your-project.vercel.app
- Test booking: /booking.html
- Test admin: /admin.html
- Test API: /api/admin/health

---

## 🔐 Critical Environment Variables

**⚠️ MUST SET THESE:**

| Variable | Example | Where to Get |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set to "production" |
| `CLIENT_URL` | `https://your-project.vercel.app` | Your Vercel domain |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB Atlas |
| `STRIPE_SECRET_KEY` | `sk_live_abc123...` | Stripe Dashboard (LIVE key!) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_abc123...` | Stripe Dashboard → Webhooks |
| `SESSION_SECRET` | `abc123def456...` | Generate with crypto |
| `EMAIL_USER` | `your-email@zoho.com` | Your email |
| `EMAIL_PASS` | `app-specific-password` | Email provider |

**All other variables:** See `.env.production` file

---

## 🔗 Stripe Configuration

### Configure Webhook Endpoint

1. **In Stripe Dashboard:**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://your-project.vercel.app/api/webhooks/stripe`
   - Events: checkout.session.completed, payment_intent.succeeded, charge.failed
   - Copy signing secret (whsec_...)

2. **In Vercel:**
   - Add `STRIPE_WEBHOOK_SECRET` = the signing secret you copied
   - Save and redeploy

3. **Update Success/Cancel URLs:**
   - `STRIPE_SUCCESS_URL` = `https://your-project.vercel.app/thank-you.html?session_id={CHECKOUT_SESSION_ID}`
   - `STRIPE_CANCEL_URL` = `https://your-project.vercel.app/booking.html?status=cancelled`

---

## 📊 Project Structure for Vercel

```
your-project/
├── api/
│   └── index.js          ← Serverless entry point (Vercel routes all /api to here)
├── public/               ← Static files (HTML, CSS, JS, images)
├── server/               ← Express app modules
│   ├── models/
│   ├── services/
│   └── utils/
├── vercel.json           ← Deployment configuration
├── package.json          ← Dependencies
├── .env.production       ← Environment template
└── README.md
```

**How it works:**
- Vercel automatically creates serverless functions from `/api` directory
- All routes in `api/index.js` become available as `/api/*`
- Static files in `public/` served automatically
- Environment variables injected at runtime

---

## ✨ Post-Deployment Checklist

### Immediate Tests (Right After Deploy)
- [ ] Site loads at https://your-project.vercel.app
- [ ] Admin login works (/admin.html)
- [ ] Booking form displays (/booking.html)
- [ ] Calendar loads with available dates
- [ ] Mobile responsive (test with F12 Device Emulation)

### API Tests
```bash
# Health check
curl https://your-project.vercel.app/api/admin/health

# Get packages
curl https://your-project.vercel.app/api/packages

# Get availability
curl "https://your-project.vercel.app/api/availability?date=2025-11-01"
```

### Payment Flow Test
1. Go to /booking.html
2. Select date/time/package
3. Enter customer details
4. Click "Confirm Booking"
5. Should redirect to Stripe checkout
6. Complete test payment (use test card: 4242 4242 4242 4242)
7. Should show thank you page with booking details

### Admin Features Test
1. Login with credentials from `.env`
2. View bookings list
3. View booking details
4. Test export functionality
5. View messages

### Email Test
- Book a session
- Complete payment
- Check email for tax receipt

---

## 🔍 Troubleshooting Guide

### Build Fails (Red X)
**Check:** Vercel Deployments tab → Failed deploy → View logs
**Common causes:**
- Missing environment variables
- MongoDB connection timeout
- Missing dependencies in package.json

**Fix:** Add all env vars → Redeploy

### 502 Bad Gateway
**Cause:** API error during runtime

**Debug:**
1. Go to Vercel Dashboard → Deployments → Latest → Functions tab
2. Click /api to see logs
3. Look for MongoDB, Stripe, or email errors

### MongoDB Connection Fails
**Error:** `MongoNetworkError: connect ECONNREFUSED`

**Fix:**
1. Check MongoDB URI format: `mongodb+srv://user:password@cluster.mongodb.net/dbname`
2. In MongoDB Atlas, go to Network Access
3. Click "Add IP Address"
4. Select "Allow access from anywhere" (0.0.0.0/0)
5. Redeploy

### Stripe Not Working
**Error:** "Cannot find price" or "Stripe not configured"

**Fix:**
1. Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)
2. Verify all `STRIPE_PRICE_*` variables are set
3. Prices must exist in YOUR Stripe account
4. Redeploy

### CORS / Cross-Origin Errors
**Error:** "Access to XMLHttpRequest blocked by CORS policy"

**Fix:**
1. Update `CLIENT_URL` to your Vercel domain
2. Verify `CORS` middleware in `api/index.js` uses CLIENT_URL
3. Clear browser cache (Ctrl+Shift+Delete)
4. Redeploy

---

## 📈 Monitoring & Performance

### View Logs
Vercel Dashboard → Your Project → Deployments → Select Latest → Functions tab → Click /api

### Performance Metrics
- Response times should be <500ms
- Cold start: <3 seconds (first request)
- Warm requests: <100ms

### Common Issues
| Issue | Solution |
|-------|----------|
| Slow first request | Normal (cold start), happens once |
| Timeouts after 30s | Increase function timeout or optimize code |
| High CPU usage | Check MongoDB queries, add indexes |
| Memory errors | Reduce logging, optimize code |

---

## 🔄 Continuous Deployment

Your site auto-deploys when you push to GitHub:

```powershell
# Make changes
git add .
git commit -m "Update booking form"

# Push to GitHub
git push origin main

# Vercel deploys automatically (2-3 minutes)
# Check status at vercel.com dashboard
```

### Rollback to Previous Version
1. Go to Vercel Dashboard → Deployments
2. Find working previous version
3. Click "Promote to Production"
4. Site rolls back instantly

---

## 🎉 Success!

Your Photography Booking system is now deployed on Vercel!

### Your Live Site:
🌐 **https://your-project.vercel.app**

### Key URLs:
- 📅 Booking: https://your-project.vercel.app/booking.html
- 🔐 Admin: https://your-project.vercel.app/admin.html
- 📊 API: https://your-project.vercel.app/api/admin/health

### Next Steps:
1. **Custom Domain** (optional): Add your domain in Vercel Settings
2. **Monitor**: Watch deployments and logs
3. **Update**: Push changes to GitHub to auto-deploy
4. **Optimize**: Monitor performance and optimize as needed

---

## 📚 Documentation Files

- **`VERCEL_DEPLOYMENT_GUIDE.md`** - Full detailed guide (350+ lines)
- **`VERCEL_QUICK_REFERENCE.md`** - 1-page quick reference
- **`README.md`** - Updated with deployment instructions
- **`.env.production`** - Environment template

---

## ❓ FAQ

**Q: Do I need to pay for Vercel?**  
A: No! Vercel has a free tier that covers most projects. Your site will be free if it gets <100 function invocations/month.

**Q: How fast is Vercel?**  
A: Extremely fast! Response times typically <100ms. First request may take 3s (cold start).

**Q: Can I use my own domain?**  
A: Yes! Add your domain in Vercel Settings → Domains. Must update nameservers.

**Q: What if I want to go back to local hosting?**  
A: No problem! Your code works on any Node.js host. Just set environment variables.

**Q: How do I update my site?**  
A: Push to GitHub → Vercel deploys automatically in 2-3 minutes.

**Q: Is my data secure?**  
A: Yes! MongoDB Atlas, Stripe, and Vercel use enterprise-grade security. All connections use HTTPS.

---

## 🎓 Learning Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://docs.atlas.mongodb.com)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Express.js Guide](https://expressjs.com)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

---

**Your Photography Booking System is Ready for Production! 🚀**

*Created: October 27, 2025*  
*Last Updated: October 27, 2025*  
*Status: ✅ Ready for Deployment*
