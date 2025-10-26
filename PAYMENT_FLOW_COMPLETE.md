# Complete Payment & Tax Receipt Flow Documentation

## Overview
The Photography Booking system now has a complete, end-to-end payment processing flow with Stripe integration, webhook handling, thank you page, and automated tax receipt emails.

## System Components

### 1. ✅ Stripe Webhook Setup
**Status:** WORKING

**Configuration:**
- Webhook Secret: `whsec_00cc5d5e998c911d17aebb3442b87fda59094c528c6e6aa4faf4fdb949bdc5b0`
- Endpoint: `POST /api/webhooks/stripe`
- Environment: Development (localhost with Stripe CLI)

**Setup Instructions for Local Testing:**
```powershell
# In Terminal 1: Start Stripe CLI listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret from output and update .env
# STRIPE_WEBHOOK_SECRET=whsec_...

# In Terminal 2: Run Node.js server
npm start

# In Terminal 3: Trigger test events (optional)
stripe trigger checkout.session.completed
```

### 2. ✅ Thank You Page
**Status:** CREATED & READY

**File:** `public/thank-you.html`

**Features:**
- Beautiful success page with animated check mark
- Displays booking confirmation details:
  - Event Date & Time
  - Location
  - Package Name
  - Amount Paid
- Tax receipt confirmation message
- "What's Next?" section with 4-step process guide
- Contact information
- Mobile responsive design
- Auto-fetches booking details from server via session ID

**URL Structure:**
```
http://localhost:3000/thank-you.html?session_id={CHECKOUT_SESSION_ID}
```

**Redirect Flow:**
1. Customer completes Stripe checkout
2. Stripe redirects to thank you page with `session_id` parameter
3. Page queries `/api/booking-confirmation` endpoint
4. Booking details populated from database
5. Tax receipt notification displayed

### 3. ✅ Tax Receipt Email
**Status:** AUTOMATED & SENDING

**What Happens:**
- When webhook receives `checkout.session.completed` event:
  1. Booking status updated to "confirmed"
  2. Payment details saved to database
  3. **Tax receipt email automatically sent** to customer

**Email Template Features:**
- Professional gradient header
- Receipt ID (format: `AMI-{ID}-{YEAR}`)
- Receipt date
- Bill to information (customer name, email, phone)
- Itemized table with:
  - Package name and description
  - Event date, time, and location
  - Amount paid
- Visual confirmation badge
- Session details box
- Contact information footer
- Fully responsive HTML design

**Email Content Includes:**
- Professional branding
- Tax receipt designation
- Detailed session information
- Photo delivery timeline (7-10 business days)
- Support contact details

### 4. ✅ New API Endpoint: Booking Confirmation
**Status:** READY

**Endpoint:** `GET /api/booking-confirmation`

**Parameters:**
- `session_id` (required): Stripe checkout session ID

**Response:**
```json
{
  "success": true,
  "booking": {
    "_id": "...",
    "eventDate": "2025-10-27T...",
    "startTime": "14:00",
    "endTime": "14:30",
    "location": "Seattle, WA",
    "package": "Santa's Gift Pack",
    "clientName": "John Doe",
    "clientEmail": "john@example.com",
    "packageAmount": 50000,
    "packageCurrency": "$",
    "estimatedCost": 500,
    "status": "confirmed",
    "depositPaid": true
  }
}
```

### 5. ✅ Webhook Event Handling
**Status:** PROCESSING CORRECTLY

**Supported Events:**
- `checkout.session.completed` ✅
  - Updates booking to "confirmed"
  - Sets `depositPaid = true`
  - Saves `stripePaymentIntentId`
  - Records `stripePaidAt` timestamp
  - **Sends tax receipt email**

- `payment_intent.succeeded` ✅ (logged but no action required)

- `charge.failed` ✅ (marks booking as failed)

**Key Implementation Details:**

Webhook handler is positioned BEFORE body parser in middleware chain:
```javascript
// Must be FIRST before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), ...)

// Then body parser
app.use(express.json({ limit: '10mb' }));
```

This ensures raw request body is available for Stripe signature verification.

## Complete Payment Flow

### Step 1: Customer Creates Booking
1. Customer fills out booking form
2. Selects date, time, location, package
3. Enters contact information

### Step 2: Checkout Creation
1. Frontend calls `/api/create-checkout-session` with booking details
2. Server creates Zoho calendar event
3. Creates pending booking in MongoDB
4. Generates Stripe checkout session
5. Returns checkout URL to client

### Step 3: Stripe Payment
1. Customer redirected to Stripe checkout
2. Enters payment information
3. Completes payment

### Step 4: Success Redirect
1. Stripe redirects to: `http://localhost:3000/thank-you.html?session_id={SESSION_ID}`
2. Thank you page loads with animations
3. **Simultaneously:** Webhook processes payment

### Step 5: Webhook Processing
1. Stripe webhook delivers `checkout.session.completed` event
2. Server validates webhook signature
3. Finds booking in database
4. Updates booking status to "confirmed"
5. **Generates and sends tax receipt email**
6. Responds with 200 OK to Stripe

### Step 6: Customer Receives Confirmation
1. **Tax receipt email arrives** with:
   - Professional formatted receipt
   - All booking details
   - Session information
   - Delivery timeline
2. Customer sees thank you page with:
   - Booking confirmation details
   - Next steps guide
   - Contact information

## Configuration Files Updated

