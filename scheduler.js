const cron = require('node-cron');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const mongoose = require('mongoose');

// Function to process expired bookings
const processExpiredBookings = async () => {
  console.log('Running scheduled task: Checking for expired bookings...');
  
  try {
    // Get current date at midnight
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find all bookings where checkOut date is before or equal to current date
    // and status is 'booked'
    const expiredBookings = await Booking.find({
      checkOut: { $lte: currentDate },
      status: 'booked'
    });

    console.log(`Found ${expiredBookings.length} expired bookings`);

    // Process each expired booking
    for (const booking of expiredBookings) {
      try {
        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Update booking status to 'completed'
          await Booking.findByIdAndUpdate(
            booking._id,
            { status: 'completed' },
            { session }
          );

          // Update room availability
          await Room.findByIdAndUpdate(
            booking.roomId,
            { available: true },
            { session }
          );

          // Commit the transaction
          await session.commitTransaction();
          console.log(`Successfully processed expired booking: ${booking._id}`);
        } catch (error) {
          // If an error occurs, abort the transaction
          await session.abortTransaction();
          console.error(`Error processing booking ${booking._id}:`, error);
        } finally {
          session.endSession();
        }
      } catch (error) {
        console.error(`Error in transaction for booking ${booking._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processExpiredBookings:', error);
  }
};

// Schedule the task to run at midnight every day
const scheduleExpiredBookingsCheck = () => {
  // '0 0 * * *' means run at 00:00 (midnight) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting scheduled task at:', new Date().toISOString());
    await processExpiredBookings();
  });
};

module.exports = {
  scheduleExpiredBookingsCheck,
  processExpiredBookings // Export for testing purposes
}; 