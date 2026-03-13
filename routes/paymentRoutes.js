const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const Room = require("../models/Room");
const Booking = require("../models/Booking");
const router = express.Router();
const mongoose = require("mongoose");

const executeWithRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 112 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      throw error;
    }
  }
};

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { price, roomId, userId, checkIn, checkOut } = req.body;

    if (!price || price <= 0 || !roomId || !userId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Invalid booking details" });
    }

    // Ensure the price is an integer in the smallest currency unit (paise)
    const unitAmountInPaise = Math.round(price * 100); // Use Math.round for safety

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "Hotel Room Booking" },
            unit_amount: unitAmountInPaise, // Use the rounded integer amount
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?roomId=${roomId}&userId=${userId}&checkIn=${checkIn}&checkOut=${checkOut}&totalPrice=${price}`,
    });
     
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/confirm-booking", async (req, res) => {
  try {
    console.log("📥 Received booking confirmation request:", req.body);
    const { roomId, userId, checkIn, checkOut, totalPrice } = req.body;

    if (!roomId || !userId || !checkIn || !checkOut || !totalPrice) {
      console.log("❌ Missing booking details:", { roomId, userId, checkIn, checkOut, totalPrice });
      return res.status(400).json({ error: "Missing booking details" });
    }

    // Check for existing bookings with date overlap
    const existingBooking = await Booking.findOne({
      roomId,
      $or: [
        {
          checkIn: { $lte: new Date(checkOut) },
          checkOut: { $gte: new Date(checkIn) }
        }
      ],
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(400).json({ error: "Room is already booked for these dates" });
    }

    // Check if room exists and is available
    const room = await Room.findById(roomId);
    if (!room || !room.available) {
      return res.status(400).json({ error: "Room is not available" });
    }

    // Create the booking - the pre-save middleware will handle room availability
    console.log("📝 Creating booking with data:", {
      userId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalPrice,
      status: 'booked'
    });

    const booking = new Booking({
      userId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalPrice,
      status: 'booked'
    });

    console.log("💾 Saving booking to database...");
    await booking.save();
    console.log("✅ Booking saved successfully:", booking._id);

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully!",
      bookingId: booking._id
    });

  } catch (error) {
    console.error("❌ Booking Error:", error);
    console.error("❌ Error stack:", error.stack);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "This room is already booked for the selected dates"
      });
    }

    // Handle specific errors from Booking model middleware
    if (error.message === 'Room not found') {
      return res.status(400).json({
        error: "Room not found"
      });
    }

    if (error.message === 'Room is not available') {
      return res.status(400).json({
        error: "Room is no longer available"
      });
    }

    res.status(500).json({
      error: "Unable to complete booking. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
