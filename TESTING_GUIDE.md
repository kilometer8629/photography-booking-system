# Quick Start: Testing Customer Booking Management

## 🚀 How to Test Right Now

### Step 1: Start the Server
```bash
cd c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main
npm start
```

Wait for: **✅ Server running in development mode on port 3000**

### Step 2: Access the Manage Booking Page
Open browser to:
```
http://localhost:3000/manage-booking.html
```

### Step 3: Find a Test Booking

Use one of these test customers:
- **Email:** john@example.com
- **Email:** customer@test.com

Or search by **Booking/Session ID** if you have one

### Step 4: Test Each Feature

#### 🔍 **Search Test**
1. Enter email: `john@example.com`
2. Leave booking ID blank (optional)
3. Click "Find My Booking"
4. Should see booking details populate

#### 📅 **View Booking Details Test**
After successful search, you should see:
- Event date and time
- Location
- Package name
- Amount paid
- Current status
- Cancellation policy info

#### 📆 **Reschedule Test**
1. Click "Reschedule Booking" button
2. Modal opens with date/time picker
3. Select new date (pick future date)
4. Select new time
5. Enter optional reason: "Test reschedule"
6. Click "Submit Reschedule Request"
7. Success message appears
8. Check email inbox for confirmation

**Expected Email:**
- To: john@example.com
- Subject: "Reschedule Request Received - Ami Photography"
- Shows current & requested dates

#### ❌ **Cancel Test**
1. Click "Cancel Booking" button
2. Modal shows:
   - Cancellation policy explanation
   - Calculated refund amount
   - Refund timeline
3. Confirm you understand policy
4. Click "Confirm Cancellation"
5. Success message appears
6. Check email inbox for cancellation

**Expected Email:**
- To: john@example.com
- Subject: "Booking Cancellation Confirmation - Ami Photography"
- Shows refund amount and timeline

## 📊 Expected Refund Amounts

Test with bookings at different times:

### Scenario 1: Cancel 25 Days Before
- Booking amount: $500
- Policy: 21+ days = 90% refund
- **Expected refund: $450**

### Scenario 2: Cancel 14 Days Before
- Booking amount: $500
- Policy: 8-20 days = 50% refund
- **Expected refund: $250**

### Scenario 3: Cancel 5 Days Before
- Booking amount: $500
- Policy: <7 days = 0% refund
- **Expected refund: $0** (Non-refundable)

## 🧪 Manual API Testing

Use Postman or curl to test endpoints directly:

### Test 1: Find Booking
```bash
curl "http://localhost:3000/api/customer/booking?email=john@example.com"
```

Expected response:
```json
{
  "success": true,
  "booking": {
    "_id": "...",
    "clientName": "John Doe",
    "eventDate": "2025-11-15T14:00:00Z",
    "packageAmount": 50000,
    "status": "confirmed"
  }
}
```

### Test 2: Submit Reschedule
```bash
curl -X POST http://localhost:3000/api/customer/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "68fe5d1af1e666f30ef42e77",
    "newDate": "2025-12-01",
    "newTime": "10:00",
    "reason": "Conflict with work"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Reschedule request submitted! We'll confirm your new date within 24 hours."
}
```

### Test 3: Cancel Booking
```bash
curl -X POST http://localhost:3000/api/customer/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "68fe5d1af1e666f30ef42e77"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refundAmount": 45000,
  "refundReason": "21+ days before event - Full refund (minus 10% admin fee)"
}
```

## 🐛 Troubleshooting

### Issue: "Booking not found"
- ✓ Verify email address is correct
- ✓ Check booking exists in MongoDB
- ✓ Ensure email matches exactly (case-sensitive)

### Issue: Email not received
- ✓ Check spam/junk folder
- ✓ Verify SMTP settings in `.env` are correct
- ✓ Check server logs for email sending errors
- ✓ Test email transporter configuration

### Issue: Refund shows $0
- ✓ Check days calculation (if <7 days, it's $0)
- ✓ Verify event date is in future
- ✓ Look at booking's eventDate field

### Issue: Page shows blank
- ✓ Check browser console for errors (F12)
- ✓ Verify JavaScript is enabled
- ✓ Clear browser cache
- ✓ Check network tab for failed API calls

## 📋 Pre-Launch Checklist

- [ ] **Search works** - Can find booking by email
- [ ] **Refund calc correct** - Amounts match policy
- [ ] **Reschedule modal** - Opens and submits
- [ ] **Cancel modal** - Shows refund, allows confirmation
- [ ] **Reschedule email** - Receives confirmation
- [ ] **Cancel email** - Receives with refund amount
- [ ] **Mobile responsive** - Works on phone
- [ ] **Error handling** - Invalid emails show errors
- [ ] **Success messages** - Display after actions
- [ ] **Links work** - Can navigate to manage page

## 🔗 Navigation Links to Add

Add these links to relevant pages:

### On booking.html footer:
```html
<a href="/manage-booking.html">Manage Your Booking</a>
```

### On thank-you.html:
```html
<p>Need to make changes? <a href="/manage-booking.html">Manage your booking here</a></p>
```

### In confirmation emails (*.js template):
```html
<a href="http://localhost:3000/manage-booking.html">Manage Your Booking</a>
```

## 📞 Next Steps

1. **Test everything above** ✓
2. **Get admin approval** on refund policy ✓
3. **Add links** from other pages ✓
4. **Create admin guide** for handling requests ✓
5. **Update cancellation policy** page on website ✓
6. **Deploy to production** ✓

## 📚 File Locations

- **Customer Page:** `public/manage-booking.html`
- **API Endpoints:** `server/index.js` (lines ~738-854)
- **Email Templates:** `server/index.js` (functions at bottom)
- **Tests:** Run in browser console or use curl commands above

---

**Status:** ✅ Ready to Test  
**Date:** October 27, 2025  
**Time to test:** ~15 minutes for complete flow
