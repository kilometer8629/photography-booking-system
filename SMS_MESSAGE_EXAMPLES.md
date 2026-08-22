# SMS Message Templates - Examples

This document shows examples of the SMS messages customers will receive.

## 1. Payment Confirmation SMS
**Triggered:** When Stripe payment is successfully processed

**Example:**
```
Hi John Smith! Payment of $150.00 received for your 
Santa's Gift Pack session on Monday, December 25, 2023. 
Receipt sent to your email. - Ami Photography
```

**Variables used:**
- Customer name
- Payment amount (auto-formatted with currency)
- Package name
- Session date (formatted: "Monday, December 25, 2023")

---

## 2. Booking Confirmation SMS
**Triggered:** When admin manually confirms a booking

**Example:**
```
Hi Jane Doe! Your Rudolph booking is confirmed for 
Saturday, December 16, 2023 at 10:00 at Westfield 
Shopping Centre. See you soon! - Ami Photography
```

**Variables used:**
- Customer name
- Package name
- Session date (formatted: "Saturday, December 16, 2023")
- Session time
- Location

---

## 3. Reschedule Request Confirmation SMS
**Triggered:** When customer submits a reschedule request

**Example:**
```
Hi Sarah Johnson! Your reschedule request for 
Monday, December 18, 2023 at 14:00 has been received. 
We'll confirm within 24 hours. - Ami Photography
```

**Variables used:**
- Customer name
- Requested new date (formatted: "Monday, December 18, 2023")
- Requested new time

---

## 4. Cancellation SMS
**Triggered:** When customer cancels their booking

**Example (21+ days before event):**
```
Hi Mike Brown, your booking has been cancelled. 
Refund of $135.00 will be processed to your card 
within 5-7 days. - Ami Photography
```

**Example (8-20 days before event):**
```
Hi Mike Brown, your booking has been cancelled. 
Refund of $75.00 will be processed to your card 
within 5-7 days. - Ami Photography
```

**Example (Less than 7 days before event):**
```
Hi Mike Brown, your booking has been cancelled. 
Refund of $0.00 will be processed to your card 
within 5-7 days. - Ami Photography
```

**Variables used:**
- Customer name
- Refund amount (calculated based on cancellation policy)
- Currency

**Refund Policy:**
- 21+ days before event: 90% refund (minus 10% admin fee)
- 8-20 days before event: 50% refund
- Less than 7 days: No refund (non-refundable)

---

## Message Characteristics

### Length
All SMS messages are under 160 characters to avoid multi-part SMS charges (where applicable).

### Tone
- Friendly and professional
- Clear and concise
- Action-oriented
- Brand-signed ("- Ami Photography")

### Formatting
- Customer first name used for personalization
- Dates formatted in long format for clarity
- Currency amounts always include symbol
- Times in 24-hour format

### Delivery
- Sent immediately after triggering event
- Logged in server console
- Errors logged but don't block main flow
- Falls back gracefully if Twilio not configured

---

## Phone Number Formatting

### Input Examples → Output
- `0412345678` → `+61412345678` (Australian)
- `5551234567` → `+15551234567` (US)
- `(04) 1234 5678` → `+61412345678`
- `+61 412 345 678` → `+61412345678`

### Supported Formats
✅ Australian mobile (0xxx)  
✅ US numbers  
✅ International numbers  
✅ With/without country code  
✅ With spaces, dashes, parentheses  

---

## Testing SMS Messages

### Test Without Sending
Set Twilio environment variables to empty/invalid to see log messages without sending:

```bash
# System logs warning but continues
⚠️ Twilio SMS not configured. SMS notifications are disabled.
```

### Test With Real SMS
1. Configure valid Twilio credentials
2. Create test booking with your phone number
3. Complete payment flow
4. Check phone for SMS
5. Verify in Twilio console logs

---

## Character Limits

All messages designed to fit within single SMS (160 characters):

| Message Type | Avg Length | Max Observed |
|--------------|-----------|--------------|
| Payment Confirmation | 120-145 | 150 |
| Booking Confirmation | 115-140 | 145 |
| Reschedule Request | 110-130 | 135 |
| Cancellation | 95-115 | 120 |

**Note:** Long customer names or locations may exceed 160 characters, 
resulting in 2 SMS segments. This is acceptable for clarity.

---

## Customization

To customize message templates, edit functions in:
```
server/services/twilioClient.js
```

Functions to modify:
- `sendPaymentConfirmationSMS()`
- `sendBookingConfirmationSMS()`
- `sendRescheduleConfirmationSMS()`
- `sendCancellationSMS()`

---

## Future Message Types (Roadmap)

### Booking Reminder
**Timing:** 24 hours before appointment
```
Hi [Name]! Reminder: Your [Package] session is 
tomorrow ([Date]) at [Time] at [Location]. 
Looking forward to seeing you! - Ami Photography
```

### Photo Ready Notification
**Timing:** When photos are uploaded
```
Hi [Name]! Your photos from [Date] are ready! 
View and download them at [link]. 
- Ami Photography
```

### Feedback Request
**Timing:** 3 days after session
```
Hi [Name]! We hope you loved your session! 
We'd appreciate your feedback: [link]. 
Thank you! - Ami Photography
```

---

## Best Practices

✅ **DO:**
- Keep messages under 160 characters when possible
- Include business name in all messages
- Use clear, action-oriented language
- Format dates in long format for clarity
- Include refund timelines

❌ **DON'T:**
- Send promotional content without consent
- Include shortened URLs (looks spammy)
- Use ALL CAPS (appears aggressive)
- Send messages outside business hours (9am-6pm)
- Omit currency symbols from amounts

---

Last Updated: October 2025
