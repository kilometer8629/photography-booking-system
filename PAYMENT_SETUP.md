# Stripe Payment Setup & Webhook Configuration

## Overview
The photography booking system now includes automatic payment confirmation via Stripe webhooks. When a customer completes payment on Stripe Checkout, the booking is automatically updated in the database.

## What's New

### ✅ Updated Features
1. **Automatic Payment Confirmation** - Bookings are automatically marked as "confirmed" when payment succeeds
2. **Enhanced Booking Details** - Admin panel now shows:
   - Time slot (start & end time)
   - Payment amount
   - Direct link to Stripe dashboard
   - Payment date/time

3. **Webhook Event Handling**:
   - `checkout.session.completed` - Auto-confirms booking
   - `payment_intent.succeeded` - Logs successful payment
   - `charge.failed` - Marks booking as failed

### New Database Fields
```javascript
stripePaymentIntentId  // Stripe payment ID
stripePaidAt           // Timestamp when payment confirmed
```

## Configuration Steps

### Step 1: Get Your Webhook Secret
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add Endpoint**
4. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.failed`
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 2: Update Environment Variables
Edit your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

### Step 3: Restart Your Server
```bash
npm run dev:backend
```

## How It Works

### Payment Flow
```
1. Customer fills booking form
   ↓
2. Clicks "Confirm Booking"
   ↓
3. Redirected to Stripe Checkout
   ↓
4. Customer completes payment
   ↓
5. Stripe sends webhook event to `/api/webhooks/stripe`
   ↓
6. Booking status auto-updated to "confirmed"
   ↓
7. Admin can see confirmed status in dashboard
```

### Admin Dashboard Integration
- View time slot: Shows `HH:mm - HH:mm` format
- View amount: Shows formatted currency + amount
- View Stripe link: Direct link to Stripe test dashboard
- Status badge: Changes from "Pending" to "Confirmed"

## Testing Webhooks Locally

### Using Stripe CLI (Recommended)
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward events to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed

# Watch logs
stripe logs tail
```

### Testing Without CLI
1. Make a test payment in Stripe Checkout
2. Complete payment with test card: `4242 4242 4242 4242`
3. Use any future expiry date and any CVC
4. Check server logs for webhook processing
5. Verify booking status changed to "confirmed"

## Troubleshooting

### Webhook Not Triggering
- ✅ Check webhook endpoint is accessible from internet
- ✅ Verify `STRIPE_WEBHOOK_SECRET` is set in `.env`
- ✅ Check Stripe Dashboard webhook logs for failures
- ✅ Restart server after `.env` changes

### Booking Not Updating
1. Check server logs for errors
2. Verify booking exists with matching `stripeSessionId`
3. Check database for `stripePaidAt` field
4. Look for validation errors in console

### Development vs Production
- **Development**: Uses Stripe test mode keys
- **Production**: Update with live keys (sk_live_...)
- Webhook secrets are different for test vs live

## API Endpoint Reference

### Webhook Endpoint
```
POST /api/webhooks/stripe
```

**Accepts**: Raw Stripe event JSON with `stripe-signature` header

**Processes**:
- ✅ `checkout.session.completed` → Updates booking to confirmed
- ✅ `payment_intent.succeeded` → Logs success
- ✅ `charge.failed` → Marks booking as failed

### Database Query
Check if payments were processed:
```javascript
// Find confirmed bookings with payment
db.bookings.find({ 
  status: 'confirmed', 
  stripePaidAt: { $exists: true } 
})
```

## Security Notes

⚠️ **Important**: 
- Never expose `STRIPE_SECRET_KEY` in frontend code
- Always verify webhook signatures using `STRIPE_WEBHOOK_SECRET`
- Use HTTPS in production (required by Stripe)
- Store webhook secrets in environment variables, never in code

## Admin Features

### Booking Details Modal
The admin booking view now displays:

```
Client:           [Name]
Email:            [Email]
Phone:            [Phone]
Event Type:       [Santa Session]
Event Date:       [MM/DD/YYYY]
Time Slot:        [HH:mm - HH:mm]  ← NEW
Package:          [Package Name]
Amount:           [Currency Amount]  ← NEW
Status:           [Confirmed/Pending]
Stripe Session:   [Link to Dashboard]  ← NEW
Additional Notes: [Notes]
```

### Action Buttons
- **Pending**: Close / Cancel / Confirm
- **Confirmed**: Close / Cancel
- **Completed**: Close

## Next Steps

1. ✅ Get webhook secret from Stripe
2. ✅ Add to `.env` as `STRIPE_WEBHOOK_SECRET`
3. ✅ Update webhook endpoint in Stripe Dashboard
4. ✅ Test with Stripe CLI or test payment
5. ✅ Verify bookings auto-confirm on payment

## Support

For issues or questions:
- Check Stripe logs: Dashboard → Developers → Logs
- Review server logs: `npm run dev:backend`
- Test webhook manually: Use Stripe CLI `stripe trigger`
