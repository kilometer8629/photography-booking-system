const http = require('http');

async function test() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/availability?date=2025-11-02', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Availability for 2025-11-02:');
          console.log(`Total slots: ${json.slots.length}`);
          console.log('Expected to be 71 (72 minus 1 booked at 14:00)');
          
          // Check if 14:00 is excluded
          const has1400 = json.slots.some(s => s === '14:00');
          console.log(`Contains 14:00 slot: ${has1400} (should be false)`);
          
          console.log('\nFirst 10 slots:', json.slots.slice(0, 10));
          console.log('Last 10 slots:', json.slots.slice(-10));
          resolve();
        } catch (e) {
          console.error('Parse error:', e.message);
          reject(e);
        }
      });
    }).on('error', err => {
      console.error('Error:', err.message);
      reject(err);
    });
  });
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
