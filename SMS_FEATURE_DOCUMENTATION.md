# Twilio SMS Feature Documentation

## Overview
The photography booking system now includes SMS notification capabilities via Twilio integration. Admins can send SMS messages to customers directly from the admin panel for appointment reminders, confirmations, and custom notifications.

## Features

### 1. Manual SMS Sending
- Compose and send custom SMS messages to any phone number
- Character counter (max 1600 characters)
- Real-time message preview

### 2. Booking-Related Messages
- Send SMS directly from booking details
- Customer information auto-populated from booking
- Quick access to customer contact info

### 3. Message Templates
Pre-defined templates for common scenarios:
- **Appointment Reminder** - Remind customers of upcoming sessions
- **Booking Confirmation** - Confirm a new booking
- **Running Late** - Notify customers of delays with estimated time
- **Rescheduled** - Inform about date/time changes
- **Cancelled** - Notify about cancelled appointments
- **Custom Message** - Send any custom message

### 4. SMS Tracking & History
- View all sent SMS messages
- Track delivery status (pending, sent, delivered, failed)
- Filter by status
- View complete message details
- Link to associated bookings

## Setup Instructions

### 1. Create a Twilio Account
1. Visit [twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Verify your email and phone number
4. Get a trial phone number or purchase a production number

### 2. Get Your Credentials
From your Twilio Console Dashboard:
1. **Account SID** - Found on the main dashboard
2. **Auth Token** - Click "Show" next to Auth Token
3. **Phone Number** - Your Twilio phone number (must include country code)

### 3. Configure Environment Variables
Add these to your environment variables (Vercel, `.env`, etc.):

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+61412345678  # Your Twilio number with country code
```

**Important Notes:**
- Phone number must be in E.164 format (e.g., +61412345678)
- For Australian numbers: `+61` + number without leading 0
- Example: 0412 345 678 becomes +61412345678

### 4. Verify Configuration
1. Restart your server after adding environment variables
2. Log into the admin panel
3. Navigate to "SMS Messages" section
4. If configured correctly, you won't see a warning message
5. If not configured, you'll see: "SMS service not configured"

## Usage Guide

### Sending SMS from Booking Details
1. Go to **Bookings** section in admin panel
2. Click **View** on any confirmed booking
3. Click **Send SMS** button in the booking details modal
4. Customer's name and phone will be auto-filled
5. Choose a template or write a custom message
6. Click **Send SMS**

### Sending Manual SMS
1. Go to **SMS Messages** section in admin panel
2. Click **Send SMS** button
3. Optionally select a booking to auto-fill details
4. Enter recipient name and phone number
5. Choose a message template or write custom message
6. Review the preview
7. Click **Send SMS**

### Template-Specific Fields

**Running Late Template:**
- Requires: Delay in minutes (e.g., 15, 30)
- Message includes the delay time automatically

**Rescheduled Template:**
- Requires: New date and new time
- Message includes the new booking details

**Other Templates:**
- Auto-populate with booking information
- Can be edited before sending

### Viewing SMS History
1. Go to **SMS Messages** section
2. Use filter dropdown to view:
   - All Messages
   - Sent Messages
   - Failed Messages
   - Pending Messages
3. Click **View** to see full message details
4. Click **Refresh** to update status from Twilio

## Phone Number Formatting

The system automatically handles phone number formatting:

**Accepted formats:**
- `+61412345678` (E.164 format - preferred)
- `0412345678` (Australian format - auto-converted to +61)
- `04 1234 5678` (Spaces are automatically removed)

**International numbers:**
- Must include country code with + prefix
- Example: `+1234567890` for USA
- Example: `+442071234567` for UK

## Message Templates

### Appointment Reminder
```
Hi [Customer Name]! Reminder: Your [Event Type] is scheduled for [Date] at [Time] at [Location]. Looking forward to seeing you! - Ami Photography
```

### Booking Confirmation
```
Hi [Customer Name]! Your booking for [Date] at [Time] has been confirmed. We'll see you at [Location]. Reply STOP to unsubscribe. - Ami Photography
```

### Running Late
```
Hi [Customer Name]! We're running about [Delay Minutes] minutes late for your [Time] session. We apologize for the inconvenience and will be there soon! - Ami Photography
```

### Rescheduled
```
Hi [Customer Name]! Your session has been rescheduled to [New Date] at [New Time]. Location remains [Location]. Reply to confirm. - Ami Photography
```

### Cancelled
```
Hi [Customer Name]! Your booking for [Date] at [Time] has been cancelled as requested. Please contact us if you have any questions. - Ami Photography
```

## Database Schema

### SMS Model
```javascript
{
  bookingId: ObjectId,        // Optional reference to booking
  phoneNumber: String,        // Recipient phone (E.164 format)
  message: String,            // Message content (max 1600 chars)
  status: String,             // pending, sent, failed, delivered, undelivered
  twilioSid: String,          // Twilio message ID
  scheduledFor: Date,         // Future feature for scheduled messages
  sentAt: Date,               // Timestamp when sent
  errorMessage: String,       // Error details if failed
  sentBy: String,             // Admin username who sent
  recipientName: String,      // Customer name
  messageType: String,        // reminder, confirmation, running_late, etc.
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

## API Endpoints

All endpoints require authentication and CSRF token.

### GET `/api/admin/sms`
Get all SMS messages with optional filtering
- Query params: `status` (all, sent, failed, pending)
- Returns: Array of SMS objects

### GET `/api/admin/sms/:id`
Get single SMS message details
- Params: `id` - SMS message ID
- Returns: SMS object with populated booking

### POST `/api/admin/sms/send`
Send a new SMS message
- Body: `{ phoneNumber, message, messageType, recipientName, bookingId? }`
- Returns: SMS object with Twilio SID

### POST `/api/admin/bookings/:id/send-sms`
Send SMS to booking customer
- Params: `id` - Booking ID
- Body: `{ messageType, customMessage?, delayMinutes?, newDate?, newTime? }`
- Returns: SMS object

### GET `/api/admin/sms/templates`
Get available message templates
- Returns: Array of template objects

### GET `/api/admin/sms/config-status`
Check if Twilio is configured
- Returns: `{ configured: boolean, phoneNumber: string? }`

## Troubleshooting

### SMS Not Sending
1. **Check credentials**: Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct
2. **Check phone number**: Ensure TWILIO_PHONE_NUMBER is in E.164 format (+61...)
3. **Check trial limitations**: Trial accounts can only send to verified numbers
4. **Check SMS logs**: View error messages in SMS history
5. **Check Twilio console**: Log into Twilio to see detailed error logs

### Common Error Messages

**"Twilio is not configured"**
- Missing environment variables
- Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

**"SMS sending failed: The 'From' number is not a valid phone number"**
- TWILIO_PHONE_NUMBER is incorrect or not in E.164 format
- Should be: +61412345678 (with + and country code)

**"SMS sending failed: The number is unverified"**
- Using trial account and sending to unverified number
- Either verify the recipient number in Twilio console or upgrade account

**"Invalid phone number format"**
- Recipient number is invalid
- Ensure it's in format: +61412345678 or 0412345678

### Trial Account Limitations
Twilio trial accounts have restrictions:
- Can only send to verified phone numbers
- Messages include "Sent from your Twilio trial account" prefix
- Limited number of messages per day
- Upgrade to a paid account to remove these limitations

## Cost Considerations

### Twilio Pricing (as of 2024)
- **SMS to Australia**: ~$0.08 AUD per message
- **Phone Number**: ~$1.50 AUD/month
- **Pricing varies by country**: Check Twilio pricing page

### Cost Management Tips
1. Use SMS sparingly for important notifications only
2. Set up billing alerts in Twilio console
3. Monitor usage in Twilio dashboard
4. Consider bulk pricing for high-volume needs

## Security & Privacy

### Data Protection
- SMS messages are stored in the database for record-keeping
- Phone numbers are validated and sanitized before sending
- All SMS routes require admin authentication
- CSRF protection on all POST requests

### Compliance
- Include opt-out instructions in messages (e.g., "Reply STOP to unsubscribe")
- Respect customer preferences
- Only send messages to customers who have agreed to receive them
- Follow SPAM Act 2003 (Australia) and GDPR (if applicable)

### Best Practices
1. Get customer consent before sending marketing messages
2. Keep messages professional and relevant
3. Include business name in all messages
4. Provide opt-out mechanism
5. Don't send messages outside business hours (8am-8pm)
6. Limit frequency to avoid annoying customers

## Future Enhancements

Potential features for future development:
- [ ] Scheduled SMS sending
- [ ] Bulk SMS to multiple customers
- [ ] SMS templates management UI
- [ ] Two-way SMS conversations
- [ ] SMS delivery reports and analytics
- [ ] SMS opt-out management
- [ ] SMS campaigns for promotions
- [ ] Integration with booking reminders (auto-send 24h before)

## Support

For Twilio-specific issues:
- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Support](https://support.twilio.com)
- [Twilio Console](https://console.twilio.com)

For system-specific issues:
- Check server logs for error messages
- Review SMS history in admin panel
- Contact your system administrator
