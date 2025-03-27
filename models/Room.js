const mongoose = require("mongoose");
const Booking = require("./Booking");

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  amenities: { type: [String], required: true },
  description: String,
  available: { type: Boolean, default: true },
  imageUrl: { type: String },
});

RoomSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.available === true) {
    try {
      await Booking.deleteOne({ roomId: doc._id });
     } catch (error) {
     }
  }
});

module.exports = mongoose.model("Room", RoomSchema);
