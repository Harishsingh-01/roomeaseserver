const mongoose = require("mongoose");
const Booking = require("./Booking");

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  amenities: { type: [String], required: true },
  description: String,
  available: { type: Boolean, default: true },
  mainImage: { // Main image that will be displayed everywhere
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v); // Basic URL validation
      },
      message: 'Main image must be a valid URL'
    }
  },
  additionalImages: { // Additional images for RoomDetails page
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 3; // Max 3 additional images (total 4 with main image)
        // Optional URL validation for each additional image
        // return v.every(url => /^https?:\/\/.+/.test(url));
      },
      message: 'Cannot have more than 3 additional images'
    }
  }
});

RoomSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.available === true) {
    try {
      await Booking.deleteOne({ roomId: doc._id });
    } catch (error) {
      // Handle error if needed
    }
  }
});

// Virtual to get all images (main + additional) when needed
RoomSchema.virtual('allImages').get(function() {
  return [this.mainImage, ...this.additionalImages];
});

module.exports = mongoose.model("Room", RoomSchema);
