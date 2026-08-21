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
const cookieParser = require('cookie-parser');
const { DateTime } = require('luxon');
const { validateEnv } = require('./utils/validateEnv');
const { renderTemplate } = require('./utils/templateRenderer');

// ===== Environment Validation =====
try {
  validateEnv();
} catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// ===== Sentry Error Monitoring (optional) =====
let Sentry;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2
    });
    console.log('✅ Sentry error monitoring initialised');
  } catch (sentryError) {
    console.warn('⚠️ Sentry SDK not installed. Run `npm install @sentry/node` to enable error monitoring.');
  }
}
const {
  getAvailabilityForDate,
  getAvailabilityForRange,
  createZohoEvent,
  deleteZohoEvent,
  settings: zohoSettings
} = require('./services/zohoClient');
const { getZohoDiagnostics } = require('./services/zohoDiagnostics');
const { buildSlotsForDay, filterSlots } = require('./utils/slots');
const Stripe = require('stripe');
const {
  sendBookingConfirmationSMS,
  sendBookingStatusChangeSMS,
  sendRescheduleConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendCancellationSMS,
  maskPhoneNumber,
  twilioEnabled
} = require('./services/twilioClient');

// ===== Import Models =====
const { Booking, Message, Admin } = require('./models');

const app = express();

// Ensure Express knows how to trust upstream proxies (required on Vercel for accurate IPs/rate limiting)
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
} else if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Vercel/most managed hosts)
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

if (!stripe) {
  console.warn('Stripe secret key not configured. Pre-purchase checkout is disabled.');
}

const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking.html?status=success`;
const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking.html?status=cancelled`;

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

async function getPackagePriceInfo(pkg) {
  if (!stripe || !pkg?.priceId) {
    return null;
  }

  if (packagePriceCache.has(pkg.priceId)) {
    return packagePriceCache.get(pkg.priceId);
  }

  const price = await stripe.prices.retrieve(pkg.priceId, { expand: ['tiers'] });

  let unitAmount = price.unit_amount ?? (price.unit_amount_decimal ? Number(price.unit_amount_decimal) : null);

  if (unitAmount === null && Array.isArray(price.tiers) && price.tiers.length) {
    const primaryTier = price.tiers[0];
    if (typeof primaryTier.unit_amount === 'number') {
      unitAmount = primaryTier.unit_amount;
    } else if (primaryTier.unit_amount_decimal) {
      unitAmount = Number(primaryTier.unit_amount_decimal);
    } else if (typeof primaryTier.flat_amount === 'number') {
      unitAmount = primaryTier.flat_amount;
    } else if (primaryTier.flat_amount_decimal) {
      unitAmount = Number(primaryTier.flat_amount_decimal);
    }
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

  const info = {
    amount: unitAmount ?? null,
    currency,
    formatted
  };

  packagePriceCache.set(pkg.priceId, info);
  return info;
}

// ===== Database Initialization =====
const initializeDatabase = async () => {
  try {
    // Check if admin user exists, if not create one
    const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!adminExists) {
      const admin = new Admin({
        username: process.env.ADMIN_USERNAME,
        email: process.env.CONTACT_EMAIL || 'admin@amiphotography.com',
        password: process.env.ADMIN_PASSWORD,
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        permissions: ['view_bookings', 'manage_bookings', 'view_messages', 'manage_messages', 'view_analytics', 'manage_settings']
      });
      await admin.save();
      console.log('✅ Admin user created successfully');
    }

    // Create sample data if collections are empty (for development)
    const bookingCount = await Booking.countDocuments();
    const messageCount = await Message.countDocuments();

    if (bookingCount === 0) {
      const sampleBookings = [
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
          clientPhone: '555-0101',
          eventType: 'Wedding',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          startTime: '14:00',
          endTime: '22:00',
          location: 'Grand Ballroom, Downtown Hotel',
          package: 'Premium',
          status: 'pending',
          additionalNotes: 'Outdoor ceremony requested'
        },
        {
          clientName: 'Jane Smith',
          clientEmail: 'jane@example.com',
          clientPhone: '555-0202',
          eventType: 'Portrait',
          eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startTime: '10:00',
          endTime: '12:00',
          location: 'City Park',
          package: 'Basic',
          status: 'confirmed',
          additionalNotes: ''
        }
      ];
      await Booking.insertMany(sampleBookings);
      console.log('✅ Sample bookings created');
    }

    if (messageCount === 0) {
      const sampleMessages = [
        {
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          subject: 'Wedding Inquiry',
          message: 'I would like information about your wedding packages.',
          read: false,
          archived: false
        },
        {
          name: 'Mike Brown',
          email: 'mike@example.com',
          subject: 'Availability Question',
          message: 'Are you available for a corporate event on June 15th?',
          read: true,
          archived: false
        }
      ];
      await Message.insertMany(sampleMessages);
      console.log('✅ Sample messages created');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// ===== Enhanced Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ===== Request Logging =====
app.use(morgan('dev'));

// ===== CORS Configuration =====
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 600
}));
app.options('*', cors());

