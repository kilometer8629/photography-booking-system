# 🚀 Vercel Deployment - Quick Reference Card

## One-Page Deployment Summary

### Prerequisites Checklist
- [ ] GitHub account created
- [ ] Vercel account created (vercel.com)
- [ ] MongoDB Atlas database set up
- [ ] Stripe account with LIVE keys
- [ ] Zoho Calendar configured
- [ ] Email service (Zoho SMTP) set up

### Critical Environment Variables

**Copy these exact variable names to Vercel:**

```
NODE_ENV = production
CLIENT_URL = https://your-project.vercel.app
SESSION_SECRET = (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your-secure-password
MONGODB_URI = mongodb+srv://user:password@cluster.mongodb.net/database
EMAIL_HOST = smtp.zoho.com.au
EMAIL_PORT = 465
EMAIL_SECURE = true
EMAIL_USER = your-email@domain.com
EMAIL_PASS = your-app-password
STRIPE_SECRET_KEY = sk_live_... (LIVE key, not test!)
STRIPE_WEBHOOK_SECRET = whsec_...
STRIPE_SUCCESS_URL = https://your-project.vercel.app/thank-you.html?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL = https://your-project.vercel.app/booking.html?status=cancelled
STRIPE_PRICE_SANTAS_GIFT_PACK = price_1SMR8RAY4Cs3JypYKT6JUY8O
STRIPE_PRICE_RUDOLPH = price_1SMR9SAY4Cs3JypYbcqhL4CG
STRIPE_PRICE_BLITZEN = price_1SMRACAY4Cs3JypYjRdbgNmC
STRIPE_PRICE_DIGITAL_PACKAGE = price_1SMRAwAY4Cs3JypYsUlEZSZs
STRIPE_PRICE_VIXEN = price_1SMRBXAY4Cs3JypY1wHoDU79
ZOHO_OAUTH_ACCESS_TOKEN = 1000.your_token
ZOHO_OAUTH_CLIENT_ID = 1000.your_id
ZOHO_OAUTH_CLIENT_SECRET = your_secret
ZOHO_CALENDAR_ID = your_calendar_id
COOKIE_DOMAIN = .vercel.app
```

### 5-Minute Deployment Steps

1. **Update GitHub**
   ```powershell
   git add .
   git commit -m "Ready for Vercel"
   git push origin main
   ```

2. **Connect Vercel**
   - Go to vercel.com → "Add New Project"
   - Select GitHub repository
   - Click Import
   - Wait for build to complete (will fail without env vars - that's OK)

3. **Add Environment Variables**
   - Click "Settings" → "Environment Variables"
   - Add all variables from list above
   - Save

4. **Redeploy**
   - Go to "Deployments"
   - Click latest deployment
   - Click "Redeploy"
   - Wait 2-3 minutes for new deployment

5. **Test Your Site**
   - Visit `https://your-project.vercel.app`
   - Test booking flow
   - Check admin login
   - Verify database connection

### Common Errors & Fixes

| Error | Fix |
|-------|-----|
| MongoDB connection failed | Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access |
| Stripe checkout not working | Verify using LIVE keys (sk_live_), not test keys |
| 502 Bad Gateway | Check build logs, redeploy with correct env vars |
| CORS errors | Verify CLIENT_URL matches Vercel domain |
| Email not sending | Use app-specific password for Zoho, not account password |

### Post-Deployment Tasks

1. **Configure Stripe Webhook**
   - Go to Stripe Dashboard
   - Add webhook: `https://your-project.vercel.app/api/webhooks/stripe`
   - Copy signing secret to Vercel `STRIPE_WEBHOOK_SECRET`

2. **Update URLs**
   - Zoho redirect: `https://your-project.vercel.app/api/zoho/callback`
   - Stripe URLs already configured in env vars

3. **Test Endpoints**
   ```
   Health: https://your-project.vercel.app/api/admin/health
   Packages: https://your-project.vercel.app/api/packages
   Availability: https://your-project.vercel.app/api/availability
   ```

### Production URLs

After deployment, your site will be at:
```
🌐 Main Site: https://your-project.vercel.app
📅 Booking: https://your-project.vercel.app/booking.html
🔐 Admin: https://your-project.vercel.app/admin.html
📧 API: https://your-project.vercel.app/api
```

### Key Files for Deployment

- ✅ `vercel.json` - Deployment configuration
- ✅ `api/index.js` - Serverless function entry point
- ✅ `package.json` - Dependencies and build scripts
- ✅ `.env.production` - Environment template
- ✅ `VERCEL_DEPLOYMENT_GUIDE.md` - Full guide

### Troubleshooting Commands

**Check build logs:**
```
https://vercel.com/your-account/your-project/deployments
```

**Test API locally (before deployment):**
```powershell
npm start
curl http://localhost:3000/api/admin/health
```

**View real-time logs:**
```
Vercel Dashboard → Deployments → Select Deployment → Functions/Logs
```

### Important Notes

⚠️ **NEVER use test Stripe keys in production!**
- Test keys start with `sk_test_`
- Live keys start with `sk_live_`
- Always verify before deploying

📌 **MongoDB Atlas Whitelist:**
- Whitelist `0.0.0.0/0` for easy Vercel access
- For production, use specific Vercel IP addresses

🔐 **Session Secret:**
- Generate a strong random secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Change from default!

📧 **Email App Password:**
- For Zoho: Use app-specific password, not account password
- Generate in Zoho security settings

### Support Links

- Vercel Docs: https://vercel.com/docs
- Stripe Webhooks: https://stripe.com/docs/webhooks
- MongoDB Atlas: https://docs.atlas.mongodb.com

---

**Ready to deploy? Follow the 5-Minute Deployment Steps above!** 🚀

*Last Updated: October 27, 2025*
