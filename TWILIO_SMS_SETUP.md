# Twilio SMS Notification System - Setup Guide

This guide explains how to configure and use the Twilio SMS notification system for the Photography Booking System.

## Overview

The Twilio SMS integration sends text message notifications to customers at key points in the booking lifecycle:
- Payment confirmation
- Booking confirmation by admin
- Reschedule request confirmation
- Cancellation with refund information

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Twilio Phone Number**: Purchase a phone number from your Twilio console
3. **Account Credentials**: Locate your Account SID and Auth Token in the Twilio console

## Environment Configuration

Add the following variables to your `.env` file (or Vercel environment variables for production):

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Finding Your Credentials

1. **Account SID & Auth Token**: Found in your [Twilio Console Dashboard](https://console.twilio.com/)
2. **Phone Number**: Purchase a phone number from the [Phone Numbers section](https://console.twilio.com/phone-numbers/incoming)
   - Format: Must be in E.164 format (e.g., `+61412345678` for Australia, `+15551234567` for US)

## Phone Number Formatting

The system automatically formats phone numbers to E.164 format:

- **Australian numbers**: `0412345678` → `+61412345678`
- **US numbers**: `5551234567` → `+15551234567`
- **Already formatted**: `+61412345678` → `+61412345678` (no change)

## SMS Message Templates

### 1. Payment Confirmation
Sent when Stripe payment is successful:
```
Hi [Name]! Payment of $[amount] received for your [package] session on [date]. Receipt sent to your email. - Ami Photography
```

### 2. Booking Confirmation
Sent when admin confirms a booking:
```
Hi [Name]! Your [package] booking is confirmed for [date] at [time] at [location]. See you soon! - Ami Photography
```

### 3. Reschedule Request
Sent when customer requests to reschedule:
```
Hi [Name]! Your reschedule request for [new date] at [new time] has been received. We'll confirm within 24 hours. - Ami Photography
```

### 4. Cancellation
Sent when customer cancels booking:
```
Hi [Name], your booking has been cancelled. Refund of $[amount] will be processed to your card within 5-7 days. - Ami Photography
```

## Testing

### Running Tests
```bash
npm run test:unit
```

### Manual Testing (without sending SMS)
If Twilio is not configured, the system will log warnings but continue to work:
```
⚠️ Twilio SMS not configured. SMS notifications are disabled.
```

### Test SMS Functionality
1. Set up Twilio credentials in `.env`
2. Create a test booking with a valid phone number
3. Complete the payment flow
4. Check Twilio console logs to verify SMS was sent

## Troubleshooting

### SMS Not Sending

1. **Check environment variables are set**:
   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   echo $TWILIO_PHONE_NUMBER
   ```

2. **Verify phone number format**:
   - Must include country code
   - Use E.164 format: `+[country code][number]`

3. **Check Twilio account status**:
   - Ensure account is active
   - Check account balance
   - Verify phone number is active

4. **Review server logs**:
   - Look for `✅ SMS sent successfully` or `❌ SMS sending failed` messages
   - Check error details in console output

### Common Errors

**Error: "Invalid phone number"**
- Solution: Ensure phone number is in E.164 format with country code

**Error: "Account suspended"**
- Solution: Check Twilio account status and billing

**Error: "Insufficient funds"**
- Solution: Add credits to your Twilio account

## Cost Considerations

- SMS rates vary by country (typically $0.0075 - $0.05 per message)
- Check current rates at [Twilio Pricing](https://www.twilio.com/pricing)
- Monitor usage in Twilio console

## Production Deployment

### Vercel Setup

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the three Twilio variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. Redeploy the application

### Security Best Practices

- ✅ Never commit credentials to git
- ✅ Use environment variables for all sensitive data
- ✅ Rotate Auth Token periodically
- ✅ Enable two-factor authentication on Twilio account
- ✅ Monitor usage for unexpected spikes

## API Reference

### Available Functions

```javascript
// From server/services/twilioClient.js

// Send generic SMS
sendSMS(phoneNumber, message)

// Send booking confirmation
sendBookingConfirmationSMS(booking)

// Send status change notification
sendBookingStatusChangeSMS(booking, newStatus)

// Send reschedule confirmation
sendRescheduleConfirmationSMS(booking, newDate, newTime)

// Send payment confirmation
sendPaymentConfirmationSMS(booking)

// Send cancellation notice
sendCancellationSMS(booking, refundAmount, refundReason)

// Format phone number
formatPhoneNumber(phoneNumber)
```

## Monitoring

### Twilio Console
- View message logs: [Twilio Messaging Logs](https://console.twilio.com/monitor/logs/messages)
- Check delivery status
- Monitor costs and usage

### Server Logs
Look for these log entries:
- `✅ Twilio SMS client initialized successfully` - Twilio is configured
- `⚠️ Twilio SMS not configured` - Missing environment variables
- `✅ SMS sent successfully to [number]` - Message delivered
- `❌ SMS sending failed: [error]` - Delivery failed

## Support

- **Twilio Documentation**: [docs.twilio.com](https://www.twilio.com/docs)
- **Twilio Support**: Available in console
- **Project Issues**: Contact the development team

## Feature Roadmap

Future enhancements:
- [ ] Booking reminder SMS (24 hours before appointment)
- [ ] Customer reply handling
- [ ] Opt-in/opt-out management
- [ ] Custom message templates via admin panel
- [ ] SMS analytics dashboard
