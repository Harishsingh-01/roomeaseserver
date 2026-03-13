const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
reviewSchema.index({ roomId: 1 });
reviewSchema.index({ userId: 1 });
// bookingId already has unique: true in schema definition, no need for separate index

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;