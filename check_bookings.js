const mongoose = require('mongoose');
require('dotenv').config();
const { Booking } = require('./server/models');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/southsydneyphotography');
    const bookings = await Booking.find({}).lean();
    console.log('\n=== Bookings in Database ===');
    bookings.forEach(b => {
      const dateStr = b.eventDate ? new Date(b.eventDate).toISOString().split('T')[0] : 'N/A';
      console.log(`Date: ${dateStr}, Time: "${b.startTime}", Status: ${b.status}, Zoho ID: ${b.zohoEventId || 'NONE'}`);
    });
    console.log(`\nTotal: ${bookings.length} bookings\n`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
