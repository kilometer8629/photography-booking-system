const mongoose = require('mongoose');

const SMSSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false // Optional - SMS can be sent without booking
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1600 // Twilio SMS limit
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'undelivered'],
    default: 'pending'
  },
  twilioSid: {
    type: String,
    trim: true
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    trim: true
  },
  sentBy: {
    type: String, // Admin username who sent the SMS
    trim: true
  },
  recipientName: {
    type: String,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['reminder', 'confirmation', 'running_late', 'custom', 'rescheduled', 'cancelled'],
    default: 'custom'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SMSSchema.index({ bookingId: 1 });
SMSSchema.index({ status: 1 });
SMSSchema.index({ scheduledFor: 1 });
SMSSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SMS', SMSSchema);
