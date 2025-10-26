const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  clientPhone: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20
  },
  eventType: {
    type: String,
    enum: ['Wedding', 'Portrait', 'Event', 'Commercial', 'Family', 'Graduation', 'Other', 'Santa Session', 'Santa Pet Session'],
    default: 'Santa Session'
  },
  eventDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        return date instanceof Date && !Number.isNaN(date.getTime());
      },
      message: 'Event date must be valid'
    }
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  package: {
    type: String,
    required: true,
    enum: ['Basic', 'Standard', 'Premium', 'Custom', "Santa's Gift Pack", 'Rudolph', 'Blitzen', 'Digital Package', 'Vixen']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  additionalNotes: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  packagePrice: {
    type: String,
    trim: true
  },
  packageCurrency: {
    type: String,
    trim: true
  },
  packageAmount: {
    type: Number,
    min: 0
  },
  zohoEventId: {
    type: String,
    trim: true
  },
  stripeSessionId: {
    type: String,
    trim: true
  },
  stripePaymentIntentId: {
    type: String,
    trim: true
  },
  stripePaidAt: {
    type: Date,
    default: null
  },
  packageId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
BookingSchema.index({ eventDate: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ clientEmail: 1 });
BookingSchema.index({ createdAt: -1 });

// Virtual for booking ID display
BookingSchema.virtual('bookingId').get(function() {
  return `BK-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Ensure virtual fields are serialized
BookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Booking', BookingSchema);
