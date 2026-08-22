# 📱 Twilio SMS Notification Setup Guide

This guide explains how to set up and use Twilio SMS notifications in the photography booking system.

## 🎯 Features

The SMS notification system provides automated text messages for:

1. **Payment Confirmations** - Sent when a customer completes payment via Stripe
2. **Booking Confirmations** - Manual confirmations sent by admin or triggered by payment
3. **Reschedule Notifications** - Sent when customer requests to reschedule
4. **Cancellation Notifications** - Sent when booking is cancelled with refund details
5. **Booking Reminders** - Manual reminders sent by admin for upcoming sessions

## 📋 Prerequisites

- A Twilio account (sign up at https://www.twilio.com/try-twilio)
- A Twilio phone number (can be purchased through Twilio Console)
- Account SID and Auth Token from Twilio

## 🔧 Setup Instructions

### Step 1: Create a Twilio Account

1. Visit https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your email and phone number
4. You'll receive free trial credits to test SMS functionality

### Step 2: Get a Twilio Phone Number

1. Log into the [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Select a number that supports SMS
4. Purchase the number (free trial credits can be used)
5. Note down your Twilio phone number in E.164 format (e.g., +61412345678)

### Step 3: Get Your Credentials

1. From the Twilio Console dashboard
2. Copy your **Account SID** (starts with "AC...")
3. Copy your **Auth Token** (click "Show" to reveal)
4. Keep these credentials secure!

### Step 4: Configure Environment Variables

Add the following to your `.env` file or Vercel environment variables:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+61412345678
```

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add each variable with its value
4. Select **Production**, **Preview**, and **Development** environments
5. Redeploy your application

### Step 5: Verify Setup

1. Start your server: `npm start` or `npm run dev`
2. Check the console for: `✅ Twilio SMS client initialized successfully`
3. If you see a warning, double-check your environment variables

## 🚀 Usage

### Automatic SMS Notifications

The following SMS messages are sent automatically:

#### 1. Payment Confirmation
**Triggered:** When Stripe payment is completed via webhook

**Message:**
```
Hi [Name]! Payment confirmed! ✅
Amount: $XXX.XX

Your booking is now fully confirmed. A tax receipt has been sent to your email.
Thank you for choosing Ami Photography! 📸
```

#### 2. Reschedule Notification
**Triggered:** When customer submits a reschedule request

**Message:**
```
Hi [Name]! We've received your reschedule request for [Date] at [Time]. 

We'll confirm availability within 24 hours and send you a confirmation email.
- Ami Photography
```

#### 3. Cancellation Notification
**Triggered:** When customer cancels a booking

**Message:**
```
Hi [Name], your booking has been cancelled.
[If applicable: Refund of $XXX.XX will be processed within 5-7 business days.]

We're sorry to see you go. If you'd like to rebook, visit our website anytime.
- Ami Photography
```

### Manual SMS Notifications (Admin)

Admins can manually send SMS notifications through the API:

#### 1. Send Booking Reminder

**Endpoint:** `POST /api/admin/bookings/:id/send-reminder`

**Headers:**
```json
{
  "X-CSRF-Token": "your_csrf_token",
  "Content-Type": "application/json"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reminder SMS sent successfully",
  "messageSid": "SM..."
}
```

**SMS Message:**
```
🎅 Reminder: Your Santa photo session is tomorrow!

📅 [Full Date] at [Time]
📍 [Location]

Tips: Arrive 10 mins early, bring props/outfits if desired.
Looking forward to seeing you!
- Ami Photography
```

#### 2. Send Booking Confirmation

**Endpoint:** `POST /api/admin/bookings/:id/send-confirmation-sms`

**Headers:**
```json
{
  "X-CSRF-Token": "your_csrf_token",
  "Content-Type": "application/json"
}
```

#### 3. Check SMS Service Status

**Endpoint:** `GET /api/admin/sms/status`

**Response:**
```json
{
  "configured": true,
  "phoneNumber": "+61412345678",
  "accountSid": "ACxxxxxxxx..."
}
```

## 📞 Phone Number Format

The system automatically normalizes phone numbers to E.164 format:

**Supported Input Formats:**
- `0412345678` → `+61412345678` (Australian mobile)
- `61412345678` → `+61412345678`
- `+61412345678` → `+61412345678` (already formatted)
- `(04) 1234 5678` → `+61412345678` (with formatting)

**Default Country Code:** Australia (+61)

If your customers are from a different country, you may need to modify the `normalizePhoneNumber` function in `server/services/twilioClient.js`.

## 🧪 Testing

### Testing with Trial Account

**Important Notes:**
- Trial accounts can only send SMS to verified phone numbers
- To test, verify recipient numbers in Twilio Console
- Go to **Phone Numbers** → **Verified Caller IDs**
- Add and verify test phone numbers

### Testing in Development

1. Use a test booking with your verified phone number
2. Complete a payment or trigger a notification
3. Check Twilio Console → **Messaging** → **Logs** for delivery status

### Sample Test Request (using curl)

```bash
# Get CSRF token first
curl -X GET http://localhost:3000/api/admin/csrf-token \
  -H "Cookie: southsydney.sid=your_session_id" \
  --cookie-jar cookies.txt

# Send reminder SMS
curl -X POST http://localhost:3000/api/admin/bookings/BOOKING_ID/send-reminder \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Cookie: southsydney.sid=your_session_id" \
  --cookie cookies.txt
```

## 🔍 Troubleshooting

### SMS Not Sending

**Check 1: Verify Environment Variables**
```bash
# In your server console, look for:
✅ Twilio SMS client initialized successfully

# Or:
⚠️ Twilio credentials not configured. SMS notifications are disabled.
```

**Check 2: Verify Phone Number Format**
- Ensure phone numbers are in correct format
- Check server logs for normalization errors

**Check 3: Check Twilio Console**
- Login to Twilio Console
- Go to **Messaging** → **Logs**
- Check for delivery status and error codes

**Check 4: Trial Account Limitations**
- Verify recipient phone numbers in Twilio Console
- Trial accounts have message limits
- Consider upgrading to a paid account

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| 21211 | Invalid phone number | Check phone number format |
| 21408 | Permission denied | Phone not verified (trial account) |
| 21610 | Message blocked | Number opted out or blocked |
| 20003 | Authentication error | Check Account SID and Auth Token |

### SMS Service Not Available

If you see this in server logs:
```
⚠️ Twilio client not initialized. SMS not sent.
```

**Solution:**
1. Check that all three environment variables are set:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
2. Restart your server after adding variables
3. Verify variables are loaded: `console.log(process.env.TWILIO_ACCOUNT_SID)`

## 💰 Pricing

### Trial Account
- **Free Credits:** $15.00 USD
- **Limitations:** Can only send to verified numbers
- **Perfect for:** Testing and development

### Production Account
- **SMS Cost:** ~$0.0075 - $0.02 per message (varies by country)
- **Australian SMS:** ~$0.0075 per message
- **Monthly Phone Number:** ~$1.00 per month
- **No minimum commitment**

**Example Costs for 100 Bookings/Month:**
- SMS notifications: ~$0.75 - $2.00
- Phone number: $1.00
- **Total:** ~$1.75 - $3.00/month

## 🔐 Security Best Practices

1. **Never commit credentials to git**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Rotate credentials regularly**
   - Generate new Auth Tokens periodically
   - Update in all environments

3. **Monitor usage**
   - Set up usage alerts in Twilio Console
   - Monitor for unusual activity

4. **Use webhooks for status**
   - Configure delivery status callbacks
   - Track failed deliveries

## 📊 Monitoring & Analytics

### Twilio Console Monitoring

1. **Message Logs**
   - View all sent messages
   - Check delivery status
   - See error codes

2. **Usage Dashboard**
   - Track SMS volume
   - Monitor costs
   - Set up alerts

3. **Phone Number Insights**
   - See incoming/outgoing messages
   - Monitor number health

## 🎨 Customizing Messages

To customize SMS message templates, edit the functions in `server/services/twilioClient.js`:

- `sendBookingConfirmationSMS()` - Booking confirmation message
- `sendPaymentConfirmationSMS()` - Payment confirmation message
- `sendRescheduleNotificationSMS()` - Reschedule notification
- `sendCancellationSMS()` - Cancellation notification
- `sendBookingReminderSMS()` - Booking reminder

**Best Practices for SMS:**
- Keep messages under 160 characters when possible
- Include business name
- Be clear and concise
- Include relevant booking details
- Add emojis sparingly (they work well for Santa photos! 🎅)

## 📝 Integration Checklist

- [ ] Sign up for Twilio account
- [ ] Purchase/configure Twilio phone number
- [ ] Add environment variables to `.env`
- [ ] Add environment variables to Vercel (if deployed)
- [ ] Verify setup with test message
- [ ] Test payment confirmation flow
- [ ] Test manual reminder sending
- [ ] Test reschedule notifications
- [ ] Test cancellation notifications
- [ ] Monitor first few messages in Twilio Console
- [ ] Set up usage alerts
- [ ] Document phone number for customers

## 🆘 Support

- **Twilio Documentation:** https://www.twilio.com/docs/sms
- **Twilio Support:** https://support.twilio.com
- **API Reference:** https://www.twilio.com/docs/sms/api

## 📚 Additional Resources

- [Twilio Node.js Quickstart](https://www.twilio.com/docs/sms/quickstart/node)
- [SMS Best Practices](https://www.twilio.com/docs/sms/tutorials/how-to-confirm-calls-and-texts-with-twilio)
- [E.164 Phone Number Formatting](https://www.twilio.com/docs/glossary/what-e164)
- [Twilio Console](https://console.twilio.com)

---

**Ready to send SMS notifications?** Follow the setup steps above and you'll be sending automated text messages to your customers in minutes! 📱✨
