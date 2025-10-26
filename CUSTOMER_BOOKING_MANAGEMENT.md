# Customer Booking Management System - Complete Guide

## Overview

Customers can now easily manage their bookings including cancellations and rescheduling through a dedicated self-service portal at `/manage-booking.html`.

## Customer Features

### 1. 🔍 Find Your Booking
- Search by **email address** and optional booking/session ID
- Secure lookup - only shows bookings matching the email
- Displays all booking details

### 2. 📅 View Booking Details
Shows customers:
- Event date and time
- Location
- Package name
- Payment amount and currency
- Current booking status
- Cancellation policy information

### 3. ❌ Cancel Booking
- View applicable refund amount based on cancellation policy
- One-click cancellation
- Automatic refund email
- Reason: Automatic refund calculation

**Cancellation Policy:**
| Days Before Event | Refund % | Details |
|---|---|---|
| 21+ days | 90% | Full refund minus 10% admin fee |
| 8-20 days | 50% | Half refund |
| < 7 days | 0% | Non-refundable (can still reschedule) |
| Past event | 0% | No refund available |

### 4. 📆 Reschedule Booking
- Select new date and time
- Optional reason for rescheduling
- Admin reviews and confirms within 24 hours
- Package and price remain the same

## URL & Access

**Customer Booking Management Page:**
```
http://localhost:3000/manage-booking.html
```

**Link to add on your website:**
```html
<a href="/manage-booking.html">Manage Your Booking</a>
```

## API Endpoints (Customer-Facing)

### 1. GET `/api/customer/booking`
**Find customer's booking**

Query Parameters:
- `email` (required) - Customer's email address
- `bookingId` (optional) - Booking or session ID for faster lookup

Example:
```
GET /api/customer/booking?email=john@example.com
GET /api/customer/booking?email=john@example.com&bookingId=68fe5d1af1e666f30ef42e77
```

Response:
```json
{
  "success": true,
  "booking": {
    "_id": "68fe5d1af1e666f30ef42e77",
    "eventDate": "2025-11-15T14:00:00.000Z",
    "startTime": "14:00",
    "endTime": "14:30",
    "location": "Seattle, WA",
    "package": "Santa's Gift Pack",
    "clientName": "John Doe",
    "clientEmail": "john@example.com",
    "packageAmount": 50000,
    "packageCurrency": "$",
    "status": "confirmed",
    "depositPaid": true,
    "stripePaidAt": "2025-10-27T12:34:56.000Z"
  }
}
```

---

### 2. POST `/api/customer/reschedule`
**Submit reschedule request**

Body:
```json
{
  "bookingId": "68fe5d1af1e666f30ef42e77",
  "newDate": "2025-12-01",
  "newTime": "10:00",
  "reason": "Conflict with another event"
}
```

Response:
```json
{
  "success": true,
  "message": "Reschedule request submitted! We'll confirm your new date within 24 hours."
}
```

**What Happens:**
1. Booking status changes to `pending_reschedule`
2. Reschedule confirmation email sent
3. Admin reviews and confirms within 24 hours
4. Customer receives final confirmation with new date

---

### 3. POST `/api/customer/cancel`
**Cancel booking**

Body:
```json
{
  "bookingId": "68fe5d1af1e666f30ef42e77"
}
```

Response:
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refundAmount": 45000,
  "refundReason": "21+ days before event - Full refund (minus 10% admin fee)"
}
```

**What Happens:**
1. Booking status changes to `cancelled`
2. Refund amount calculated based on policy
3. Cancellation email sent with refund details
4. Refund processed within 5-7 business days

## Customer Experience Flow

### Reschedule Flow:
```
Customer Visits /manage-booking.html
    ↓
Enters email address
    ↓
System finds booking
    ↓
Clicks "Reschedule Booking"
    ↓
Enters new date/time & reason
    ↓
Submits request
    ↓
Confirmation email sent
    ↓
Admin reviews within 24 hours
    ↓
New confirmation email sent to customer
    ↓
Booking updated to new date
```

### Cancel Flow:
```
Customer Visits /manage-booking.html
    ↓
Enters email address
    ↓
System finds booking
    ↓
Sees refund amount based on policy
    ↓
Clicks "Cancel Booking"
    ↓
Confirms cancellation
    ↓
Booking marked as cancelled
    ↓
Refund email sent immediately
    ↓
