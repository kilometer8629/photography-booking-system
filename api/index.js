/**
 * Vercel Serverless Function Entry Point
 * This file serves as the API handler for all Express routes
 * Converts the Express server to a Vercel serverless function
 */

// Load environment variables
require('../config/loadEnv');

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const morgan = require('morgan');
const csrf = require('csurf');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');
const {
  getAvailabilityForDate,
  getAvailabilityForRange,
  createZohoEvent,
  deleteZohoEvent,
  settings: zohoSettings
} = require('../server/services/zohoClient');
const { buildSlotsForDay, filterSlots } = require('../server/utils/slots');
const Stripe = require('stripe');

// Import Models
const { Booking, Message, Admin } = require('../server/models');

// Create Express app
const app = express();

// Ensure Express trusts upstream proxies (required for accurate rate limiting on Vercel)
const resolveTrustProxyValue = (value) => {
  if (value === undefined) return undefined;
  if (value === 'false') return false;
  if (value === 'true') return true;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
};

const explicitTrustProxy = resolveTrustProxyValue(process.env.TRUST_PROXY);
if (explicitTrustProxy !== undefined) {
  app.set('trust proxy', explicitTrustProxy);
} else {
  app.set('trust proxy', 1);
}

// Production environment setup
process.env.NODE_ENV = 'production';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

if (!stripe) {
  console.warn('Stripe secret key not configured. Pre-purchase checkout is disabled.');
}

