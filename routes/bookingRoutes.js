const express = require("express");
const jwt = require("jsonwebtoken");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const verifyToken = require("../middleware/authMiddleware"); // Middleware to verify JWT
const mongoose = require("mongoose");

const router = express.Router();

// 📌 Book a Room (Protected Route)
// router.post("/book", verifyToken, async (req, res) => {
//   console.log("coming or not");
//   try {
//     const { roomId, checkIn, checkOut, totalPrice } = req.body;
//     const userId = req.user?.id;
//     console.log("Received booking request:", req.body); // Debugging log


//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized: User ID missing" });
//     }

//     const room = await Room.findById(roomId);
//     if (!room) {
//       return res.status(404).json({ message: "Room not found" });
//     }

//     // Check if room is already booked for the selected dates
//     const overlappingBooking = await Booking.findOne({
//       roomId,
//       $or: [
//         { checkIn: { $lte: checkOut }, checkOut: { $gte: checkIn } },
//       ],
//     });

//     if (overlappingBooking) {
//       return res.status(400).json({ message: "Room is already booked for selected dates" });
//     }

//     // Create a new booking
//     const booking = new Booking({ userId, roomId, checkIn, checkOut, totalPrice });
//     await booking.save();

//     console.log("Booking successful:", booking);
//     res.status(201).json({ message: "Room booked successfully", booking });
//   } catch (error) {
//     console.error("Booking Error:", error);
//     res.status(500).json({ message: "Error booking room", error: error.message });
//   }
// });



// 📌 Get all bookings for a logged-in user (Protected Route)
router.get("/userbookings", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const bookings = await Booking.find({ userId })
      .populate("roomId")
      .sort({ createdAt: -1 });

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);    
    res.status(500).json({ message: "Error fetching bookings", error: error.message });
  }
});

// Update booking status (for expired bookings)
router.post("/update-status", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find expired bookings
    const expiredBookings = await Booking.find({
      checkOut: { $lt: today },
      status: 'booked'
    }).session(session);

    // Update each expired booking
    for (const booking of expiredBookings) {
      await Booking.findByIdAndUpdate(
        booking._id,
        { status: 'completed' },
        { session }
      );
    }

    await session.commitTransaction();
    res.json({ 
      message: "Room availability updated",
      updatedBookings: expiredBookings.length
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  } finally {
    session.endSession();
  }
});


// // ✅ Handle Payment Success from Stripe success_url
// router.get("/successs", async (req, res) => {
//   try {
//     const { roomId, userId, checkIn, checkOut, totalPrice } = req.query;

//     if (!roomId || !userId || !checkIn || !checkOut || !totalPrice) {
//       return res.status(400).json({ error: "Missing booking details" });
//     }

//     console.log("📤 Processing booking:", { roomId, userId, checkIn, checkOut, totalPrice });

//     // 🔹 Check if room exists
//     const room = await Room.findById(roomId);
//     if (!room || !room.available) {
//       return res.status(400).json({ message: "Room is not available." });
//     }

//     // 🔹 Save booking in database
//     const booking = new Booking({ userId, roomId, checkIn, checkOut, totalPrice });
//     await booking.save();

//     // 🔹 Mark room as unavailable
//     room.available = false;
//     await room.save();

//     console.log("✅ Booking confirmed:", booking);

//     // 🔹 Redirect user to frontend booking success page
//     res.redirect(`http://localhost:3000/success?roomId=${roomId}&userId=${userId}`);
//   } catch (error) {
//     console.error("❌ Booking Error:", error);
//     res.status(500).json({ error: "Booking failed!" });
//   }
// });


// Add this new route to get a single booking
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      userId: req.user.id
    }).populate('roomId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking details', error: error.message });
  }
});

// Cancel booking
router.post('/cancel/:bookingId', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.bookingId).session(session);
    
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the booking belongs to the user
    if (booking.userId.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // Check if cancellation is possible (before check-in date)
    const checkInDate = new Date(booking.checkIn);
    const today = new Date();
    if (checkInDate <= today) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot cancel booking after check-in date' });
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save({ session });

    // Room availability will be updated by the Booking model's middleware

    await session.commitTransaction();
    res.status(200).json({ 
      message: 'Booking cancelled successfully',
      refundAmount: booking.totalPrice
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Failed to cancel booking', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
