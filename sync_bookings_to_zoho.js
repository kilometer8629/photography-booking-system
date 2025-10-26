const mongoose = require('mongoose');
require('dotenv').config();
const { Booking } = require('./server/models');
const { createZohoEvent } = require('./server/services/zohoClient');
const { DateTime } = require('luxon');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/southsydneyphotography');
    
    // Find bookings without Zoho event IDs
    const bookingsNeedingSync = await Booking.find({
      zohoEventId: { $exists: false }
    });

    console.log(`\nFound ${bookingsNeedingSync.length} bookings without Zoho event IDs\n`);

    for (const booking of bookingsNeedingSync) {
      try {
        const dateStr = booking.eventDate.toISOString().split('T')[0];
        const timeStr = booking.startTime; // Already in HH:mm format
        
        console.log(`Creating Zoho event for ${dateStr} at ${timeStr}...`);
        
        const zohoEvent = await createZohoEvent({
          date: dateStr,
          time: timeStr,
          durationMinutes: 5,
          summary: `${booking.package} - Santa Session`,
          description: `Customer: ${booking.clientName} (${booking.clientEmail})`,
          location: booking.location
        });

        // Update booking with Zoho event ID
        booking.zohoEventId = zohoEvent.id;
        await booking.save();
        
        console.log(`  ✓ Synced! Zoho Event ID: ${zohoEvent.id}\n`);
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}\n`);
      }
    }

    console.log('Sync complete!\n');
    process.exit(0);
  } catch (e) {
    console.error('Fatal error:', e.message);
    process.exit(1);
  }
})();