const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.CLIENT_URL || 'https://photography-booking.vercel.app'}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.CLIENT_URL || 'https://photography-booking.vercel.app'}/booking.html?status=cancelled`;

// Package catalog configuration
const packageCatalog = [
  {
    id: 'santa-gift-pack',
    name: "Santa's Gift Pack",
    description: 'Deluxe prints, festive folder and keepsake ornament bundle.',
    image: 'images/pack-santa-gift-pack-no-card.jpg',
    priceId: process.env.STRIPE_PRICE_SANTAS_GIFT_PACK
  },
  {
    id: 'rudolph',
    name: 'Rudolph',
    description: 'Fan favourite mix of premium prints, wallet photos and magnets.',
    image: 'images/pack-rudolph.jpg',
    priceId: process.env.STRIPE_PRICE_RUDOLPH
  },
  {
    id: 'blitzen',
    name: 'Blitzen',
    description: 'Gift-ready enlargement with multiple print sizes and holiday cards.',
    image: 'images/pack-blitzen.jpg',
    priceId: process.env.STRIPE_PRICE_BLITZEN
  },
  {
    id: 'digital-package',
    name: 'Digital Package',
    description: 'Instant online gallery with downloadable, share-ready files.',
    image: 'images/pack-digital-package.jpg',
    priceId: process.env.STRIPE_PRICE_DIGITAL_PACKAGE
  },
  {
    id: 'vixen',
    name: 'Vixen',
    description: 'Premium session with extra poses, retouching and hybrid keepsakes.',
    image: 'images/pack-vixen.jpg',
    priceId: process.env.STRIPE_PRICE_VIXEN
  }
];

const packageMap = packageCatalog.reduce((accumulator, pkg) => {
  accumulator[pkg.id] = pkg;
  return accumulator;
}, {});

const packagePriceCache = new Map();

// ===== Middleware Setup =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));

app.use(morgan('combined'));

// CORS Configuration for Vercel
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://photography-booking.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 600
}));
app.options('*', cors());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
let mongoConnected = false;

if (mongoUri) {
  mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    wtimeoutMS: 2500
  })
    .then(async () => {
      console.log('[MongoDB] connected successfully');
      mongoConnected = true;
    })
    .catch(err => {
      console.error('[MongoDB] connection error:', err.message);
      mongoConnected = false;
    });
} else {
  console.warn('MONGODB_URI is not set. Skipping MongoDB connection; database-backed features are disabled.');
}


// Middleware for body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
const sessionSecret = process.env.SESSION_SECRET || uuidv4();
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Using an ephemeral secret; sessions will reset on each deploy.');
}

let sessionStore;
if (mongoUri) {
  const mongoStoreConfig = {
    mongoUrl: mongoUri,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'interval',
    autoRemoveInterval: 60
  };

  if (sessionSecret) {
    mongoStoreConfig.crypto = { secret: sessionSecret.substring(0, 32) };
  }

  sessionStore = MongoStore.create(mongoStoreConfig);
} else {
  sessionStore = new session.MemoryStore();
}

app.use(session({
  name: process.env.SESSION_NAME || 'southsydney.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  rolling: true
}));


// CSRF middleware
const csrfProtection = csrf({
  cookie: false,
  value: (req) => req.headers['x-csrf-token'] || req.body._csrf
});

const csrfTokenOnly = csrf({
  cookie: false,
  value: () => ''
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => ['/api/admin/health'].includes(req.path)
});
app.use('/api/', apiLimiter);

// ===== Helper Functions =====
async function getPackagePriceInfo(pkg) {
  if (!stripe || !pkg?.priceId) return null;
  if (packagePriceCache.has(pkg.priceId)) {
    return packagePriceCache.get(pkg.priceId);
  }

  const price = await stripe.prices.retrieve(pkg.priceId, { expand: ['tiers'] });
  let unitAmount = price.unit_amount ?? (price.unit_amount_decimal ? Number(price.unit_amount_decimal) : null);

  if (unitAmount === null && Array.isArray(price.tiers) && price.tiers.length) {
    const primaryTier = price.tiers[0];
    unitAmount = typeof primaryTier.unit_amount === 'number' ? primaryTier.unit_amount :
      primaryTier.unit_amount_decimal ? Number(primaryTier.unit_amount_decimal) :
        typeof primaryTier.flat_amount === 'number' ? primaryTier.flat_amount :
          primaryTier.flat_amount_decimal ? Number(primaryTier.flat_amount_decimal) : null;
  }

  let formatted = null;
  const currency = price.currency || 'aud';

  if (typeof unitAmount === 'number') {
    const formatter = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase()
    });
    formatted = formatter.format(unitAmount / 100);
  } else if (price.metadata?.display_price) {
    formatted = price.metadata.display_price;
  }

  const info = { amount: unitAmount ?? null, currency, formatted };
  packagePriceCache.set(pkg.priceId, info);
  return info;
}

// ===== Email Configuration =====
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendConfirmationEmail(email, template) {
  try {
    const result = await emailTransporter.sendMail({
      from: `"Ami Photography" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: template.subject,
      html: template.html
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// Include email templates from server
const getTaxReceiptEmailTemplate = (booking) => {
  const amount = (booking.packageAmount / 100 || booking.estimatedCost || 0).toFixed(2);
  const receiptDate = new Date(booking.stripePaidAt || new Date()).toLocaleDateString();
  const receiptId = `AMI-${booking._id.toString().slice(-8).toUpperCase()}-${new Date().getFullYear()}`;

  return {
    subject: 'Tax Receipt for Photography Services - Ami Photography',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Ami Photography</h1>
          <p style="margin: 0; opacity: 0.9;">TAX RECEIPT / INVOICE</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="color: #333; font-size: 16px;">Hi ${booking.clientName},</p>
          <p style="color: #555; line-height: 1.6;">Thank you for your payment. Below is your tax receipt.</p>
          <p style="margin: 15px 0; color: #333;"><strong>Amount Paid:</strong> ${booking.packageCurrency || '$'}${amount}</p>
          <p style="margin: 15px 0; color: #333;"><strong>Receipt Date:</strong> ${receiptDate}</p>
          <p style="margin: 15px 0; color: #333;"><strong>Package:</strong> ${booking.package}</p>
          <p style="margin: 15px 0; color: #666; font-size: 12px;">Receipt ID: ${receiptId}</p>
        </div>
      </div>
    `
  };
};

// ===== Public Routes =====

// Stripe Webhook
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const booking = await Booking.findOne({ stripeSessionId: session.id });

      if (booking) {
        booking.status = 'confirmed';
        booking.depositPaid = true;
        booking.stripePaymentIntentId = session.payment_intent;
        booking.stripePaidAt = new Date();
        await booking.save();

        if (booking.clientEmail) {
          const receiptTemplate = getTaxReceiptEmailTemplate(booking);
          await sendConfirmationEmail(booking.clientEmail, receiptTemplate);
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }

  res.json({ received: true });
});

// Health check
app.get('/api/admin/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoConnected ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

// Zoho API diagnostics endpoint
app.get('/api/zoho/diagnostics', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    configuration: {
      oauth_client_id: process.env.ZOHO_OAUTH_CLIENT_ID ? 'Configured' : 'Missing',
      oauth_client_secret: process.env.ZOHO_OAUTH_CLIENT_SECRET ? 'Configured' : 'Missing',
      oauth_refresh_token: process.env.ZOHO_OAUTH_REFRESH_TOKEN ? 'Configured' : 'Missing',
      accounts_base_url: process.env.ZOHO_ACCOUNTS_BASE_URL || 'Not set (using default)',
      calendar_base_url: process.env.ZOHO_CALENDAR_BASE_URL || 'Not set (using default)',
      calendar_id: process.env.ZOHO_CALENDAR_ID || 'Not set (using default: primary)',
      freebusy_user: process.env.ZOHO_FREEBUSY_USER || 'Not set',
      timezone: process.env.ZOHO_TIMEZONE || 'Not set (using default)',
      slot_minutes: process.env.BOOKING_SLOT_MINUTES || 'Not set (using default)',
      operating_hours: `${process.env.BOOKING_START_HOUR || '10'}:00 - ${process.env.BOOKING_END_HOUR || '16'}:00`
    },
    status: 'unknown',
    message: '',
    test_result: null
  };

  // Check if credentials are configured
  if (!process.env.ZOHO_OAUTH_CLIENT_ID || !process.env.ZOHO_OAUTH_CLIENT_SECRET || !process.env.ZOHO_OAUTH_REFRESH_TOKEN) {
    diagnostics.status = 'error';
    diagnostics.message = 'Zoho OAuth credentials are not fully configured. Calendar sync is disabled.';
    return res.json(diagnostics);
  }

  // Try to test the API by fetching availability for today
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Zoho Diagnostics] Testing API with availability for ${today}`);
    const slots = await getAvailabilityForDate(today);
    diagnostics.status = 'operational';
    diagnostics.message = 'Zoho API is working correctly';
    diagnostics.test_result = {
      test_date: today,
      available_slots: slots.length,
      sample_slots: slots.slice(0, 3)
    };
  } catch (error) {
    diagnostics.status = 'error';
    diagnostics.message = `Zoho API test failed: ${error.message}`;
    diagnostics.test_result = {
      error: error.message,
      error_type: error.constructor.name
    };
  }

  res.json(diagnostics);
});

