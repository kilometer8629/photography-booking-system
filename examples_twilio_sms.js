/**
 * Example: Using Twilio SMS Service in Your Code
 * 
 * This file demonstrates how to integrate SMS notifications
 * into different parts of your application.
 */

const {
  sendSMS,
  sendBookingConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendRescheduleNotificationSMS,
  sendCancellationSMS,
  sendBookingReminderSMS,
  isTwilioConfigured
} = require('./server/services/twilioClient');

// ============================================================
// Example 1: Basic SMS Sending
// ============================================================
async function example1_BasicSMS() {
  console.log('Example 1: Sending a basic SMS\n');

  const phoneNumber = '+61412345678'; // Customer's phone number
  const message = 'Hello! This is a test message from Ami Photography.';

  const result = await sendSMS(phoneNumber, message);

  if (result.success) {
    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', result.messageSid);
  } else {
    console.error('❌ Failed to send SMS:', result.error);
  }
}

// ============================================================
// Example 2: Send Booking Confirmation After Creating Booking
// ============================================================
async function example2_BookingConfirmation() {
  console.log('\nExample 2: Sending booking confirmation SMS\n');

  // Simulated booking object (would come from database)
  const newBooking = {
    clientName: 'Sarah Johnson',
    clientPhone: '+61412345678',
    eventDate: new Date('2025-12-15'),
    startTime: '14:00',
    package: `Santa's Gift Pack`,
    location: 'Westfield Shopping Centre'
  };

  const result = await sendBookingConfirmationSMS(newBooking);

  if (result.success) {
    console.log('✅ Booking confirmation SMS sent!');
  } else {
    console.error('❌ Failed to send confirmation:', result.error);
  }
}

// ============================================================
// Example 3: Send Payment Confirmation (Stripe Webhook Handler)
// ============================================================
async function example3_PaymentConfirmation() {
  console.log('\nExample 3: Sending payment confirmation SMS\n');

  // This would typically be called in your Stripe webhook handler
  const booking = {
    clientName: 'Sarah Johnson',
    clientPhone: '+61412345678',
    packageAmount: 15000, // $150.00 in cents
    packageCurrency: '$'
  };

  const result = await sendPaymentConfirmationSMS(booking);

  if (result.success) {
    console.log('✅ Payment confirmation SMS sent!');
  } else {
    console.error('❌ Failed to send payment confirmation:', result.error);
  }
}

// ============================================================
// Example 4: Send Reminder Before Event
// ============================================================
async function example4_BookingReminder() {
  console.log('\nExample 4: Sending booking reminder SMS\n');

  const booking = {
    clientName: 'Sarah Johnson',
    clientPhone: '+61412345678',
    eventDate: new Date('2025-12-15'),
    startTime: '14:00',
    location: 'Westfield Shopping Centre'
  };

  // Calculate days until event
  const daysUntil = 1; // Tomorrow

  const result = await sendBookingReminderSMS(booking, daysUntil);

  if (result.success) {
    console.log('✅ Reminder SMS sent!');
  } else {
    console.error('❌ Failed to send reminder:', result.error);
  }
}

