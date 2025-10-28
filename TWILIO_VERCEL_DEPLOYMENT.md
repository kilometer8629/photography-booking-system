# Twilio SMS - Vercel Deployment Guide

This guide helps you configure Twilio SMS notifications for your Vercel deployment.

## 📋 Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### Navigate to Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add each of the following variables

### Required Twilio Variables

```bash
# Variable Name: TWILIO_ACCOUNT_SID
# Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Environments: ✓ Production ✓ Preview ✓ Development

# Variable Name: TWILIO_AUTH_TOKEN
# Value: your_auth_token_here
# Environments: ✓ Production ✓ Preview ✓ Development

# Variable Name: TWILIO_PHONE_NUMBER
# Value: +61412345678
# Environments: ✓ Production ✓ Preview ✓ Development
```

### Getting Your Twilio Credentials

1. **Account SID & Auth Token**:
   - Login to [Twilio Console](https://console.twilio.com)
   - Find on main dashboard
   - Click "Show" to reveal Auth Token

2. **Phone Number**:
   - Navigate to **Phone Numbers** → **Manage** → **Active numbers**
   - Copy your Twilio phone number in E.164 format

## 🚀 Deploy Process

### Option 1: Via Vercel Dashboard

1. Add environment variables (as shown above)
2. Trigger a new deployment:
   ```bash
   git push origin main
   ```
3. Vercel will automatically redeploy with new variables

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variables
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER

# Deploy
vercel --prod
```

### Option 3: Using .env file (Local Development)

For local development, create a `.env` file:

```bash
# Copy from .env.production template
cp .env.production .env

# Edit with your values
nano .env
```

**⚠️ Never commit `.env` file to git!**

## ✅ Verify Deployment

After deployment, verify SMS is working:

### 1. Check Build Logs

In Vercel deployment logs, look for:
```
✅ Twilio SMS client initialized successfully
✅ Twilio SMS notifications enabled
```

### 2. Check Runtime Logs

Monitor your Vercel function logs:
1. Go to **Deployments** → Select deployment
2. Click **Functions** tab
3. View real-time logs
4. Look for SMS-related messages

### 3. Test with API

```bash
# Get your production URL
PROD_URL="https://your-app.vercel.app"

# Check SMS status
curl "$PROD_URL/api/admin/sms/status"

# Expected response:
# {
#   "configured": true,
#   "phoneNumber": "+61412345678",
#   "accountSid": "ACxxxxxxxx..."
# }
```

## 🔐 Security Best Practices

### For Production

1. **Use Production Credentials**
   - Don't use trial account in production
   - Use separate Twilio project for production

2. **Secure Your Auth Token**
   - Never share in screenshots
   - Rotate periodically
   - Use Vercel's encrypted storage

3. **Monitor Usage**
   - Set up Twilio usage alerts
   - Monitor in Vercel logs
   - Track SMS costs

### For Development/Preview

1. **Use Trial Credentials**
   - Separate Twilio project for dev/staging
   - Verify test numbers in Twilio Console

2. **Preview Deployments**
   - Configure preview environment variables
   - Test with verified numbers only

## 🐛 Troubleshooting

### Issue: "Twilio not configured" message

**Solution:**
1. Check environment variables are set in Vercel
2. Ensure variable names match exactly:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
3. Redeploy after adding variables

### Issue: SMS not sending in production

**Solution:**
1. Check Vercel function logs for errors
2. Verify Twilio Console for message status
3. Ensure phone numbers are in E.164 format
4. Check Twilio account balance/credits

### Issue: Trial account restrictions

**Solution:**
1. Verify recipient numbers in Twilio Console:
   - Phone Numbers → Verified Caller IDs
2. Or upgrade to paid Twilio account

## 📊 Monitoring in Production

### Vercel Function Logs

```bash
# View real-time logs
vercel logs --follow

# Filter for SMS logs
vercel logs | grep -i "sms\|twilio"
```

### Twilio Console

Monitor at: https://console.twilio.com/us1/monitor/logs/sms

- Message delivery status
- Error codes and failures
- Usage and costs
- Phone number health

## 💰 Cost Estimation

### Twilio Pricing (Australia)
- SMS: ~$0.0075 per message
- Phone number: ~$1.00/month

### Example: 100 Bookings/Month
- Booking confirmations: 100 × $0.0075 = $0.75
- Payment confirmations: 100 × $0.0075 = $0.75
- Occasional reminders: 50 × $0.0075 = $0.38
- **Total:** ~$1.88/month + $1.00 phone = **~$2.88/month**

### Setting Usage Alerts

1. Twilio Console → Monitor → Alerts
2. Set monthly budget alert (e.g., $10)
3. Get email when approaching limit

## 🔄 Continuous Deployment

### Automatic Deployment

When you push to your main branch, Vercel will:
1. Build your application
2. Load environment variables
3. Initialize Twilio client
4. Deploy with SMS enabled

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

## 📝 Checklist for Production

Before going live, ensure:

- [ ] Twilio account upgraded (not trial)
- [ ] Production credentials added to Vercel
- [ ] Phone number purchased and active
- [ ] Environment variables set for Production
- [ ] Test SMS sent successfully
- [ ] Monitoring alerts configured
- [ ] Usage limits set in Twilio
- [ ] Privacy policy updated (SMS notifications)
- [ ] Customer opt-in mechanism in place
- [ ] Error logging configured

## 🆘 Support Resources

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/environment-variables
- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Twilio Support**: https://support.twilio.com
- **Project Docs**: [TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md)

## 🎯 Quick Commands

```bash
# Check if variables are set
vercel env ls

# Pull environment variables locally
vercel env pull .env.local

# Test locally with production variables
vercel dev

# Deploy to production
vercel --prod

# View logs
vercel logs --follow
```

---

**Ready to deploy?** Follow the steps above and you'll have SMS notifications running in production! 🚀📱
