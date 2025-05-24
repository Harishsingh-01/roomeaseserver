const express = require("express");
const Room = require("../models/Room");
const User = require("../models/User");

const Booking = require("../models/Booking");
const verifyToken = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// ✅ create a rooms (Admin)
router.post("/addroom", verifyToken, adminMiddleware, async (req, res) => {
    try {
        // Validate main image
        if (!req.body.mainImage) {
            return res.status(400).json({ message: "Main image URL is required" });
        }

        // Validate additional images (optional)
        if (req.body.additionalImages && Array.isArray(req.body.additionalImages)) {
            if (req.body.additionalImages.length > 3) {
                return res.status(400).json({ 
                    message: "Maximum 3 additional images allowed" 
                });
            }
        }

        const newRoom = new Room({
            ...req.body,
            additionalImages: (req.body.additionalImages || []).filter(Boolean)
        });

        await newRoom.save();
        res.status(201).json({ message: "Room added successfully", room: newRoom });
    } catch (error) {
        console.error("❌ Error adding room:", error);
        res.status(500).json({ message: "Error adding room", error: error.message });
    }
});



// ✅ Update Room Details (Only for Admins)
router.put("/update/:roomId", verifyToken, adminMiddleware, async (req, res) => {
  try {
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.roomId,
      req.body,
      { new: true }
    );

    if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room updated successfully", room: updatedRoom });
  } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Internal Server Error", error });
  }
});


// DELETE Room Route with booking cleanup
router.delete("/delete/:roomId", verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    // First, delete all bookings associated with this room
    await Booking.deleteMany({ roomId: roomId });

    // Then delete the room
    const deletedRoom = await Room.findByIdAndDelete(roomId);

    if (!deletedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ 
      message: "Room and associated bookings deleted successfully",
      deletedRoom
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ message: "Error deleting room", error });
  }
});


// Get all booked rooms
router.get("/booked-rooms", verifyToken, adminMiddleware, async (req, res) => {
  try {
      // First find all bookings
      const bookings = await Booking.find()
          .populate('userId', 'name email')
          .populate('roomId');
      
      // Get unique room IDs from bookings
      const roomIds = [...new Set(bookings.map(booking => booking.roomId._id))];
      
      // Find all rooms that are either booked or marked as unavailable
      const rooms = await Room.find({ 
          $or: [
              { _id: { $in: roomIds } },
              { available: false }
          ]
      });
      
      // Combine room and booking data
      const roomsWithBookings = rooms.map(room => {
          const roomBooking = bookings.find(booking => 
              booking.roomId._id.toString() === room._id.toString()
          );
          return {
              ...room.toObject(),
              booking: roomBooking ? {
                  ...roomBooking.toObject(),
                  user: roomBooking.userId
              } : null
          };
      });

      res.status(200).json(roomsWithBookings);
  } catch (error) {
      console.error("Error fetching booked rooms:", error);
      res.status(500).json({ message: "Failed to fetch booked rooms" });
  }
});
  
  //users data
  router.get('/usersdata', verifyToken, adminMiddleware, async (req, res) => {
    try {
      const users = await User.find({}, '_id name email role'); // Select only name and email fields
      res.status(200).json(users);
      
    } catch (err) {
      res.status(500).json({ message: "Failed to load users" });
    }
  });
  

  router.delete("/user-delete/:userId",async(req,res)=>{    
    try{
      const receivedUser = req.params.userId;
      const checkUser=await User.findById(receivedUser);
      if(!checkUser){
        return res.status(400).json({message:"User not found"})
      }

      await User.findByIdAndDelete(receivedUser);
      res.json({message:"User deleted Succesfully"})
    }
    catch(err){
      console.log(err)
      return res.status(400).json("Error User Deletion",err)
    }



  })


// // ✅ Create a room (Admin)
// router.post("/rooms", verifyToken, adminMiddleware, async (req, res) => {
//   try {
//     const newRoom = new Room(req.body);
//     await newRoom.save();
//     res.status(201).json({ message: "Room added successfully", room: newRoom });
//   } catch (error) {
//     res.status(500).json({ message: "Error adding room", error });
//   }
// });

// // ✅ Get all bookings (Admin)
// router.get("/bookings", verifyToken, adminMiddleware, async (req, res) => {
//   const bookings = await Booking.find().populate("roomId userId");
//   res.json(bookings);
// });

module.exports = router;