// ============================================================
// Example 5: Scheduled Reminder System (Cron Job)
// ============================================================
async function example5_ScheduledReminders() {
  console.log('\nExample 5: Automated reminder system (for cron job)\n');

  // This would be run daily via cron or scheduler
  const Booking = require('./server/models/Booking');

  // Find all confirmed bookings happening tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const upcomingBookings = await Booking.find({
    status: 'confirmed',
    eventDate: {
      $gte: tomorrow,
      $lt: dayAfterTomorrow
    }
  });

  console.log(`Found ${upcomingBookings.length} booking(s) happening tomorrow`);

  // Send reminder for each booking
  for (const booking of upcomingBookings) {
    if (booking.clientPhone) {
      const result = await sendBookingReminderSMS(booking, 1);
      
      if (result.success) {
        console.log(`✅ Reminder sent to ${booking.clientName}`);
      } else {
        console.error(`❌ Failed to send reminder to ${booking.clientName}:`, result.error);
      }

      // Wait a bit between messages to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// ============================================================
// Example 6: Error Handling and Fallback
// ============================================================
async function example6_ErrorHandling() {
  console.log('\nExample 6: Error handling and fallback\n');

  const booking = {
    clientName: 'Sarah Johnson',
    clientPhone: '+61412345678',
    clientEmail: 'sarah@example.com',
    eventDate: new Date('2025-12-15'),
    startTime: '14:00',
    package: `Santa's Gift Pack`,
    location: 'Westfield Shopping Centre'
  };

  // Try to send SMS
  const smsResult = await sendBookingConfirmationSMS(booking);

  if (smsResult.success) {
    console.log('✅ SMS sent successfully');
    // Update booking record to indicate SMS was sent
    // await Booking.updateOne({ _id: booking._id }, { smsSent: true });
  } else {
    console.warn('⚠️ SMS failed, falling back to email only');
    console.error('SMS Error:', smsResult.error);
    
    // Fall back to email notification
    // await sendBookingConfirmationEmail(booking.clientEmail, booking);
    
    // Log the failure for later review
    console.log('📝 Logged SMS failure for manual follow-up');
  }
}

// ============================================================
// Example 7: Check Service Availability Before Sending
// ============================================================
async function example7_CheckAvailability() {
  console.log('\nExample 7: Checking SMS service availability\n');

  if (isTwilioConfigured()) {
    console.log('✅ Twilio SMS service is available');
    
    // Proceed with SMS sending
    const result = await sendSMS('+61412345678', 'Test message');
    
    if (result.success) {
      console.log('✅ Test SMS sent successfully');
    }
  } else {
    console.warn('⚠️ Twilio SMS service is not configured');
    console.log('SMS notifications will be skipped');
    
    // Fall back to email-only notifications
    console.log('Using email notifications instead');
  }
}

// ============================================================
// Example 8: Conditional SMS Based on Customer Preference
// ============================================================
async function example8_CustomerPreference() {
  console.log('\nExample 8: Respecting customer SMS preferences\n');

  const booking = {
    clientName: 'Sarah Johnson',
    clientPhone: '+61412345678',
    clientEmail: 'sarah@example.com',
    smsNotificationsEnabled: true, // Customer preference from database
    eventDate: new Date('2025-12-15'),
    startTime: '14:00',
    package: `Santa's Gift Pack`,
    location: 'Westfield Shopping Centre'
  };

  // Only send SMS if customer has opted in
  if (booking.smsNotificationsEnabled && booking.clientPhone) {
    const result = await sendBookingConfirmationSMS(booking);
    
    if (result.success) {
      console.log('✅ SMS sent (customer opted in)');
    }
  } else {
    console.log('ℹ️ SMS skipped (customer opted out or no phone number)');
    // Send email instead
  }
}

// ============================================================
// Example 9: Batch SMS Sending with Rate Limiting
// ============================================================
async function example9_BatchSending() {
  console.log('\nExample 9: Batch SMS sending with rate limiting\n');

  const Booking = require('./server/models/Booking');

  // Get all bookings that need reminders (example: next 7 days)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const bookingsNeedingReminders = await Booking.find({
    status: 'confirmed',
    eventDate: {
      $gte: startDate,
      $lte: endDate
    },
    reminderSent: { $ne: true } // Haven't sent reminder yet
  });

  console.log(`Sending reminders to ${bookingsNeedingReminders.length} customers`);

  let successCount = 0;
  let failureCount = 0;

  for (const booking of bookingsNeedingReminders) {
    if (!booking.clientPhone) {
      console.log(`Skipping ${booking.clientName} - no phone number`);
      continue;
    }

    // Calculate days until event
    const daysUntil = Math.ceil(
      (new Date(booking.eventDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const result = await sendBookingReminderSMS(booking, daysUntil);

    if (result.success) {
      successCount++;
      console.log(`✅ Reminder sent to ${booking.clientName}`);
      
      // Mark reminder as sent
      await Booking.updateOne(
        { _id: booking._id },
        { reminderSent: true, reminderSentAt: new Date() }
      );
    } else {
      failureCount++;
      console.error(`❌ Failed to send to ${booking.clientName}:`, result.error);
    }

    // Rate limiting: Wait 1 second between messages
    // Twilio allows ~10-20 messages per second for most accounts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Batch Summary: ${successCount} sent, ${failureCount} failed`);
}

// ============================================================
// Example 10: Integration with Express Route
// ============================================================
function example10_ExpressRoute() {
  console.log('\nExample 10: Express route integration\n');

  // This is example code showing how to integrate into an Express route
  const exampleCode = `
  // In your server/index.js or routes file:
  
  const { sendBookingConfirmationSMS } = require('./services/twilioClient');
  
  app.post('/api/bookings', async (req, res) => {
    try {
      // Create booking in database
      const booking = await Booking.create(req.body);
      
      // Send email confirmation (existing)
      await sendBookingConfirmationEmail(booking);
      
      // Send SMS confirmation (new!)
      if (booking.clientPhone && isTwilioConfigured()) {
        const smsResult = await sendBookingConfirmationSMS(booking);
        
        if (smsResult.success) {
          console.log('✅ SMS confirmation sent');
        } else {
          console.warn('⚠️ SMS failed but booking created:', smsResult.error);
          // Don't fail the whole request - email was still sent
        }
      }
      
      res.json({ success: true, bookingId: booking._id });
    } catch (error) {
      res.status(500).json({ error: 'Booking failed' });
    }
  });
  `;

  console.log(exampleCode);
}

// ============================================================
// Run Examples (Comment/uncomment to test specific examples)
// ============================================================

async function runExamples() {
  console.log('='.repeat(60));
  console.log('TWILIO SMS INTEGRATION EXAMPLES');
  console.log('='.repeat(60));

  // Check if Twilio is configured before running examples
  if (!isTwilioConfigured()) {
    console.log('\n⚠️  Twilio is not configured!');
    console.log('Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
    console.log('in your .env file before running these examples.\n');
    return;
  }

  // Uncomment the examples you want to run:
  
  // await example1_BasicSMS();
  // await example2_BookingConfirmation();
  // await example3_PaymentConfirmation();
  // await example4_BookingReminder();
  // await example5_ScheduledReminders(); // Requires database
  // await example6_ErrorHandling();
  // await example7_CheckAvailability();
  // await example8_CustomerPreference();
  // await example9_BatchSending(); // Requires database
  example10_ExpressRoute();

  console.log('\n' + '='.repeat(60));
  console.log('Examples complete!');
  console.log('='.repeat(60));
}

// Only run if executed directly (not imported)
if (require.main === module) {
  runExamples().catch(console.error);
}

// Export for use in other files
module.exports = {
  example1_BasicSMS,
  example2_BookingConfirmation,
  example3_PaymentConfirmation,
  example4_BookingReminder,
  example5_ScheduledReminders,
  example6_ErrorHandling,
  example7_CheckAvailability,
  example8_CustomerPreference,
  example9_BatchSending
};
