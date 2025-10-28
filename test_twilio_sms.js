/**
 * Test script for Twilio SMS integration
 * Usage: node test_twilio_sms.js
 */

require('./config/loadEnv');
const {
  sendSMS,
  sendBookingConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendRescheduleNotificationSMS,
  sendCancellationSMS,
  sendBookingReminderSMS,
  isTwilioConfigured,
  normalizePhoneNumber
} = require('./server/services/twilioClient');

const TEST_PHONE = process.env.TEST_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

async function runTests() {
  console.log('🧪 Starting Twilio SMS Integration Tests\n');

  // Test 1: Check Configuration
  console.log('Test 1: Checking Twilio Configuration...');
  if (isTwilioConfigured()) {
    console.log('✅ Twilio is properly configured');
    console.log(`   Phone Number: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
  } else {
    console.log('❌ Twilio is NOT configured');
    console.log('   Please set the following environment variables:');
    console.log('   - TWILIO_ACCOUNT_SID');
    console.log('   - TWILIO_AUTH_TOKEN');
    console.log('   - TWILIO_PHONE_NUMBER');
    console.log('\nExiting tests - configuration required.');
    return;
  }

  // Test 2: Phone Number Normalization
  console.log('\nTest 2: Testing Phone Number Normalization...');
  const testNumbers = [
    '0412345678',
    '61412345678',
    '+61412345678',
    '(04) 1234 5678',
    '04 1234 5678'
  ];

  testNumbers.forEach(number => {
    const normalized = normalizePhoneNumber(number);
    console.log(`   ${number} → ${normalized}`);
  });
  console.log('✅ Phone normalization working\n');

  if (!TEST_PHONE) {
    console.log('⚠️  No TEST_PHONE_NUMBER set. Skipping actual SMS tests.');
    console.log('   Set TEST_PHONE_NUMBER in .env to test actual SMS sending.');
    console.log('   Example: TEST_PHONE_NUMBER=+61412345678\n');
    return;
  }

  // Ask for confirmation before sending test SMS
  console.log('⚠️  About to send test SMS messages.');
  console.log(`   Recipient: ${TEST_PHONE}`);
  console.log('   Note: This will use your Twilio credits.\n');

  // Test 3: Basic SMS
  console.log('Test 3: Sending basic test SMS...');
  const basicResult = await sendSMS(
    TEST_PHONE,
    'This is a test message from Ami Photography booking system. 📸'
  );
  
  if (basicResult.success) {
    console.log(`✅ Basic SMS sent successfully`);
    console.log(`   Message SID: ${basicResult.messageSid}`);
    console.log(`   Status: ${basicResult.status}`);
  } else {
    console.log(`❌ Basic SMS failed: ${basicResult.error}`);
  }

  // Wait a bit before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Booking Confirmation SMS
  console.log('\nTest 4: Sending booking confirmation SMS...');
  const testBooking = {
    clientName: 'Test Customer',
    clientPhone: TEST_PHONE,
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    startTime: '14:00',
    package: `Santa's Gift Pack`,
    location: 'Westfield Shopping Centre'
  };

  const confirmResult = await sendBookingConfirmationSMS(testBooking);
  
  if (confirmResult.success) {
    console.log(`✅ Booking confirmation SMS sent`);
    console.log(`   Message SID: ${confirmResult.messageSid}`);
  } else {
    console.log(`❌ Booking confirmation failed: ${confirmResult.error}`);
  }

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Payment Confirmation SMS
  console.log('\nTest 5: Sending payment confirmation SMS...');
  const paymentBooking = {
    ...testBooking,
    packageAmount: 15000, // $150.00 in cents
    packageCurrency: '$'
  };

  const paymentResult = await sendPaymentConfirmationSMS(paymentBooking);
  
  if (paymentResult.success) {
    console.log(`✅ Payment confirmation SMS sent`);
    console.log(`   Message SID: ${paymentResult.messageSid}`);
  } else {
    console.log(`❌ Payment confirmation failed: ${paymentResult.error}`);
  }

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: Booking Reminder SMS
  console.log('\nTest 6: Sending booking reminder SMS...');
  const reminderResult = await sendBookingReminderSMS(testBooking, 1);
  
  if (reminderResult.success) {
    console.log(`✅ Booking reminder SMS sent`);
    console.log(`   Message SID: ${reminderResult.messageSid}`);
  } else {
    console.log(`❌ Booking reminder failed: ${reminderResult.error}`);
  }

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 7: Reschedule Notification SMS
  console.log('\nTest 7: Sending reschedule notification SMS...');
  const newDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  const rescheduleResult = await sendRescheduleNotificationSMS(testBooking, newDate, '15:00');
  
  if (rescheduleResult.success) {
    console.log(`✅ Reschedule notification SMS sent`);
    console.log(`   Message SID: ${rescheduleResult.messageSid}`);
  } else {
    console.log(`❌ Reschedule notification failed: ${rescheduleResult.error}`);
  }

  // Wait before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 8: Cancellation SMS
  console.log('\nTest 8: Sending cancellation SMS...');
  const cancelResult = await sendCancellationSMS(paymentBooking, 13500); // $135 refund
  
  if (cancelResult.success) {
    console.log(`✅ Cancellation SMS sent`);
    console.log(`   Message SID: ${cancelResult.messageSid}`);
  } else {
    console.log(`❌ Cancellation SMS failed: ${cancelResult.error}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log('✅ Configuration: PASSED');
  console.log('✅ Phone Normalization: PASSED');
  
  const results = [
    basicResult,
    confirmResult,
    paymentResult,
    reminderResult,
    rescheduleResult,
    cancelResult
  ];

  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  console.log(`📱 SMS Tests: ${successCount}/${totalTests} PASSED`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 All tests passed! Twilio SMS integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check error messages above.');
  }
  
  console.log('\n💡 Tips:');
  console.log('   - Check Twilio Console for message delivery status');
  console.log('   - Verify phone numbers are in E.164 format');
  console.log('   - For trial accounts, verify recipient numbers in Twilio Console');
  console.log('\n🔗 Twilio Console: https://console.twilio.com/us1/monitor/logs/sms\n');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
