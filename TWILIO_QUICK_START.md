# 🚀 Quick Start: Activate Twilio SMS Notifications

This guide will help you activate SMS notifications in **under 5 minutes**.

## ✅ What's Already Done

- ✅ Twilio SMS code is fully implemented
- ✅ Integration points are configured
- ✅ Tests are passing
- ✅ Documentation is complete

## 🔧 What You Need to Do

### Step 1: Get Twilio Credentials (2 minutes)

1. **Sign in** to [Twilio Console](https://console.twilio.com/) (or create account)
2. **Copy Account SID** from the dashboard
3. **Copy Auth Token** (click "Show" to reveal)
4. **Buy a phone number** (if you don't have one):
   - Go to Phone Numbers → Buy a Number
   - Choose your country
   - Purchase a number (costs ~$1-2/month)
   - Copy the phone number

### Step 2: Configure Environment Variables (1 minute)

Create a file named `.env` in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and add your Twilio credentials:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important**: Phone number must be in E.164 format (starts with +)

### Step 3: Restart the Server (10 seconds)

```bash
# Stop the server if running (Ctrl+C)
# Then start it again
npm start
```

### Step 4: Verify SMS is Active (10 seconds)

Look for this message in the console:

```
✅ Twilio SMS client initialized successfully
```

If you see this, SMS is **NOT** configured:
```
⚠️ Twilio SMS not configured. SMS notifications are disabled.
```

## 🧪 Test SMS Functionality

### Option 1: Quick Test with Node
```bash
# Create a test file
cat > test-sms.js << 'EOF'
require('./config/loadEnv');
const { sendSMS } = require('./server/services/twilioClient');

async function test() {
  const result = await sendSMS('+1234567890', 'Test from Photography Booking System!');
  console.log('Result:', result);
}

test();
EOF

# Run the test
node test-sms.js
```

### Option 2: Create a Real Booking
1. Open `http://localhost:3000/booking.html`
2. Fill out the form with **your phone number**
3. Complete the payment (use test card: `4242 4242 4242 4242`)
4. Check your phone for the SMS confirmation

## 📱 Expected SMS Messages

When configured correctly, customers will receive SMS at these points:

### 1. Payment Confirmation
```
Hi John! Payment of $299.00 received for your Santa's Gift Pack session on Monday, December 25, 2025. Receipt sent to your email. - Ami Photography
```

### 2. Booking Confirmation
```
Hi John! Your Santa's Gift Pack booking is confirmed for Monday, December 25, 2025 at 10:00 AM at Santa's Workshop, Sydney. See you soon! - Ami Photography
```

### 3. Reschedule Request
```
Hi John! Your reschedule request for Tuesday, December 26, 2025 at 2:00 PM has been received. We'll confirm within 24 hours. - Ami Photography
```

### 4. Cancellation
```
Hi John, your booking has been cancelled. Refund of $299.00 will be processed to your card within 5-7 days. - Ami Photography
```

## 🔍 Troubleshooting

### "Twilio SMS not configured" message
- ✅ Check that `.env` file exists in project root
- ✅ Verify all 3 Twilio variables are set
- ✅ Restart the server after adding variables
- ✅ Make sure variable names are exact (case-sensitive)

### "Invalid phone number" error
- ✅ Phone number must be in E.164 format: `+[country code][number]`
- ✅ Examples:
  - US: `+15551234567`
  - Australia: `+61412345678`
  - UK: `+447700900000`

### SMS not received
- ✅ Check Twilio Console → Messaging → Logs
- ✅ Verify phone number is correct
- ✅ Check Twilio account has credits
- ✅ Verify sender phone number is active
- ✅ Check spam/blocked messages on phone

## 💰 Cost Management

Monitor your SMS usage:
1. Go to [Twilio Console](https://console.twilio.com/)
2. Check "Usage" section
3. Set up billing alerts

Typical costs:
- **US**: $0.0075 per SMS
- **Australia**: $0.0675 per SMS
- **100 bookings/month**: ~$1.50 (US) or ~$13.50 (AU)

## 🚀 Production Deployment

For Vercel deployment:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add the 3 Twilio variables
4. Redeploy the application

## ✅ Success Checklist

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Credentials copied
- [ ] `.env` file created
- [ ] Environment variables added
- [ ] Server restarted
- [ ] "SMS initialized successfully" message seen
- [ ] Test SMS sent successfully

## 📚 Additional Resources

- **Full Documentation**: See `TWILIO_SMS_SETUP.md`
- **Implementation Details**: See `TWILIO_IMPLEMENTATION_SUMMARY.md`
- **Feature Status**: See `NEW_FEATURES_STATUS.md`
- **Twilio Docs**: [docs.twilio.com](https://www.twilio.com/docs)

---

**Need Help?** Check the troubleshooting section in `TWILIO_SMS_SETUP.md`

**Ready to Go?** Your Twilio SMS feature is **production-ready** once configured! 🎉
