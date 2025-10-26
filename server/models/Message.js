const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    trim: true,
    maxLength: 20
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['general', 'booking', 'support', 'complaint', 'feedback'],
    default: 'general'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
MessageSchema.index({ read: 1 });
MessageSchema.index({ archived: 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ email: 1 });
MessageSchema.index({ priority: 1 });

// Virtual for message ID display
MessageSchema.virtual('messageId').get(function() {
  return `MSG-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Update readAt when read status changes
MessageSchema.pre('save', function(next) {
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date();
  }
  if (this.isModified('archived') && this.archived && !this.archivedAt) {
    this.archivedAt = new Date();
  }
  next();
});

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', MessageSchema);