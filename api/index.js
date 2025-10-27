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
const { getZohoDiagnostics } = require('../server/services/zohoDiagnostics');
const { buildSlotsForDay, filterSlots } = require('../server/utils/slots');
const Stripe = require('stripe');

// Import Models
const { Booking, Message, Admin } = require('../server/models');

// ===== Helper Functions =====

/**
 * Escape HTML entities to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

// CSRF Token endpoint
app.get('/api/csrf-token', csrfTokenOnly, (req, res) => {
  res.json({ 
    token: req.csrfToken(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
});

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ 
    token: req.csrfToken(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
});

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

// Zoho API diagnostics endpoint (public for troubleshooting)
app.get('/api/zoho/diagnostics', async (req, res) => {
  try {
    // Only include sample data for authenticated admin users
    const includeSamples = req.session?.admin ? true : false;
    const diagnostics = await getZohoDiagnostics({ includeSamples });
    res.json(diagnostics);
  } catch (error) {
    console.error('[Zoho Diagnostics] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve diagnostics',
      timestamp: new Date().toISOString()
    });
  }
});

// Public endpoints (from server/index.js)
app.post('/api/create-checkout-session', csrfProtection, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payment processing is not configured.' });
  }

  const {
    selectedDate,
    selectedTime,
    packageId,
    location,
    packageName,
    customerName,
    customerEmail,
    customerPhone,
    packagePrice,
    packageAmount,
    packageCurrency
  } = req.body || {};

  if (!selectedDate || !selectedTime || !packageId || !location) {
    return res.status(400).json({ error: 'Missing booking details for checkout.' });
  }

  if (!customerName || !customerEmail || !customerPhone) {
    return res.status(400).json({ error: 'Please provide your contact details before continuing.' });
  }

  const packageMeta = packageMap[packageId];

  if (!packageMeta || !packageMeta.priceId) {
    return res.status(400).json({ error: 'Selected package is unavailable.' });
  }

  let priceInfo = null;
  let zohoEventRecord = null;
  let bookingDocument = null;

  try {
    const availableSlots = await getAvailabilityForDate(selectedDate);
    if (!availableSlots.includes(selectedTime)) {
      return res.status(409).json({ error: 'That session time has just been booked. Please choose another slot.' });
    }

    zohoEventRecord = await createZohoEvent({
      date: selectedDate,
      time: selectedTime,
      durationMinutes: zohoSettings.slotMinutes,
      summary: `${packageName || packageMeta.name} - Santa Session`,
      description: 'Generated from the online Santa photo booking portal.',
      location
    });

    priceInfo = await getPackagePriceInfo(packageMeta);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: packageMeta.priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      phone_number_collection: {
        enabled: true
      },
      metadata: {
        location,
        selectedDate,
        selectedTime,
        packageId: packageMeta.id,
        packageName: packageName || packageMeta.name,
        zohoEventId: zohoEventRecord.id,
        customerName,
        customerEmail,
        customerPhone,
        packagePrice: packagePrice || priceInfo?.formatted || '',
        packageCurrency: packageCurrency || priceInfo?.currency || '',
        packageAmount: (packageAmount ?? priceInfo?.amount)?.toString() || ''
      }
    });

    const startDateTime = DateTime.fromISO(`${selectedDate}T${selectedTime}`, {
      zone: zohoSettings.calendarTimezone || 'Australia/Sydney'
    });
    const endDateTime = startDateTime.plus({ minutes: zohoSettings.slotMinutes });

    bookingDocument = await Booking.create({
      eventType: 'Santa Session',
      eventDate: startDateTime.toJSDate(),
      startTime: startDateTime.toFormat('HH:mm'),
      endTime: endDateTime.toFormat('HH:mm'),
      location,
      package: packageName || packageMeta.name,
      status: 'pending',
      additionalNotes: 'Awaiting Stripe payment confirmation via Stripe Checkout.',
      depositPaid: false,
      depositAmount: 0,
      zohoEventId: zohoEventRecord.id,
      stripeSessionId: session.id,
      packageId: packageMeta.id,
      clientName: customerName,
      clientEmail: customerEmail,
      clientPhone: customerPhone,
      packagePrice: packagePrice || priceInfo?.formatted || '',
      packageCurrency: packageCurrency || priceInfo?.currency || '',
      packageAmount: (packageAmount ?? priceInfo?.amount) || undefined,
      estimatedCost: priceInfo?.amount ? priceInfo.amount / 100 : undefined
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    if (bookingDocument?._id) {
      try {
        await Booking.deleteOne({ _id: bookingDocument._id });
      } catch (cleanupError) {
        console.error('Failed to remove pending booking after error:', cleanupError);
      }
    }
    if (zohoEventRecord?.id) {
      try {
        await deleteZohoEvent(zohoEventRecord.id);
      } catch (cleanupError) {
        console.error('Failed to remove Zoho event after error:', cleanupError);
      }
    }
    res.status(500).json({ error: 'Unable to start payment. Please try again.' });
  }
});

app.get('/api/availability', async (req, res) => {
  try {
    const { date, start, end } = req.query || {};
    console.log('[API] /api/availability endpoint called', { date, start, end, timestamp: new Date().toISOString() });

    // Fetch booked slots from database (confirmed or pending)
    console.log('[API] Fetching booked slots from database...');
    const bookedSlots = await Booking.find({
      status: { $in: ['confirmed', 'pending'] }
    }).select('eventDate startTime').lean();
    console.log(`[API] Found ${bookedSlots.length} booked slot(s) in database`);

    const bookedSet = new Set();
    bookedSlots.forEach((booking) => {
      if (booking.eventDate && booking.startTime) {
        const eventDateStr = booking.eventDate.toISOString().split('T')[0];
        bookedSet.add(`${eventDateStr}:${booking.startTime}`);
      }
    });

    if (date) {
      console.log(`[API] Requesting availability for single date: ${date}`);
      const slots = await getAvailabilityForDate(date);
      const filteredSlots = slots.filter((slot) => !bookedSet.has(`${date}:${slot}`));
      console.log(`[API] Returning ${filteredSlots.length} available slot(s) for ${date} (${slots.length - filteredSlots.length} filtered by bookings)`);
      return res.json({
        date,
        slots: filteredSlots,
        slotMinutes: zohoSettings.slotMinutes
      });
    }

    if (start && end) {
      console.log(`[API] Requesting availability for date range: ${start} to ${end}`);
      const days = await getAvailabilityForRange(start, end);
      const filteredDays = {};
      let totalSlots = 0;
      let totalFiltered = 0;

      Object.entries(days).forEach(([dayDate, daySlots]) => {
        const filtered = daySlots.filter((slot) => !bookedSet.has(`${dayDate}:${slot}`));
        filteredDays[dayDate] = filtered;
        totalSlots += daySlots.length;
        totalFiltered += filtered.length;
      });

      console.log(`[API] Returning ${totalFiltered} available slot(s) across ${Object.keys(filteredDays).length} day(s) (${totalSlots - totalFiltered} filtered by bookings)`);
      return res.json({
        days: filteredDays,
        slotMinutes: zohoSettings.slotMinutes
      });
    }

    console.warn('[API] No date or date range provided');
    return res.status(400).json({ error: 'Please provide a date or range to check availability.' });
  } catch (error) {
    console.error('[API] Availability fetch error:', error.message, error.stack);
    try {
      const fallbackConfig = {
        timezone: zohoSettings.calendarTimezone || 'Australia/Sydney',
        startHour: zohoSettings.operatingStartHour || 10,
        endHour: zohoSettings.operatingEndHour || 16,
        slotMinutes: zohoSettings.slotMinutes || 5
      };

      if (date) {
        const { slots } = buildSlotsForDay(date, fallbackConfig);
        return res.json({
          date,
          slots: slots.map((slot) => slot.label),
          slotMinutes: fallbackConfig.slotMinutes,
          fallback: true
        });
      }

      if (start && end) {
        const startDate = DateTime.fromISO(start, { zone: fallbackConfig.timezone }).startOf('day');
        const endDate = DateTime.fromISO(end, { zone: fallbackConfig.timezone }).startOf('day');
        const days = {};

        if (!startDate.isValid || !endDate.isValid) {
          throw new Error('Invalid fallback range provided.');
        }

        let cursor = startDate;
        while (cursor <= endDate) {
          const { slots } = buildSlotsForDay(cursor.toISODate(), fallbackConfig);
          days[cursor.toISODate()] = slots.map((slot) => slot.label);
          cursor = cursor.plus({ days: 1 });
        }

        return res.json({
          days,
          slotMinutes: fallbackConfig.slotMinutes,
          fallback: true
        });
      }
    } catch (fallbackError) {
      console.error('Availability fallback error:', fallbackError);
    }

    res.status(500).json({ error: 'Unable to load availability. Please try again.' });
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

// ===== Customer Booking Management Endpoints =====

app.get('/api/booking-confirmation', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
    }

    // Validate session_id format (Stripe session IDs start with 'cs_')
    if (typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
      return res.status(400).json({ success: false, error: 'Invalid session ID format' });
    }

    // Find booking by Stripe session ID
    const booking = await Booking.findOne({ stripeSessionId: session_id });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Return sanitized booking details for display
    res.json({
      success: true,
      booking: {
        _id: booking._id,
        eventDate: booking.eventDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        location: booking.location,
        package: booking.package,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        packageAmount: booking.packageAmount,
        packageCurrency: booking.packageCurrency,
        estimatedCost: booking.estimatedCost,
        status: booking.status,
        depositPaid: booking.depositPaid
      }
    });
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({ success: false, error: 'Unable to retrieve booking details' });
  }
});

// GET: Fetch customer's booking by email
app.get('/api/customer/booking', async (req, res) => {
  try {
    const { email, bookingId } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address required' });
    }

    // Validate email format - simple regex to prevent ReDoS
    // Basic validation: has @ and . after @, reasonable length
    if (email.length > 254 || !email.includes('@') || email.indexOf('.', email.indexOf('@')) === -1) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate bookingId format if provided (MongoDB ObjectId is 24 hex chars)
    if (bookingId && (typeof bookingId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(bookingId))) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    // Find by booking ID first if provided, otherwise find by email
    let query = bookingId ? { _id: bookingId } : { clientEmail: email };
    const booking = await Booking.findOne(query);

    if (!booking) {
      return res.status(404).json({ error: 'No booking found with that email address' });
    }

    // If searching by ID, verify it matches the email
    if (bookingId && booking.clientEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match this booking' });
    }

    res.json({
      success: true,
      booking: {
        _id: booking._id,
        eventDate: booking.eventDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        location: booking.location,
        package: booking.package,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        clientPhone: booking.clientPhone,
        packageAmount: booking.packageAmount,
        packageCurrency: booking.packageCurrency,
        estimatedCost: booking.estimatedCost,
        status: booking.status,
        depositPaid: booking.depositPaid,
        stripePaidAt: booking.stripePaidAt
      }
    });
  } catch (error) {
    console.error('Customer booking lookup error:', error);
    res.status(500).json({ error: 'Unable to retrieve booking' });
  }
});

// Email template functions
const getRescheduleEmailTemplate = (booking, newDate, newTime, reason) => {
  const eventDate = DateTime.fromJSDate(new Date(booking.eventDate), { zone: 'Australia/Sydney' });
  const requestedDate = DateTime.fromISO(newDate, { zone: 'Australia/Sydney' });
  
  return {
    subject: 'Reschedule Request Received - Ami Photography',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Reschedule Request Received</h1>
          <p style="margin: 0; opacity: 0.9;">We're working on your new date</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
          
          <p style="color: #333; font-size: 16px;">Hi ${escapeHtml(booking.clientName)},</p>
          
          <p style="color: #555; line-height: 1.6;">
            Thank you for submitting your reschedule request. We've received your request and will confirm your new date within 24 hours.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
            <h3 style="color: #667eea; margin-top: 0;">Current Booking Details</h3>
            <p style="margin: 10px 0; color: #555;">
              <strong>Current Date:</strong> ${eventDate.toFormat('EEEE, MMMM d, yyyy')}<br>
              <strong>Current Time:</strong> ${escapeHtml(booking.startTime)}<br>
              <strong>Location:</strong> ${escapeHtml(booking.location)}<br>
              <strong>Package:</strong> ${escapeHtml(booking.package)}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            
            <h3 style="color: #667eea; margin-top: 0;">Your Requested New Date</h3>
            <p style="margin: 10px 0; color: #555;">
              <strong>Requested Date:</strong> ${requestedDate.toFormat('EEEE, MMMM d, yyyy')}<br>
              <strong>Requested Time:</strong> ${escapeHtml(newTime)}
            </p>
            
            ${reason ? `<p style="margin: 15px 0; color: #666;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
          </div>
          
          <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32; font-size: 14px;">
              <strong>✓ What's Next?</strong> We'll confirm availability for your new date and send you a confirmation email within 24 hours. Your package and price remain the same.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 5px 0;">If you need to change your request or have questions, please contact us:<br>
            📞 (123) 456-7890 • ✉️ info@amiphotography.com<br>
            <br>
            Thank you for your patience!</p>
          </div>
        </div>
      </div>
    `
  };
};

const getCancellationEmailTemplate = (booking, refundAmount, refundReason) => {
  const amount = (booking.packageAmount / 100 || 0).toFixed(2);
  const refund = (refundAmount / 100).toFixed(2);
  
  return {
    subject: 'Booking Cancellation Confirmation - Ami Photography',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Booking Cancelled</h1>
          <p style="margin: 0; opacity: 0.9;">Cancellation Confirmation</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
          
          <p style="color: #333; font-size: 16px;">Hi ${escapeHtml(booking.clientName)},</p>
          
          <p style="color: #555; line-height: 1.6;">
            Your photography booking has been successfully cancelled. We're sorry to see you go, but we understand things come up. 
            Below are your cancellation details and refund information.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; color: #666;"><strong>Original Amount Paid:</strong></td>
                <td style="text-align: right; padding: 12px 0; color: #333; font-weight: 600;">${escapeHtml(booking.packageCurrency || '$')}${amount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; color: #666;"><strong>Cancellation Reason:</strong></td>
                <td style="text-align: right; padding: 12px 0; color: #333;">${escapeHtml(refundReason)}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; color: #667eea; font-size: 16px;"><strong>Refund Amount:</strong></td>
                <td style="text-align: right; padding: 15px 0; background-color: #e8f5e9; border-radius: 4px; padding-right: 10px; font-weight: 700; color: #2e7d32; font-size: 18px;">
                  ${escapeHtml(booking.packageCurrency || '$')}${refund}
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #1565c0; font-size: 14px;">
              <strong>✓ Refund Processing:</strong> Your refund of ${escapeHtml(booking.packageCurrency || '$')}${refund} will be processed to your original payment method within 5-7 business days.
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Want to reschedule instead?</strong> Visit our booking management page to reschedule for another date.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 5px 0;">If you have any questions about your cancellation or refund, please contact us:<br>
            📞 (123) 456-7890 • ✉️ info@amiphotography.com<br>
            <br>
            We hope to work with you again in the future!</p>
          </div>
        </div>
      </div>
    `
  };
};

// POST: Reschedule booking
app.post('/api/customer/reschedule', async (req, res) => {
  try {
    const { bookingId, newDate, newTime, reason } = req.body;

    if (!bookingId || !newDate || !newTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate bookingId format (MongoDB ObjectId is 24 hex chars)
    if (typeof bookingId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    // Validate date format (ISO 8601 date: YYYY-MM-DD)
    if (typeof newDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate time format (HH:MM)
    if (typeof newTime !== 'string' || !/^\d{2}:\d{2}$/.test(newTime)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot reschedule a cancelled booking' });
    }

    const eventDate = new Date(booking.eventDate);
    if (eventDate < new Date()) {
      return res.status(400).json({ error: 'Cannot reschedule past events' });
    }

    // Update booking with reschedule request
    booking.additionalNotes = `Reschedule request submitted:\nRequested date: ${newDate} at ${newTime}\nReason: ${reason || 'Not provided'}\nOriginal date: ${booking.eventDate}`;
    booking.status = 'pending_reschedule';
    await booking.save();

    // Send reschedule confirmation email
    const rescheduleTemplate = getRescheduleEmailTemplate(booking, newDate, newTime, reason);
    await sendConfirmationEmail(booking.clientEmail, rescheduleTemplate);

    console.log(`✅ Reschedule request submitted for booking ${bookingId}`);

    res.json({ success: true, message: 'Reschedule request submitted. You\'ll receive confirmation within 24 hours.' });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ error: 'Unable to process reschedule request' });
  }
});

// POST: Cancel booking
app.post('/api/customer/cancel', async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' });
    }

    // Validate bookingId format (MongoDB ObjectId is 24 hex chars)
    if (typeof bookingId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Calculate refund based on cancellation policy
    const eventDate = new Date(booking.eventDate);
    const daysUntilEvent = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
    let refundPercentage = 0;
    let refundReason = '';

    if (daysUntilEvent < 0) {
      refundPercentage = 0;
      refundReason = 'Event already passed - no refund';
    } else if (daysUntilEvent >= 21) {
      refundPercentage = 90; // Full minus 10% admin fee
      refundReason = '21+ days before event - Full refund (minus 10% admin fee)';
    } else if (daysUntilEvent >= 8) {
      refundPercentage = 50;
      refundReason = '8-20 days before event - 50% refund';
    } else {
      refundPercentage = 0;
      refundReason = 'Less than 7 days before event - Non-refundable per policy';
    }

    const refundAmount = Math.round((booking.packageAmount || 0) * refundPercentage / 100);

    // Update booking
    booking.status = 'cancelled';
    booking.additionalNotes = `Booking cancelled by customer. ${refundReason}. Refund amount: ${booking.packageCurrency || '$'}${(refundAmount / 100).toFixed(2)}`;
    await booking.save();

    // Send cancellation confirmation email
    const cancellationTemplate = getCancellationEmailTemplate(booking, refundAmount, refundReason);
    await sendConfirmationEmail(booking.clientEmail, cancellationTemplate);

    console.log(`✅ Booking ${bookingId} cancelled by customer. Refund: $${(refundAmount / 100).toFixed(2)}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount: refundAmount,
      refundReason: refundReason
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Unable to cancel booking' });
  }
});

// Contact form email template
const getContactEmailTemplate = (name, formData) => {
  const submittedAt = DateTime.now().setZone('Australia/Sydney').toFormat('MMMM d, yyyy');
  
  return {
    subject: 'Thank you for contacting Ami Photography!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hi ${escapeHtml(name)},</h2>
        <p>Thank you for reaching out to Ami Photography! We've received your inquiry and are excited to potentially work with you.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Your Message Details:</h3>
          <p><strong>Subject:</strong> ${escapeHtml(formData.subject)}</p>
          <p><strong>Message:</strong> ${escapeHtml(formData.message)}</p>
          <p><strong>Submitted:</strong> ${submittedAt}</p>
        </div>
        
        <p>We'll get back to you within 24-48 hours with a detailed response.</p>
        <p>In the meantime, feel free to browse our portfolio or check out our photography packages on our website.</p>
        
        <p>Best regards,<br>
        <strong>The Ami Photography Team</strong><br>
        📞 (123) 456-7890<br>
        ✉️ info@amiphotography.com</p>
      </div>
    `
  };
};

// POST: Contact form submission
app.post('/api/submit-contact', csrfProtection, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (name, email, message)',
        csrfToken: req.csrfToken()
      });
    }

    const newMessage = new Message({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      subject: subject || 'General Inquiry',
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const savedMessage = await newMessage.save();

    // Send confirmation email
    const emailTemplate = getContactEmailTemplate(name, {
      subject: subject || 'General Inquiry',
      message: message
    });
    
    const emailResult = await sendConfirmationEmail(email, emailTemplate);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully!',
      messageId: savedMessage._id,
      emailSent: emailResult.success,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      csrfToken: req.csrfToken()
    });
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
