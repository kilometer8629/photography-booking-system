# Twilio SMS Notification Setup Guide

This guide explains how to set up Twilio SMS notifications for customer appointment reminders and updates in the Photography Booking System.

## Overview

The system uses Twilio to send SMS notifications to customers for:
- **Booking Confirmation**: When a new booking is created
- **Payment Confirmation**: When payment is successfully processed
- **Reschedule Notification**: When a reschedule request is submitted
- **Cancellation Notification**: When a booking is cancelled with refund information
- **Booking Reminders**: (Optional) Automated reminders before appointments

## Prerequisites

- A Twilio account ([Sign up here](https://www.twilio.com/try-twilio))
- A Twilio phone number capable of sending SMS

## Setup Instructions

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account (includes $15 USD credit)
3. Complete the verification process

### 2. Get a Twilio Phone Number

1. Log in to the [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Select your country (e.g., Australia)
4. Choose a phone number that supports SMS
5. Complete the purchase (free during trial)

### 3. Get Your Twilio Credentials

1. From the Twilio Console Dashboard, locate:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click to reveal)
2. Keep these credentials secure - you'll need them for configuration

### 4. Configure Environment Variables

Add the following variables to your `.env` file (or `.env.production` for production):

```bash
# === Twilio SMS Configuration ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+61412345678
```

**Important Notes:**
- Replace the values with your actual Twilio credentials
- The phone number must be in E.164 format (e.g., `+61412345678` for Australia)
- Never commit your `.env` file to version control

### 5. For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the three Twilio variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. Redeploy your application

## SMS Message Examples

### Booking Confirmation
```
Hi John Doe! Your Santa's Gift Pack photography session is confirmed for Monday, December 25, 2024 at 14:00. Location: Shopping Centre. Thank you for choosing Ami Photography! 📸
```

### Payment Confirmation
```
Payment confirmed! $75.00 received for your Santa's Gift Pack session. You'll receive a tax receipt via email. Thank you! - Ami Photography
```

### Cancellation Notification
```
Your booking has been cancelled. Refund of $67.50 will be processed to your original payment method within 5-7 business days. - Ami Photography
```

### Reschedule Notification
```
Your reschedule request has been received. New requested date: Friday, December 29, 2024 at 15:30. We'll confirm availability within 24 hours. - Ami Photography
```

## Testing SMS Functionality

### During Development

1. Use the Twilio trial account with verified phone numbers
2. Add test phone numbers in the [Twilio Console](https://www.twilio.com/console/phone-numbers/verified)
3. SMS will only be sent to verified numbers during trial

### Testing Process

1. Create a test booking through the application
2. Check the server logs for SMS status:
   ```
   ✅ Initial booking SMS sent to +61412345678
   ```
3. Verify the SMS was received on the customer's phone
4. Check the Twilio Console → Monitor → Logs for delivery status

## Troubleshooting

### SMS Not Sending

**Check 1: Environment Variables**
```bash
# Verify variables are set
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER
```

**Check 2: Server Logs**
Look for warning messages:
```
⚠️ Twilio credentials not configured. SMS notifications are disabled.
⚠️ Failed to send booking confirmation SMS: [error message]
```

**Check 3: Phone Number Format**
- Must be in E.164 format: `+[country code][number]`
- Examples:
  - ✅ `+61412345678` (Australia)
  - ✅ `+14155552671` (USA)
  - ❌ `0412345678` (missing country code)
  - ❌ `61412345678` (missing +)

**Check 4: Twilio Account Status**
- Verify your Twilio trial account is active
- Check you haven't exceeded your trial credit
- Ensure the recipient's number is verified (for trial accounts)

### Common Errors

**Error: "Invalid phone number"**
- Ensure the phone number is in E.164 format
- Check the country code is correct

**Error: "Authentication failed"**
- Verify your Account SID and Auth Token are correct
- Ensure no extra spaces in environment variables

**Error: "Insufficient funds"**
- Trial credit has been used up
- Upgrade to a paid Twilio account

## Cost Estimation

### Twilio Pricing (as of 2024)

- **SMS to Australia**: ~$0.076 USD per message
- **SMS to USA**: ~$0.0079 USD per message
- **Trial Account**: $15 USD credit (approximately 190 messages to Australia)

### Monthly Cost Estimation

For a photography business with:
- 50 bookings per month
- Each booking receives 2 SMS (confirmation + payment)
- Total: 100 SMS/month × $0.076 = ~$7.60 USD/month

## Disabling SMS Notifications

If you want to disable SMS notifications (e.g., during development):

1. **Option 1**: Remove the Twilio environment variables
2. **Option 2**: Comment out the SMS sending code in `server/index.js`
3. **Option 3**: Set the variables to empty strings

The application will continue to work without SMS - it will just skip sending messages and log a warning.

## Phone Number Formatting

The system automatically formats phone numbers to E.164 format:

- `0412345678` → `+61412345678`
- `04 1234 5678` → `+61412345678`
- `(04) 1234-5678` → `+61412345678`
- `+61412345678` → `+61412345678` (no change)

## Best Practices

1. **Keep Messages Concise**: SMS has a 160-character limit for single messages
2. **Include Business Name**: Always identify your business in the message
3. **Provide Value**: Include essential information (date, time, location)
4. **Respect Opt-Out**: Honor customer requests to stop SMS notifications
5. **Monitor Costs**: Keep track of your Twilio usage and costs
6. **Test Thoroughly**: Always test with real phone numbers before going live

## Security Considerations

- ✅ Store Twilio credentials in environment variables, never in code
- ✅ Use `.env` files and add them to `.gitignore`
- ✅ Rotate your Auth Token periodically
- ✅ Monitor Twilio logs for suspicious activity
- ✅ Set up usage alerts in the Twilio Console

## Support Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [Twilio Console](https://www.twilio.com/console)
- [Twilio Support](https://support.twilio.com/)

## Upgrading to Production

When moving from trial to production:

1. **Upgrade Your Twilio Account**
   - Remove trial restrictions
   - Add payment method
   - Increase spending limits if needed

2. **Remove Phone Verification Requirement**
   - Production accounts can send to any valid phone number
   - No need to verify recipient numbers

3. **Set Up Alerts**
   - Configure usage alerts in Twilio Console
   - Monitor daily/monthly spend

4. **Enable Auto-Recharge** (Optional)
   - Prevent service interruption
   - Set minimum balance threshold

## Advanced Features (Future Enhancement)

- **Two-Way SMS**: Allow customers to reply to confirm/reschedule
- **SMS Templates**: Create reusable message templates
- **Bulk SMS**: Send reminders to multiple customers
- **SMS Analytics**: Track delivery rates and engagement
- **Scheduled Reminders**: Automatic reminders 24h before appointments

---

**Last Updated**: October 2024  
**Version**: 1.0.0
