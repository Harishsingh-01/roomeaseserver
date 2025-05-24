const mongoose = require("mongoose");
const User = require("./User");
const Room = require("./Room");

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who booked it?
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true }, // Which room?
  checkIn: { type: Date, required: true }, // Check-in date
  checkOut: { type: Date, required: true }, // Check-out date
  totalPrice: { type: Number, required: true }, // Total amount paid
  status: { type: String, enum: ["booked", "cancelled", "completed"], default: "booked" }, // Status
}, { timestamps: true });

// Pre-save middleware to check room availability and update it
BookingSchema.pre('save', async function(next) {
  try {
    if (this.isNew) { // Only check for new bookings
      const room = await Room.findById(this.roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      if (!room.available) {
        throw new Error('Room is not available');
      }
      // Mark room as unavailable
      room.available = false;
      await room.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update user's bookings array
BookingSchema.post('save', async function() {
  try {
    await User.findByIdAndUpdate(
      this.userId,
      { $addToSet: { bookings: this._id } }
    );
  } catch (error) {
    console.error('Error updating user bookings:', error);
  }
});

// Pre-remove middleware to clean up references and update room availability
BookingSchema.pre('remove', async function(next) {
  try {
    // Remove booking reference from user
    await User.findByIdAndUpdate(
      this.userId,
      { $pull: { bookings: this._id } }
    );
    
    // Update room availability
    await Room.findByIdAndUpdate(
      this.roomId,
      { available: true }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-findOneAndUpdate middleware to handle status changes
BookingSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    if (update.status === 'cancelled' || update.status === 'completed') {
      const booking = await this.model.findOne(this.getQuery());
      if (booking) {
        await Room.findByIdAndUpdate(
          booking.roomId,
          { available: true }
        );
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Booking", BookingSchema);