### `.env` Changes
```env
# Stripe Account ID for dashboard links
STRIPE_ACCOUNT_ID=acct_1SMQA6AY4Cs3JypY

# Updated to redirect to thank you page
STRIPE_SUCCESS_URL=http://localhost:3000/thank-you.html?session_id={CHECKOUT_SESSION_ID}

# Webhook secret from Stripe CLI
STRIPE_WEBHOOK_SECRET=whsec_00cc5d5e998c911d17aebb3442b87fda59094c528c6e6aa4faf4fdb949bdc5b0
```

### Email Configuration
Email sending uses existing Zoho SMTP configuration:
```env
EMAIL_HOST=smtp.zoho.com.au
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=notification@southsydney.net
EMAIL_PASS=0#u2@v6A6Kv@*R
```

## Database Schema Extensions

### Booking Model - New Fields
```javascript
stripeSessionId: String        // Stripe checkout session ID
stripePaymentIntentId: String // Stripe payment intent ID
stripePaidAt: Date            // Timestamp when payment confirmed
status: String                // "pending", "confirmed", "failed", etc.
depositPaid: Boolean          // Tracks payment confirmation
packageAmount: Number         // Amount in cents (50000 = $500)
packageCurrency: String       // Currency code (e.g., "$")
```

## Testing Workflow

### Local Testing with Stripe CLI

**Terminal 1: Start Webhook Listener**
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Expected output:
```
> Ready! Your webhook signing secret is: whsec_...
```

**Terminal 2: Start Server**
```powershell
npm start
```
Expected output:
```
✅ Server running in development mode
🔗 Access URL: http://localhost:3000
```

**Terminal 3: Create Test Booking**
1. Open http://localhost:3000/booking.html
2. Fill out booking form
3. Select date, time, package
4. Click "Proceed to Checkout"
5. Use test card: `4242 4242 4242 4242`
6. Complete payment

**Expected Results:**
- ✅ Redirected to thank you page
- ✅ Thank you page shows booking details
- ✅ Tax receipt email sent (check test email or logs)
- ✅ Booking status shows "confirmed" in admin panel
- ✅ Admin can view payment transaction link

### Manual Webhook Testing
```powershell
# Trigger test events
stripe trigger checkout.session.completed

# Check server logs for processing
# Should show: "✅ Checkout session completed"
# Should show: "✅ Email sent successfully"
```

## Error Handling

### Webhook Failures
- If booking not found: Returns 200 (Stripe requirement)
- If email fails: Logs warning, booking still confirms
- If signature verification fails: Returns 400, webhook not processed

### Email Failures
- Logs error but doesn't block booking confirmation
- Customer can still see thank you page
- Booking is confirmed in system
- Admin notified via logs

## Security Considerations

### 1. Webhook Signature Verification ✅
- All webhooks validated using Stripe secret
- Invalid signatures rejected with 400 error

### 2. Session ID in URL
- Session ID visible in URL (acceptable - customer-facing)
- Used only to display already-confirmed booking data
- No sensitive operations performed

### 3. Email Security
- Uses SMTP with SSL/TLS
- Credentials stored in `.env` (not exposed)
- Professional HTML email (no scripts)

## Production Deployment Notes

### Before Going Live:

1. **Stripe Keys**
   - Replace test keys with LIVE keys
   - Update `.env` with production keys
   - Get new webhook secret for production

2. **Email Configuration**
   - Verify SMTP credentials work in production
   - Configure SPF/DKIM/DMARC for email delivery
   - Test receipt email thoroughly

3. **Success URL**
   - Update `STRIPE_SUCCESS_URL` to production domain
   - Example: `https://amanphotography.com/thank-you.html?session_id={CHECKOUT_SESSION_ID}`

4. **Thank You Page**
   - Update contact information in HTML
   - Update footer links if needed
   - Test on production environment

5. **Database**
   - Backup MongoDB before going live
   - Test payment flow end-to-end

## Files Created/Modified

### Created:
- ✅ `public/thank-you.html` - Thank you page with confirmation

### Modified:
- ✅ `server/index.js` - Added webhook, tax receipt email, booking confirmation endpoint
- ✅ `.env` - Updated Stripe URLs and webhook secret
- ✅ `public/js/admin.js` - Updated with correct Stripe account ID in links

## Troubleshooting

### Webhook Returns 400
**Problem:** `[400] POST http://localhost:3000/api/webhooks/stripe`

**Solution:** 
- Ensure webhook secret in `.env` matches Stripe CLI output
- Check that `express.raw()` middleware is BEFORE body parser
- Verify Stripe CLI is running and forwarding events

### Tax Receipt Email Not Sent
**Problem:** Booking confirmed but no email received

**Solution:**
- Check email configuration in `.env`
- Verify SMTP credentials are correct
- Check server logs: `✅ Email sent successfully` or `⚠️ Failed to send`
- Test email sending separately if needed

### Thank You Page Shows "Loading..."
**Problem:** Page doesn't display booking details

**Solution:**
- Verify session ID is in URL parameters
- Check browser console for API errors
- Ensure `/api/booking-confirmation` endpoint is working
- Check server logs for errors

### Admin Panel Shows "Pending" After Payment
**Problem:** Booking doesn't show as "confirmed"

**Solution:**
- Wait 30 seconds for webhook to process
- Refresh admin panel
- Check server logs for webhook processing errors
- Check database for booking status field

## Next Steps

### Optional Enhancements:
1. SMS notifications on payment completion
2. Send thank you page link via email
3. Add option to download receipt as PDF
4. Implement payment status polling on thank you page
5. Add customer support chat on thank you page
6. Schedule follow-up emails (day before session, etc.)

### Monitoring:
1. Monitor webhook delivery in Stripe dashboard
2. Set up alerts for failed webhooks
3. Log email delivery metrics
4. Track booking confirmation rates

---

**Last Updated:** October 27, 2025
**Status:** ✅ COMPLETE & TESTED