// ===== Stripe Webhook Handler (MUST be BEFORE body parser) =====
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (!webhookSecret) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured. Webhook verification disabled.');
    // For development, we can skip signature verification if not configured
    event = req.body;
  } else {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  // Process the webhook event
  console.log(`📍 Processing Stripe event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ Checkout session completed:', session.id);

      try {
        // Find booking by Stripe session ID
        const booking = await Booking.findOne({ stripeSessionId: session.id });

        if (!booking) {
          console.warn(`⚠️ No booking found for Stripe session: ${session.id}`);
          return res.status(200).json({ received: true }); // Still return 200 to Stripe
        }

        // Update booking status to confirmed
        booking.status = 'confirmed';
        booking.depositPaid = true;
        booking.stripePaymentIntentId = session.payment_intent;
        booking.stripePaidAt = new Date();
        booking.additionalNotes = `Payment confirmed via Stripe on ${new Date().toISOString()}`;

        const savedBooking = await booking.save();
        console.log(`✅ Booking ${booking._id} confirmed with payment`);
        console.log(`✅ Payment Intent ID saved: ${session.payment_intent}`);

        // Send tax receipt email to customer
        if (booking.clientEmail) {
          const receiptTemplate = getTaxReceiptEmailTemplate(booking);
          const emailResult = await sendConfirmationEmail(booking.clientEmail, receiptTemplate);
          if (emailResult.success) {
            console.log(`✅ Tax receipt email sent to ${booking.clientEmail}`);
          } else {
            console.warn(`⚠️ Failed to send tax receipt email: ${emailResult.error}`);
          }
        }

        // Send payment confirmation SMS
        if (booking.clientPhone && twilioEnabled) {
          const smsResult = await sendPaymentConfirmationSMS(booking);
          if (smsResult.success) {
            console.log(`✅ Payment confirmation SMS sent to ${maskPhoneNumber(booking.clientPhone)}`);
          } else {
            console.warn(`⚠️ Failed to send payment confirmation SMS: ${smsResult.error}`);
          }
        }

      } catch (error) {
        console.error('❌ Error processing checkout.session.completed:', error);
        // Still return 200 - webhook was received, even if processing failed
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('✅ Payment intent succeeded:', paymentIntent.id);
      break;
    }

    case 'charge.failed': {
      const charge = event.data.object;
      console.log('❌ Charge failed:', charge.id);

      try {
        // Find booking by Stripe session and update status
        const booking = await Booking.findOne({
          stripePaymentIntentId: charge.payment_intent
        });

        if (booking) {
          booking.status = 'failed';
          booking.additionalNotes = `Payment failed: ${charge.failure_message}`;
          await booking.save();
          console.log(`⚠️ Booking ${booking._id} marked as failed due to charge failure`);
        }
      } catch (error) {
        console.error('❌ Error processing charge.failed:', error);
      }
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  // Always return 200 OK to Stripe
  res.json({ received: true });
});

// ===== Body Parsers =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Swagger API Documentation =====
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Photography Booking System API',
      version: '1.0.0',
      description: 'API documentation for the Ami Photography booking system'
    },
    servers: [{ url: '/' }]
  },
  apis: [path.join(__dirname, 'index.js')]
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===== Static Files =====
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, servedPath) => {
    const extension = path.extname(servedPath).toLowerCase();
    if (['.html', '.js', '.css'].includes(extension)) {
      // Ensure critical assets always reflect the latest changes in development
      res.set('Cache-Control', 'no-store');
    } else {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// ===== Session Configuration =====
const sessionSecret = process.env.SESSION_SECRET || uuidv4();
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Using an ephemeral secret; sessions will reset on each deploy.');
}

app.use(cookieParser(process.env.COOKIE_SECRET || sessionSecret));

let sessionStore;
const mongoUri = process.env.MONGODB_URI;

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
  console.warn('MONGODB_URI is not configured. Falling back to MemoryStore for sessions.');
  sessionStore = new session.MemoryStore();
}

app.use(session({
  name: process.env.SESSION_NAME,
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

// ===== CSRF Middleware Configuration =====
const csrfCookieOptions = {
  key: process.env.CSRF_COOKIE_NAME || 'ss.csrf',
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000
};

const csrfProtection = csrf({
  cookie: csrfCookieOptions,
  value: (req) => req.headers['x-csrf-token'] || req.body._csrf
});

// Middleware to generate CSRF token without validation
const csrfTokenOnly = csrf({
  cookie: csrfCookieOptions,
  value: () => ''
});

// CSRF token endpoints - MUST be before CSRF protection is applied
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

// ===== Rate Limiting =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => ['/api/admin/health'].includes(req.path),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});
app.use('/api/', apiLimiter);

// ===== Public Package Catalog & Checkout =====
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

    // Send initial booking confirmation SMS (booking created, payment pending)
    if (customerPhone) {
      const smsResult = await sendBookingConfirmationSMS(bookingDocument);
      if (smsResult.success) {
        console.log(`✅ Initial booking SMS sent to ${maskPhoneNumber(customerPhone)}`);
      } else {
        console.warn(`⚠️ Failed to send initial booking SMS: ${smsResult.error}`);
      }
    }

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

/**
 * @openapi
 * /api/availability:
 *   get:
 *     summary: Get available time slots
 *     tags: [Booking]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Single date (YYYY-MM-DD)
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Available slots
 */
app.get('/api/availability', async (req, res) => {
  try {
    const { date, start, end } = req.query || {};
    console.log('[API] /api/availability endpoint called', { date, start, end, timestamp: new Date().toISOString() });

    // Fetch booked slots from database
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

    return res.status(500).json({ error: 'Unable to load availability. Please try again.' });
  }
});

/**
 * @openapi
 * /api/packages:
 *   get:
 *     summary: List available photography packages with pricing
 *     tags: [Booking]
 *     responses:
 *       200:
 *         description: Package catalog
 */
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
        currency: priceInfo?.currency || null,
        amount: priceInfo?.amount || null
      };
    }));

    res.json({ packages, slotMinutes: zohoSettings.slotMinutes });
  } catch (error) {
    console.error('Package catalogue error:', error);
    res.status(500).json({ error: 'Unable to load packages at this time.' });
  }
});

// ===== Booking Confirmation Endpoint =====
app.get('/api/booking-confirmation', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
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

// ===== Customer Booking Management Endpoints =====

// GET: Fetch customer's booking by email
app.get('/api/customer/booking', async (req, res) => {
  try {
    const { email, bookingId } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
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

// POST: Reschedule booking
app.post('/api/customer/reschedule', csrfProtection, async (req, res) => {
  try {
    const { bookingId, newDate, newTime, reason } = req.body;

    if (!bookingId || !newDate || !newTime) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Send reschedule confirmation SMS
    if (booking.clientPhone && twilioEnabled) {
      const smsResult = await sendRescheduleConfirmationSMS(booking, newDate, newTime);
      if (smsResult.success) {
        console.log(`✅ Reschedule confirmation SMS sent to ${maskPhoneNumber(booking.clientPhone)}`);
      } else {
        console.warn(`⚠️ Failed to send reschedule SMS: ${smsResult.error}`);
      }
    }

    console.log(`✅ Reschedule request submitted for booking ${bookingId}`);

    res.json({ success: true, message: 'Reschedule request submitted. You\'ll receive confirmation within 24 hours.' });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ error: 'Unable to process reschedule request' });
  }
});

// POST: Cancel booking
app.post('/api/customer/cancel', csrfProtection, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' });
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

    // Send cancellation SMS
    if (booking.clientPhone && twilioEnabled) {
      const smsResult = await sendCancellationSMS(booking, refundAmount, refundReason);
      if (smsResult.success) {
        console.log(`✅ Cancellation SMS sent to ${maskPhoneNumber(booking.clientPhone)}`);
      } else {
        console.warn(`⚠️ Failed to send cancellation SMS: ${smsResult.error}`);
      }
    }

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

// ===== No-Cache Middleware =====
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

// ===== Database Connection =====
if (mongoUri) {
  mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    wtimeoutMS: 2500
  })
    .then(async () => {
      console.log('✅ MongoDB connected successfully');
      await initializeDatabase();
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err);
      console.log('⚠️ Server will continue running without database connection');
    });

  mongoose.connection.on('error', err => {
    console.error('MongoDB runtime error:', err);
  });
} else {
  console.warn('MONGODB_URI is not set. Skipping MongoDB connection; database-backed features are disabled.');
}

// ===== Authentication Middleware =====
const authenticate = (req, res, next) => {
  if (!req.session.admin) {
    return res.status(401).json({
      error: 'Authentication required',
      authenticated: false
    });
  }
  next();
};

// ===== Public Routes (before auth middleware) =====
app.get('/api/admin/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    sessionStore: 'active',
    uptime: process.uptime(),
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

// CSRF Token endpoint - uses csrf middleware to generate token
app.get('/api/admin/csrf-token', csrfTokenOnly, (req, res) => {
  try {
    console.log('🔐 [CSRF] Generating CSRF token for admin');
    const token = req.csrfToken();
    console.log('✅ [CSRF] Token generated:', token.substring(0, 20) + '...');
    res.json({
      token: token,
      success: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('❌ [CSRF] Token generation error:', error.message);
    res.status(500).json({
      error: 'Failed to generate CSRF token',
      success: false,
      details: error.message
    });
  }
});

app.get('/api/admin/check-auth', noCache, (req, res) => {
  try {
    res.json({
      authenticated: !!req.session.admin,
      username: req.session.admin ? process.env.ADMIN_USERNAME : null,
      csrfValid: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Auth check failed' });
  }
});

app.post('/api/admin/login', noCache, csrfProtection, async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find admin user
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({
        error: 'Invalid credentials',
        authenticated: false
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        error: 'Account temporarily locked due to too many failed attempts',
        authenticated: false
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({
        error: 'Account is deactivated',
        authenticated: false
      });
    }

    // Compare password
    const isValidPassword = await admin.comparePassword(password);

    if (isValidPassword) {
      // Reset login attempts on successful login
      await admin.resetLoginAttempts();

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: 'Session error' });

        req.session.admin = {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          permissions: admin.permissions
        };
        req.session.cookie.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        res.json({
          success: true,
          expires: req.session.cookie.expires,
          user: {
            username: admin.username,
            fullName: admin.fullName,
            role: admin.role
          }
        });
      });
    } else {
      // Increment login attempts
      await admin.incLoginAttempts();

      res.status(401).json({
        error: 'Invalid credentials',
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      authenticated: false
    });
  }
});

// ===== Protected Routes =====
app.use('/api/admin', authenticate, noCache);

// Bookings
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status.toLowerCase();
    }

    const bookings = await Booking.find(filter)
      .sort({ eventDate: -1 })
      .lean();

    // Transform _id to id for frontend compatibility
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      id: booking._id?.toString() || booking._id
    }));

    res.json(transformedBookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Export endpoint must come BEFORE :id route to be matched first
app.get('/api/admin/bookings/export', async (req, res) => {
  try {
    const bookingId = req.query.id;

    if (!bookingId) {
      return res.status(400).json({ error: 'No booking ID specified for export' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Generate PDF or CSV - for now, return JSON that will be exported
    const csv = generateBookingCSV(booking);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${bookingId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export booking error:', error);
    res.status(500).json({ error: 'Failed to export booking' });
  }
});

// Helper function to generate CSV
function generateBookingCSV(booking) {
  const headers = ['Field', 'Value'];
  const rows = [
    ['Client Name', booking.clientName],
    ['Client Email', booking.clientEmail],
    ['Client Phone', booking.clientPhone],
    ['Event Date', booking.eventDate],
    ['Start Time', booking.startTime],
    ['End Time', booking.endTime],
    ['Package', booking.package],
    ['Status', booking.status],
    ['Location', booking.location],
    ['Amount', booking.packageAmount / 100],
    ['Deposit Paid', booking.depositPaid ? 'Yes' : 'No'],
    ['Paid At', booking.stripePaidAt ? new Date(booking.stripePaidAt).toLocaleString() : 'N/A']
  ];

  const headerString = headers.join(',');
  const rowStrings = rows.map(row => `"${row[0]}","${row[1] || ''}"`).join('\n');

  return `${headerString}\n${rowStrings}`;
}

app.get('/api/admin/bookings/:id', async (req, res) => {
  try {
    // Validate ID
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    console.error('Fetch booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

app.post('/api/admin/bookings/:id/confirm', csrfProtection, async (req, res) => {
  try {
    // Validate ID
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Send booking confirmation SMS
    if (booking.clientPhone && twilioEnabled) {
      const smsResult = await sendBookingConfirmationSMS(booking);
      if (smsResult.success) {
        console.log(`✅ Booking confirmation SMS sent to ${maskPhoneNumber(booking.clientPhone)}`);
      } else {
        console.warn(`⚠️ Failed to send booking confirmation SMS: ${smsResult.error}`);
      }
    }

    res.json({
      ...booking.toObject(),
      csrfToken: req.csrfToken() // Send new token
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      error: 'Failed to confirm booking',
      csrfToken: req.csrfToken() // Send new token on error
    });
  }
});

app.get('/api/admin/bookings/export', async (req, res) => {
  try {
    let dataToExport;
    const { id, format = 'json' } = req.query;

    if (id) {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      dataToExport = booking;
    } else {
      dataToExport = await Booking.find({}).sort({ createdAt: -1 });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=booking${id ? `-${id}` : 's'}.json`);
    res.send(JSON.stringify(dataToExport, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Messages
app.get('/api/admin/messages', async (req, res) => {
  try {
    const filter = {};

    if (req.query.includeArchived !== 'true') {
      filter.archived = false;
    }

    if (req.query.unread === 'true') {
      filter.read = false;
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Transform _id to id for frontend compatibility
    const transformedMessages = messages.map(message => ({
      ...message,
      id: message._id?.toString() || message._id
    }));

    res.json(transformedMessages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/admin/messages/:id', async (req, res) => {
  try {
    // Validate ID
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!message) return res.status(404).json({ error: 'Message not found' });

    res.json(message);
  } catch (error) {
    console.error('Fetch message error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

app.post('/api/admin/messages/:id/mark-read', csrfProtection, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!message) return res.status(404).json({ error: 'Message not found' });

    res.json({
      success: true,
      message: 'Message marked as read',
      data: message,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      error: 'Failed to mark message as read',
      csrfToken: req.csrfToken()
    });
  }
});

// ===== Email Configuration =====
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sanitizeEmailValue = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ALLOWED_EMAIL_CURRENCIES = new Set(['$', '€', '£', '¥', '₹', 'USD', 'EUR', 'GBP', 'AUD', 'CAD']);

const sanitizeCurrencyValue = (value) => {
  const raw = String(value ?? '$').trim();
  const currency = raw.length === 3 ? raw.toUpperCase() : raw;
  return ALLOWED_EMAIL_CURRENCIES.has(currency) ? currency : '$';
};

// Email templates
const getContactEmailTemplate = (name, formData) => {
  const safeName = sanitizeEmailValue(name);
  const safeSubject = sanitizeEmailValue(formData.subject);
  const safeMessage = sanitizeEmailValue(formData.message);

  return {
    subject: 'Thank you for contacting Ami Photography!',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${safeName},</h2>
          <p>Thank you for reaching out to Ami Photography! We've received your inquiry and are excited to potentially work with you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Your Message Details:</h3>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <p><strong>Message:</strong> ${safeMessage}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
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

const getBookingEmailTemplate = (name, formData) => {
  const safeName = sanitizeEmailValue(name);
  const safeEventType = sanitizeEmailValue(formData.eventType);
  const safeStartTime = sanitizeEmailValue(formData.startTime);
  const safeEndTime = sanitizeEmailValue(formData.endTime);
  const safeLocation = sanitizeEmailValue(formData.location);
  const safePackage = sanitizeEmailValue(formData.package);
  const safeDetails = sanitizeEmailValue(formData.details || 'None');

  return {
    subject: 'Booking Request Confirmation - Ami Photography',
    html: renderTemplate('booking', {
      name: safeName,
      eventType: safeEventType,
      date: new Date(formData.date).toLocaleDateString(),
      startTime: safeStartTime,
      endTime: safeEndTime,
      location: safeLocation,
      package: safePackage,
      details: safeDetails
    })
  };
};

const getTaxReceiptEmailTemplate = (booking) => {
  const amount = (booking.packageAmount / 100 || booking.estimatedCost || 0).toFixed(2);
  const receiptDate = new Date(booking.stripePaidAt || new Date()).toLocaleDateString();
  const receiptId = `AMI-${booking._id.toString().slice(-8).toUpperCase()}-${new Date().getFullYear()}`;
  const safeClientName = sanitizeEmailValue(booking.clientName);
  const safeClientEmail = sanitizeEmailValue(booking.clientEmail);
  const safeClientPhone = sanitizeEmailValue(booking.clientPhone);
  const safePackage = sanitizeEmailValue(booking.package);
  const safeStartTime = sanitizeEmailValue(booking.startTime);
  const safeEndTime = sanitizeEmailValue(booking.endTime);
  const safeLocation = sanitizeEmailValue(booking.location);
  const safePackageCurrency = sanitizeCurrencyValue(booking.packageCurrency || '$');
  const stripeSessionId = String(booking.stripeSessionId || '');
  const safeStripeSessionId = sanitizeEmailValue(stripeSessionId.substring(0, 20));
  const safeStripeSessionDisplay = safeStripeSessionId
    ? `${safeStripeSessionId}${stripeSessionId.length > 20 ? '...' : ''}`
    : 'N/A';

  return {
    subject: 'Tax Receipt for Photography Services - Ami Photography',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px;">Ami Photography</h1>
            <p style="margin: 0; opacity: 0.9;">TAX RECEIPT / INVOICE</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
              <div>
                <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; color: #666;">Bill To</h3>
                <p style="margin: 5px 0; font-size: 16px; font-weight: bold;">${safeClientName}</p>
                <p style="margin: 5px 0; color: #666;">${safeClientEmail}</p>
                <p style="margin: 5px 0; color: #666;">${safeClientPhone}</p>
              </div>
              
              <div style="text-align: right;">
                <p style="margin: 5px 0; color: #666;"><strong>Receipt #:</strong> ${receiptId}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${receiptDate}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Session ID:</strong> ${safeStripeSessionDisplay}</p>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e0e0e0;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #667eea;">
                    <th style="text-align: left; padding: 10px 0; color: #333; font-weight: 600;">Description</th>
                    <th style="text-align: right; padding: 10px 0; color: #333; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 15px 0; color: #555;">
                      <strong>${safePackage}</strong><br>
                      <span style="color: #999; font-size: 12px;">
                        Event: ${new Date(booking.eventDate).toLocaleDateString()} at ${safeStartTime}<br>
                        Location: ${safeLocation}
                      </span>
                    </td>
                    <td style="text-align: right; padding: 15px 0; color: #333; font-weight: 600; font-size: 16px;">
                      ${safePackageCurrency}${amount}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 0; text-align: right; font-weight: 600; color: #667eea; font-size: 18px;">Total Amount Paid:</td>
                    <td style="padding: 20px 0; text-align: right; background-color: #f0f4ff; border-radius: 4px; padding-right: 10px; font-weight: 700; color: #667eea; font-size: 18px;">
                      ${safePackageCurrency}${amount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 30px;">
              <p style="margin: 0; color: #856404; font-size: 12px;">
                <strong>✓ Payment Received</strong> - Thank you for your payment. This is a receipt for your records and may be used for tax purposes.
              </p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; font-size: 12px; color: #666; line-height: 1.6;">
              <p style="margin: 0 0 10px 0;"><strong>Session Details:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Date & Time: ${new Date(booking.eventDate).toLocaleDateString()} from ${safeStartTime} to ${safeEndTime}</li>
                <li>Location: ${safeLocation}</li>
                <li>Package Includes: All high-resolution edited photos</li>
                <li>Photos Delivery: 7-10 business days via secure online gallery</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center;">
              <p style="margin: 5px 0;">Ami Photography<br>
              📞 (123) 456-7890 • ✉️ info@amiphotography.com<br>
              Thank you for your business!</p>
            </div>
          </div>
        </div>
      `
  };
};

const getCancellationEmailTemplate = (booking, refundAmount, refundReason) => {
  const amount = (booking.packageAmount / 100 || 0).toFixed(2);
  const refund = (refundAmount / 100).toFixed(2);
  const safeClientName = sanitizeEmailValue(booking.clientName);
  const safePackageCurrency = sanitizeCurrencyValue(booking.packageCurrency || '$');
  const safeRefundReason = sanitizeEmailValue(refundReason);

  return {
    subject: 'Booking Cancellation Confirmation - Ami Photography',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px;">Booking Cancelled</h1>
            <p style="margin: 0; opacity: 0.9;">Cancellation Confirmation</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
            
            <p style="color: #333; font-size: 16px;">Hi ${safeClientName},</p>
            
            <p style="color: #555; line-height: 1.6;">
              Your photography booking has been successfully cancelled. We're sorry to see you go, but we understand things come up. 
              Below are your cancellation details and refund information.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e0e0e0;">
                  <td style="padding: 12px 0; color: #666;"><strong>Original Amount Paid:</strong></td>
                  <td style="text-align: right; padding: 12px 0; color: #333; font-weight: 600;">${safePackageCurrency}${amount}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e0e0e0;">
                  <td style="padding: 12px 0; color: #666;"><strong>Cancellation Reason:</strong></td>
                  <td style="text-align: right; padding: 12px 0; color: #333;">${safeRefundReason}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; color: #667eea; font-size: 16px;"><strong>Refund Amount:</strong></td>
                  <td style="text-align: right; padding: 15px 0; background-color: #e8f5e9; border-radius: 4px; padding-right: 10px; font-weight: 700; color: #2e7d32; font-size: 18px;">
                    ${safePackageCurrency}${refund}
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>✓ Refund Processing:</strong> Your refund of ${safePackageCurrency}${refund} will be processed to your original payment method within 5-7 business days.
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

const getRescheduleEmailTemplate = (booking, newDate, newTime, reason) => {
  const eventDate = new Date(booking.eventDate);
  const safeClientName = sanitizeEmailValue(booking.clientName);
  const safeStartTime = sanitizeEmailValue(booking.startTime);
  const safeLocation = sanitizeEmailValue(booking.location);
  const safePackage = sanitizeEmailValue(booking.package);
  const safeNewTime = sanitizeEmailValue(newTime);
  const safeReason = sanitizeEmailValue(reason);

  return {
    subject: 'Reschedule Request Received - Ami Photography',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px;">Reschedule Request Received</h1>
            <p style="margin: 0; opacity: 0.9;">We're working on your new date</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
            
            <p style="color: #333; font-size: 16px;">Hi ${safeClientName},</p>
            
            <p style="color: #555; line-height: 1.6;">
              Thank you for submitting your reschedule request. We've received your request and will confirm your new date within 24 hours.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
              <h3 style="color: #667eea; margin-top: 0;">Current Booking Details</h3>
              <p style="margin: 10px 0; color: #555;">
                <strong>Current Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                <strong>Current Time:</strong> ${safeStartTime}<br>
                <strong>Location:</strong> ${safeLocation}<br>
                <strong>Package:</strong> ${safePackage}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              
              <h3 style="color: #667eea; margin-top: 0;">Your Requested New Date</h3>
              <p style="margin: 10px 0; color: #555;">
                <strong>Requested Date:</strong> ${new Date(newDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                <strong>Requested Time:</strong> ${safeNewTime}
              </p>
              
              ${reason ? `<p style="margin: 15px 0; color: #666;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
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

// Email sending function
async function sendConfirmationEmail(email, template) {
  try {
    const mailOptions = {
      from: `"Ami Photography" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: template.subject,
      html: template.html
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// Logout
app.post('/api/admin/logout', csrfProtection, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie(process.env.SESSION_NAME);
    res.json({ success: true });
  });
});

// ===== Contact Message Submission Route with CSRF Protection =====
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

// ===== Booking Submission Route with CSRF Protection =====
app.post('/submit-booking', csrfProtection, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      eventType,
      date,
      package: packageType,
      startTime,
      endTime,
      location,
      details
    } = req.body;

    if (!name || !email || !phone || !eventType || !date || !packageType || !startTime || !endTime || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        csrfToken: req.csrfToken()
      });
    }

    const newBooking = new Booking({
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      eventType,
      eventDate: new Date(`${date} ${startTime}`),
      package: packageType,
      startTime,
      endTime,
      location,
      additionalNotes: details || ''
    });

    const savedBooking = await newBooking.save();

    // Send confirmation email
    const emailTemplate = getBookingEmailTemplate(name, {
      eventType,
      date,
      startTime,
      endTime,
      location,
      package: packageType,
      details
    });

    const emailResult = await sendConfirmationEmail(email, emailTemplate);

    res.status(201).json({
      success: true,
      message: 'Booking request received successfully!',
      bookingId: savedBooking._id,
      emailSent: emailResult.success,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Booking submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process booking',
      csrfToken: req.csrfToken()
    });
  }
});

// ===== File Upload System =====
const multer = require('multer');
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    const fs = require('fs');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedExt = /^\.(jpeg|jpg|png|gif|pdf|webp)$/;
    const allowedMime = /^(image\/(jpeg|png|gif|webp)|application\/pdf)$/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedMime.test(file.mimetype);
    cb(extOk && mimeOk ? null : new Error('Only images and PDFs are allowed'), extOk && mimeOk);
  }
});

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/${req.file.filename}`
    }
  });
});

app.get('/api/admin/uploads', authenticate, (req, res) => {
  const fs = require('fs');
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(uploadDir).map((name) => ({
      filename: name,
      url: `/uploads/${name}`
    }));
    res.json({ files });
  } catch (error) {
    console.error('List uploads error:', error);
    res.status(500).json({ error: 'Failed to list uploads' });
  }
});

// Serve uploaded files (admin only)
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

// ===== Client Portal — JWT Authentication =====
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.SESSION_SECRET || (() => {
  console.warn('⚠️ SESSION_SECRET not set — client portal JWT auth is disabled.');
  return '';
})();

app.post('/api/client/login', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'Client authentication is not configured' });
  }

  const booking = await Booking.findOne({ clientEmail: email.toLowerCase().trim() });
  if (!booking) {
    return res.status(404).json({ error: 'No bookings found for that email' });
  }

  const token = jwt.sign({ email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

const authenticateClient = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'Client authentication is not configured' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.clientEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.get('/api/client/bookings', authenticateClient, async (req, res) => {
  try {
    const bookings = await Booking.find({ clientEmail: req.clientEmail })
      .sort({ eventDate: -1 })
      .lean();

    res.json({
      success: true,
      bookings: bookings.map((b) => ({
        _id: b._id,
        eventDate: b.eventDate,
        startTime: b.startTime,
        endTime: b.endTime,
        location: b.location,
        package: b.package,
        status: b.status,
        depositPaid: b.depositPaid,
        packageAmount: b.packageAmount,
        packageCurrency: b.packageCurrency,
        stripePaidAt: b.stripePaidAt
      }))
    });
  } catch (error) {
    console.error('Client bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ===== Payment Refunds =====
/**
 * @openapi
 * /api/admin/refund:
 *   post:
 *     summary: Process a refund for a booking
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId: { type: string }
 *               amount: { type: number, description: Amount in cents }
 *     responses:
 *       200:
 *         description: Refund processed
 *       404:
 *         description: Booking not found
 */
app.post('/api/admin/refund', authenticate, async (req, res) => {
  const { bookingId, amount } = req.body;

  if (!bookingId || typeof bookingId !== 'string') {
    return res.status(400).json({ error: 'Booking ID is required' });
  }
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  try {
    const booking = await Booking.findById(String(bookingId));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!booking.stripePaymentIntentId) {
      return res.status(400).json({ error: 'No payment intent found for this booking' });
    }

    const refundParams = { payment_intent: booking.stripePaymentIntentId };
    if (amount) {
      refundParams.amount = Math.round(amount); // amount in cents
    }

    const refund = await stripe.refunds.create(refundParams);

    booking.status = 'cancelled';
    booking.additionalNotes = `Refund processed: ${refund.id}. Amount: ${refund.amount / 100} ${refund.currency}`;
    await booking.save();

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Refund failed: ' + error.message });
  }
});

// ===== PDF Receipt Download =====
/**
 * @openapi
 * /api/booking/{id}/receipt.pdf:
 *   get:
 *     summary: Download booking receipt as PDF
 *     tags: [Booking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf: {}
 */
app.get('/api/booking/:id/receipt.pdf', async (req, res) => {
  // Require either admin session or client JWT
  const isAdmin = !!req.session?.admin;
  let clientEmail = null;
  if (!isAdmin) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && JWT_SECRET) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        clientEmail = decoded.email;
      } catch { /* invalid token */ }
    }
  }
  if (!isAdmin && !clientEmail) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Clients can only access their own receipts
    if (!isAdmin && clientEmail && booking.clientEmail !== clientEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking._id}.pdf"`);
    doc.pipe(res);

    const amount = (booking.packageAmount / 100 || booking.estimatedCost || 0).toFixed(2);
    const receiptId = `AMI-${booking._id.toString().slice(-8).toUpperCase()}-${new Date().getFullYear()}`;
    const currency = booking.packageCurrency || '$';

    // Header
    doc.fontSize(24).text('Ami Photography', { align: 'center' });
    doc.fontSize(12).text('TAX RECEIPT / INVOICE', { align: 'center' });
    doc.moveDown(2);

    // Receipt details
    doc.fontSize(10);
    doc.text(`Receipt #: ${receiptId}`);
    doc.text(`Date: ${new Date(booking.stripePaidAt || booking.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // Bill To
    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10);
    doc.text(booking.clientName);
    doc.text(booking.clientEmail);
    doc.text(booking.clientPhone);
    doc.moveDown();

    // Service details
    doc.fontSize(12).text('Service Details:', { underline: true });
    doc.fontSize(10);
    doc.text(`Package: ${booking.package}`);
    doc.text(`Event Date: ${new Date(booking.eventDate).toLocaleDateString()}`);
    doc.text(`Time: ${booking.startTime} - ${booking.endTime}`);
    doc.text(`Location: ${booking.location}`);
    doc.moveDown();

    // Amount
    doc.fontSize(14).text(`Total Amount Paid: ${currency}${amount}`, { align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text('Thank you for your business! Photos will be delivered within 7-10 business days.', { align: 'center' });
    doc.text('Ami Photography • (123) 456-7890 • info@amiphotography.com', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// ===== Analytics Dashboard API =====
app.get('/api/admin/analytics', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalBookings, monthBookings, confirmedBookings, cancelledBookings, revenueAgg, monthlyRevenueAgg, packageBreakdown] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { depositPaid: true } },
        { $group: { _id: null, total: { $sum: '$packageAmount' } } }
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: startOfYear }, depositPaid: true } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            revenue: { $sum: '$packageAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        { $group: { _id: '$package', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      totalBookings,
      monthBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue,
      totalRevenueFormatted: `$${(totalRevenue / 100).toFixed(2)}`,
      monthlyRevenue: monthlyRevenueAgg.map((m) => ({
        month: m._id,
        revenue: m.revenue,
        revenueFormatted: `$${(m.revenue / 100).toFixed(2)}`,
        bookings: m.count
      })),
      packageBreakdown: packageBreakdown.map((p) => ({
        package: p._id,
        count: p.count
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ===== Serve Frontend Static Files in Production =====
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Handle 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  // Report to Sentry when available
  if (Sentry) {
    Sentry.captureException(err);
  }

  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    status: err.status || 500
  });

  // Handle CSRF token errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      csrfToken: req.csrfToken() // Provide new token
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// ===== Server Startup =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Access URL: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}`);
  console.log(`🔐 Admin panel: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}/admin.html`);
  console.log(`📡 API Base URL: ${process.env.CLIENT_URL || 'http://localhost:' + PORT}/api/admin\n`);
});

// ===== Global Unhandled Error Handlers =====
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (Sentry) Sentry.captureException(reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (Sentry) {
    Sentry.captureException(err);
    Sentry.flush(2000).finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