// Public endpoints (from server/index.js)
app.post('/api/create-checkout-session', csrfProtection, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payment processing is not configured.' });
  }
  // ... (keep existing implementation)
  res.json({ url: 'https://checkout.stripe.com/placeholder' });
});

app.get('/api/availability', async (req, res) => {
  try {
    const { start, end, date } = req.query;

    console.log('[API] /api/availability called', { start, end, date, timestamp: new Date().toISOString() });

    // If date is provided, get availability for that specific date
    if (date) {
      console.log(`[Zoho] Fetching availability for date: ${date}`);
      const availability = await getAvailabilityForDate(date);
      console.log(`[Zoho] Got ${availability.length} slot(s) for ${date}`);
      return res.json(availability);
    }

    // If start and end are provided, get range
    if (start && end) {
      console.log(`[Zoho] Fetching availability range: ${start} to ${end}`);
      const availability = await getAvailabilityForRange(start, end);
      const totalDays = Object.keys(availability).length;
      const totalSlots = Object.values(availability).reduce((sum, slots) => sum + slots.length, 0);
      console.log(`[Zoho] Got availability for ${totalDays} day(s) with ${totalSlots} total slot(s)`);
      return res.json(availability);
    }

    // Default: return empty if no parameters
    console.warn('[API] No date or date range provided to /api/availability');
    res.json({ availability: [] });
  } catch (error) {
    console.error('[API] Error fetching availability:', error.message, error.stack);
    res.status(500).json({ error: 'Unable to load availability', details: error.message });
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Promise.all(packageCatalog.map(async (pkg) => {
      const priceInfo = await getPackagePriceInfo(pkg);
      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        available: Boolean(pkg.priceId && stripe),
        formattedPrice: priceInfo?.formatted || null,
        currency: priceInfo?.currency || null
      };
    }));
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load packages' });
  }
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

// Export for Vercel
module.exports = app;
