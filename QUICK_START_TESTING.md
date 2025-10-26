# Quick Start: Testing Payment & Tax Receipt Flow

## What's New ✨

1. **Thank You Page** - Beautiful success page at `/thank-you.html`
2. **Tax Receipt Email** - Automatic receipt sent when payment completes
3. **Webhook Handling** - Fixed to properly process Stripe events
4. **Booking Confirmation API** - New endpoint to fetch booking details

## Test the Complete Flow (5 minutes)

### Step 1: Update Webhook Secret
Your Stripe CLI output gave you this secret:
```
whsec_00cc5d5e998c911d17aebb3442b87fda59094c528c6e6aa4faf4fdb949bdc5b0
```

✅ **Already added to `.env`** - No action needed!

### Step 2: Start Everything

**Terminal 1 - Stripe Listener:**
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
You should see: `> Ready! Your webhook signing secret is: whsec_...`

**Terminal 2 - Node Server:**
```powershell
npm start
```
You should see: `✅ Server running in development mode`

### Step 3: Complete a Payment

1. Open http://localhost:3000/booking.html
2. Fill out the form:
   - Name: John Doe
   - Email: john@example.com
   - Phone: (123) 456-7890
   - Event Type: Wedding
   - Date: Pick a future date
   - Time: 2:00 PM
   - Location: Seattle, WA
   - Package: Any package
3. Click "Proceed to Checkout"
4. Use test card: `4242 4242 4242 4242`
5. Any future expiry, any CVC
6. Fill billing info with any address
7. Click "Pay"

### Step 4: Expected Results ✅

**What You'll See:**

1. **Immediately:**
   - Redirected to thank you page
   - Page shows: "Your payment has been received successfully"
   - Booking details appear (date, time, location, amount, package)
   - "Tax Receipt Sent!" message visible

2. **In Server Logs (Terminal 2):**
   ```
   ✅ Checkout session completed: cs_test_...
   ✅ Booking confirmed with payment
   ✅ Payment Intent ID saved: pi_...
   ✅ Email sent successfully: ...
   ```

3. **In Stripe Listener (Terminal 1):**
   ```
   --> checkout.session.completed [evt_...]
   <-- [200] POST http://localhost:3000/api/webhooks/stripe
   ```

4. **In Admin Panel:**
   - Status shows: "Confirmed (Payment Received) ✓"
   - "View Transaction" link available
   - "Paid At" timestamp shows current time

5. **Tax Receipt Email:**
   - Check your test email inbox
   - Should contain professional receipt with:
     - Receipt ID (AMI-XXXXXXXX-2025)
     - Booking details
     - Amount paid
     - Session information

## Verify Everything Works

### Check Tax Receipt Email Sent:
Look for this in server logs:
```
✅ Tax receipt email sent to john@example.com
```

If you see warning:
```
⚠️ Failed to send tax receipt email: ...
```
Check email configuration in `.env`

### Check Webhook Processed:
Look for this in server logs:
```
📍 Processing Stripe event: checkout.session.completed
✅ Booking ... confirmed with payment
```

### Check Thank You Page Loads:
1. Go to thank you page URL
2. Details should appear within 2 seconds
3. If you see "Loading...", wait 5 more seconds
4. If still loading, check browser console for errors

## Troubleshooting

### Problem: Webhook shows [400] error
**Fix:** Make sure webhook secret in `.env` matches your Stripe CLI output

### Problem: Thank you page doesn't show details
**Fix:** 
- Refresh the page
- Check browser console (F12)
- Wait 30 seconds for webhook to process

### Problem: No tax receipt email received
**Fix:**
- Check server logs for "Email sent" message
- Verify email address was entered correctly
- Check spam folder
- If using Gmail test account, check you configured app password

### Problem: Booking shows "Pending" in admin
**Fix:**
- Refresh admin panel
- Wait 30 seconds for webhook
- Check server logs for errors

## Admin Dashboard

After successful payment, check:

**Admin Panel → Bookings**

Click on the booking you just created:
- ✅ Status shows "Confirmed"
- ✅ "Payment Received ✓" badge visible
- ✅ "Paid At" shows today's date and time
- ✅ "View Transaction" link goes to Stripe dashboard
- ✅ Additional notes show: "Payment confirmed via Stripe on..."

## What Happens Behind the Scenes

```
Customer Pays
    ↓
Stripe Processes Payment
    ↓
Browser Redirects to Thank You Page
    ↓
Webhook Event Sent to Your Server (async)
    ↓
Server Updates Booking: "confirmed"
    ↓
Server Sends Tax Receipt Email
    ↓
Customer Sees Thank You + Booking Details
Customer Receives Tax Receipt Email
```

## Files to Review

- **Thank You Page:** `public/thank-you.html` (256 lines)
- **Webhook Handler:** `server/index.js` lines 260-315
- **Tax Receipt Email:** `server/index.js` lines 1160-1220
- **API Endpoint:** `server/index.js` lines 726-750
- **Configuration:** `.env` (webhook secret + success URL)

## Next: Production

When ready to go live:

1. Get production Stripe keys
2. Update `.env` with production keys
3. Get new webhook secret for production
4. Update `STRIPE_SUCCESS_URL` to your domain
5. Verify email configuration
6. Test complete flow with production keys

---

**Status:** ✅ Ready to Test!

Try it now and let me know if you see any issues.
