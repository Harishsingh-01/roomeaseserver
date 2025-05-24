const mongoose = require("mongoose");
const User = require("./User");

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who booked it?
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true }, // Which room?
  checkIn: { type: Date, required: true }, // Check-in date
  checkOut: { type: Date, required: true }, // Check-out date
  totalPrice: { type: Number, required: true }, // Total amount paid
  status: { type: String, enum: ["booked", "cancelled", "completed"], default: "booked" }, // Status
}, { timestamps: true });

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

// Pre-remove middleware to clean up references
BookingSchema.pre('remove', async function(next) {
  try {
    // Remove booking reference from user
    await User.findByIdAndUpdate(
      this.userId,
      { $pull: { bookings: this._id } }
    );
    
    // Update room availability
    await mongoose.model('Room').findByIdAndUpdate(
      this.roomId,
      { available: true }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Booking", BookingSchema);
