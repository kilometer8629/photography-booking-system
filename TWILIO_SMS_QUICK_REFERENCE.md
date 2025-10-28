# 📱 Twilio SMS Features - Quick Reference

This is a quick reference for developers and admins using the Twilio SMS notification features.

## 🎯 SMS Notification Types

### Automatic SMS (Triggered by Events)

| Event | Trigger | SMS Content |
|-------|---------|-------------|
| **Payment Confirmation** | Stripe payment completed webhook | Amount paid, booking confirmed message |
| **Reschedule Request** | Customer submits reschedule request | Acknowledgment with requested date/time |
| **Booking Cancellation** | Customer cancels booking | Cancellation confirmed with refund details |

### Manual SMS (Admin-Triggered)

| Type | Endpoint | Use Case |
|------|----------|----------|
| **Booking Reminder** | `POST /api/admin/bookings/:id/send-reminder` | Send reminder before event |
| **Booking Confirmation** | `POST /api/admin/bookings/:id/send-confirmation-sms` | Manually confirm booking via SMS |

## 🔌 API Endpoints

### Send Booking Reminder
```http
POST /api/admin/bookings/:id/send-reminder
X-CSRF-Token: YOUR_TOKEN
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Reminder SMS sent successfully",
  "messageSid": "SM...",
  "csrfToken": "new_token"
}
```

### Send Booking Confirmation SMS
```http
POST /api/admin/bookings/:id/send-confirmation-sms
X-CSRF-Token: YOUR_TOKEN
Content-Type: application/json
```

### Check SMS Service Status
```http
GET /api/admin/sms/status
```

**Response:**
```json
{
  "configured": true,
  "phoneNumber": "+61412345678",
  "accountSid": "ACxxxxxxxx..."
}
```

## 📝 SMS Message Templates

### 1. Booking Confirmation
```
Hi [Name]! Your Santa photo session is confirmed! 🎅
📅 [Date] at [Time]
📍 [Location]
📦 Package: [Package Name]

We can't wait to capture your special moments! See you soon!
- Ami Photography
```

### 2. Payment Confirmation
```
Hi [Name]! Payment confirmed! ✅
Amount: $[Amount]

Your booking is now fully confirmed. A tax receipt has been sent to your email.
Thank you for choosing Ami Photography! 📸
```

### 3. Reschedule Notification
```
Hi [Name]! We've received your reschedule request for [Date] at [Time]. 

We'll confirm availability within 24 hours and send you a confirmation email.
- Ami Photography
```

### 4. Cancellation Notification
```
Hi [Name], your booking has been cancelled.
[If refund: Refund of $[Amount] will be processed within 5-7 business days.]

We're sorry to see you go. If you'd like to rebook, visit our website anytime.
- Ami Photography
```

### 5. Booking Reminder
```
🎅 Reminder: Your Santa photo session is [tomorrow/today/in X days]!

📅 [Date] at [Time]
📍 [Location]

Tips: Arrive 10 mins early, bring props/outfits if desired.
Looking forward to seeing you!
- Ami Photography
```

## 🔧 Configuration Quick Check

**Required Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+61412345678
```

**Test Configuration:**
```bash
# Run test script
node test_twilio_sms.js

# Check server logs for:
✅ Twilio SMS client initialized successfully
✅ Twilio SMS notifications enabled
```

## 📞 Phone Number Formats

**Supported Input Formats** (Auto-normalized to E.164):
- `0412345678` → `+61412345678`
- `61412345678` → `+61412345678`
- `+61412345678` → `+61412345678`
- `(04) 1234 5678` → `+61412345678`

**Default Country Code:** Australia (+61)

## 🐛 Troubleshooting

### SMS Not Sending?

1. **Check Configuration**
   ```bash
   # Look for this in server logs:
   ✅ Twilio SMS client initialized successfully
   ```

2. **Check Twilio Console**
   - Visit: https://console.twilio.com/us1/monitor/logs/sms
   - Check message delivery status

3. **Common Errors**
   | Error Code | Issue | Solution |
   |------------|-------|----------|
   | 21211 | Invalid phone | Check E.164 format |
   | 21408 | Permission denied | Verify phone (trial) |
   | 20003 | Auth error | Check credentials |

### Trial Account Limitations

- ✅ Free $15 credits
- ⚠️ Can only send to **verified numbers**
- 📝 Verify numbers at: Phone Numbers → Verified Caller IDs

## 💡 Best Practices

1. **Phone Number Storage**
   - Always store in E.164 format (+61412345678)
   - Validate before saving to database

2. **Message Content**
   - Keep under 160 characters when possible
   - Include business name
   - Add call-to-action
   - Use emojis sparingly (1-2 max)

3. **Timing**
   - Don't send between 9 PM - 8 AM
   - Send reminders 24-48 hours before event
   - Batch reminders for multiple bookings

4. **Cost Management**
   - ~$0.0075 per SMS (Australia)
   - Monitor usage in Twilio Console
   - Set up usage alerts

## 🔐 Security

- ✅ Environment variables (never commit)
- ✅ CSRF protection on admin endpoints
- ✅ Authentication required for manual sends
- ✅ Rate limiting on SMS endpoints
- ⚠️ Rotate Auth Token periodically

## 📊 Monitoring

**Twilio Console Monitoring:**
1. **Message Logs**: Console → Monitor → Logs → SMS
2. **Usage Stats**: Console → Monitor → Usage
3. **Phone Number Health**: Console → Phone Numbers → Manage

**Server Logs:**
```bash
# Successful SMS
✅ SMS sent successfully to +61412345678. SID: SM...
✅ Payment confirmation SMS sent to +61412345678

# Failed SMS
❌ SMS sending failed: [error message]
⚠️ Failed to send payment confirmation SMS: [error]
```

## 🧪 Testing

### Quick Test
```bash
# 1. Set test phone number in .env
TEST_PHONE_NUMBER=+61412345678

# 2. Run test script
node test_twilio_sms.js

# 3. Check your phone for test messages
```

### Manual API Test (cURL)
```bash
# Get session and CSRF token
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  --cookie-jar cookies.txt

# Get CSRF token
CSRF_TOKEN=$(curl -X GET http://localhost:3000/api/admin/csrf-token \
  --cookie cookies.txt | jq -r '.token')

# Send reminder SMS
curl -X POST http://localhost:3000/api/admin/bookings/BOOKING_ID/send-reminder \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt
```

## 📚 Additional Resources

- **Full Setup Guide**: [TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md)
- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Twilio Console**: https://console.twilio.com
- **Node.js Helper**: https://www.twilio.com/docs/libraries/node

## 🎯 Feature Roadmap

**Implemented:**
- ✅ Payment confirmations
- ✅ Booking confirmations
- ✅ Reschedule notifications
- ✅ Cancellation notifications
- ✅ Manual reminders
- ✅ Phone number normalization
- ✅ Admin API endpoints

**Future Enhancements:**
- [ ] Automated reminder scheduling (24h before event)
- [ ] Two-way SMS (customer replies)
- [ ] SMS opt-in/opt-out management
- [ ] SMS templates customization UI
- [ ] Multi-language support
- [ ] SMS delivery webhooks
- [ ] Bulk SMS for announcements

---

**Questions?** Check [TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md) for detailed setup instructions.
