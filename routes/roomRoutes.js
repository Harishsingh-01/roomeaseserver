const express = require("express");
const Room = require("../models/Room");
const Review = require("../models/Review");
const User = require("../models/User");

const router = express.Router();

// Get all rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rooms", error });
  }
});

// Get featured rooms (must be before /:id route)
router.get('/featured', async (req, res) => {
  try {
    const featuredRooms = await Room.find()
      .sort({ rating: -1, createdAt: -1 })
      .limit(3)
      .select('name type price mainImage amenities available rating');

    res.json(featuredRooms);
  } catch (error) {
    console.error('Error fetching featured rooms:', error);
    res.status(500).json({ message: 'Error fetching featured rooms' });
  }
});

// Get room statistics
router.get('/statistics', async (req, res) => {
  try {
    // Get total rooms count
    const totalRooms = await Room.countDocuments();
    console.log('Total rooms:', totalRooms);

    // Get available rooms count
    const availableRooms = await Room.countDocuments({ available: true });
    console.log('Available rooms:', availableRooms);

    // Get booked rooms count
    const bookedRooms = await Room.countDocuments({ available: false });
    console.log('Booked rooms:', bookedRooms);

    // Get average rating with proper handling
    let averageRating = 0;
    try {
      const ratingResult = await Room.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } }
      ]);
      
      if (ratingResult && ratingResult.length > 0) {
        averageRating = ratingResult[0].avgRating || 0;
      }
    } catch (ratingError) {
      console.error('Error calculating average rating:', ratingError);
      // If rating calculation fails, we'll use 0 as default
    }

    console.log('Average rating:', averageRating);

    // Calculate satisfaction rate
    const satisfactionRate = totalRooms > 0 
      ? Math.round((availableRooms / totalRooms) * 100)
      : 0;

    console.log('Satisfaction rate:', satisfactionRate);

    res.json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        bookedRooms,
        averageRating: Number(averageRating.toFixed(1)),
        satisfactionRate
      }
    });
  } catch (error) {
    console.error('Error fetching room statistics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching room statistics',
      error: error.message 
    });
  }
});

// Get room by ID
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const reviews = await Review.find({ roomId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    const roomData = room.toObject();
    
    if (reviews && reviews.length > 0) {
      const ratingCounts = Array(5).fill(0);
      let totalRating = 0;

      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          ratingCounts[review.rating - 1]++;
          totalRating += review.rating;
        }
      });

      roomData.averageRating = (totalRating / reviews.length).toFixed(1);
      roomData.reviewCount = reviews.length;
      roomData.ratingCounts = ratingCounts;
      roomData.reviews = reviews;
    } else {
      roomData.averageRating = 0;
      roomData.reviewCount = 0;
      roomData.ratingCounts = [0, 0, 0, 0, 0];
      roomData.reviews = [];
    }

    res.json(roomData);
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ message: 'Error fetching room details' });
  }
});

router.get("/room/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    console.error("❌ Error fetching room:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/update-availability", async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "Room ID is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    if (!room.available) return res.status(400).json({ error: "Room already booked" });

    room.available = false;
    await room.save();

    res.json({ message: "Room booked successfully", room });
  } catch (error) {
    res.status(500).json({ error: "Failed to update room availability" });
  }
});

router.put("/admin/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      name: req.body.name,
      type: req.body.type,
      price: Number(req.body.price),
      amenities: req.body.amenities,
      description: req.body.description,
      image: req.body.image,
      available: req.body.available
    };

    const room = await Room.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({ 
      success: true,
      message: "Room updated successfully", 
      room 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error updating room", 
      error: error.message 
    });
  }
});

router.delete("/rooms/:id", async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Room deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting room", error });
  }
});

module.exports = router;

router.get("/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ email: user.email });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user email" });
  }
});
