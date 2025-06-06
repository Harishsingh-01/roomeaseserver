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
  let session = null;

  try {
    const { roomId, userId, checkIn, checkOut, totalPrice } = req.body;

    if (!roomId || !userId || !checkIn || !checkOut || !totalPrice) {
      return res.status(400).json({ error: "Missing booking details" });
    }

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

    const room = await Room.findById(roomId);
    if (!room || !room.available) {
      return res.status(400).json({ error: "Room is not available" });
    }

    const booking = new Booking({
      userId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalPrice,
      status: 'booked'
    });

    await booking.save();

    room.available = false;
    await room.save();

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully!",
      bookingId: booking._id
    });

  } catch (error) {
    console.error("Booking Error:", error);

    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (sessionError) {
        console.error("Session abort error:", sessionError);
      }
    }

    if (error.code === 251) {
      return res.status(500).json({
        error: "Booking system temporarily unavailable. Please try again."
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        error: "This room is already booked for the selected dates"
      });
    }

    res.status(500).json({
      error: "Unable to complete booking. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch (error) {
        console.error("Session end error:", error);
      }
    }
  }
});

module.exports = router;