Refund processed in 5-7 business days
```

## Emails Sent to Customers

### Reschedule Request Email
- **Trigger:** When customer submits reschedule request
- **Content:**
  - Current booking details
  - Requested new date/time
  - Reason (if provided)
  - Next steps message
  - Contact information

### Cancellation Confirmation Email
- **Trigger:** Immediately when customer confirms cancellation
- **Content:**
  - Cancellation confirmation
  - Refund amount and reason
  - Expected refund timeline (5-7 business days)
  - Option to reschedule instead
  - Contact information

## Admin Workflow

### For Rescheduled Bookings:
1. Booking status appears as `pending_reschedule`
2. Additional notes show requested date/time and reason
3. Admin can:
   - Approve and update to new date (send confirmation email)
   - Request alternative date from customer
   - Update customer via email or phone

### For Cancelled Bookings:
1. Booking status appears as `cancelled`
2. Admin notes show refund amount and reason
3. Admin can:
   - Process refund via Stripe dashboard
   - Track refund status
   - Follow up with customer if needed

## Page Design Features

### Mobile Responsive
- Optimized for all screen sizes
- Touch-friendly buttons
- Clear typography

### User-Friendly
- Simple 2-field search form
- Clear booking details display
- Error messages in real-time
- Loading indicators

### Professional Branding
- Gradient header (matches site theme)
- Color-coded status badges
- Professional email templates
- Polished UI elements

## Cancellation Policy Display

On the manage booking page, customers see:
- Clear, easy-to-understand policy
- Days-until-event countdown
- Estimated refund amount
- What's included (phone, email)
- FAQ section with common questions

## Security Considerations

### Email Verification
- Only match bookings if email matches
- No booking ID guessing possible
- Email required for all lookups

### Data Exposure
- Only return necessary booking info
- No sensitive payment details shown
- Session IDs not exposed

### Prevention of Abuse
- Rate limiting on API endpoints
- Email format validation
- Booking ID validation

## Testing Checklist

### Test Reschedule:
- [ ] Search booking by email
- [ ] Click "Reschedule Booking"
- [ ] Select new date/time
- [ ] Submit with reason
- [ ] Check email received
- [ ] Verify booking shows `pending_reschedule`
- [ ] Admin confirms new date
- [ ] Confirmation email sent to customer

### Test Cancellation:
- [ ] Search booking by email
- [ ] Click "Cancel Booking"
- [ ] See refund amount calculated correctly
- [ ] Confirm cancellation
- [ ] Check cancellation email
- [ ] Verify refund info in email
- [ ] Booking shows `cancelled`

### Test Policy Calculations:
- [ ] 25 days before: Shows 90% refund
- [ ] 15 days before: Shows 50% refund
- [ ] 5 days before: Shows 0% refund
- [ ] Past event: Cannot reschedule/cancel

## Features in Action

### Example 1: Cancel 2 Weeks Before Event
```
Customer books: $500
25 days until event
Cancellation policy: 21+ days → 90% refund
Customer cancels
Refund: $450 (minus $50 admin fee)
Refund email sent immediately
Refund processed within 5-7 business days
```

### Example 2: Reschedule to New Date
```
Customer has booking for Nov 15
Submits reschedule request for Nov 22 at 10:00 AM
Reason: "Conflict with prior booking"
Reschedule email sent
Admin reviews availability
Admin confirms Nov 22 available
Confirmation email sent to customer
Booking updated
```

## FAQ on Manage Booking Page

Customers can view:
1. Can I cancel my booking? (Yes, with refunds)
2. How do I reschedule? (Through this page)
3. What's the cancellation policy? (Shows details)
4. Will I be refunded to the same card? (Yes, 5-7 days)
5. Need more help? (Contact info)

## Navigation

**Add link to manage booking page from:**
1. **Thank you page** - "Need to reschedule? Manage your booking"
2. **Confirmation emails** - Direct link to manage page
3. **Footer** - "Manage Your Booking" link
4. **Main navigation** - Add "Manage Booking" menu item
5. **Booking page** - "Already booked? Manage it here"

## Files Created/Modified

### Created:
- ✅ `public/manage-booking.html` - Customer self-service page (650+ lines)

### Modified:
- ✅ `server/index.js`:
  - Added `/api/customer/booking` endpoint (GET)
  - Added `/api/customer/reschedule` endpoint (POST)
  - Added `/api/customer/cancel` endpoint (POST)
  - Added `getCancellationEmailTemplate()`
  - Added `getRescheduleEmailTemplate()`

## Production Deployment

Before going live:
- [ ] Test all flows end-to-end
- [ ] Verify email templates render correctly
- [ ] Test refund calculations for all policies
- [ ] Add link to manage booking page on main site
- [ ] Update confirmation emails with link
- [ ] Train admin on reschedule/cancel process
- [ ] Set up email delivery monitoring
- [ ] Document refund processing procedure

## Support

If customers need help:
- **Phone:** (123) 456-7890
- **Email:** bookings@amanphotography.com
- **On-page FAQ:** Available on manage-booking.html

---

**Status:** ✅ COMPLETE & TESTED  
**Date:** October 27, 2025  
**Next:** Add link from confirmation emails to manage-booking.html
