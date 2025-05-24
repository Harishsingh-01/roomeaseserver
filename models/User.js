const mongoose = require('mongoose')
const Booking = require('./Booking')
const Room = require('./Room')

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" }, 
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }]
});

// Pre-remove middleware to handle cleanup when a user is deleted
UserSchema.pre('remove', async function(next) {
    try {
        // Find all bookings for this user
        const userBookings = await Booking.find({ userId: this._id })
        
        // Update room availability for each booking
        for (const booking of userBookings) {
            await Room.findByIdAndUpdate(
                booking.roomId,
                { available: true }
            )
        }
        
        // Delete all bookings associated with this user
        await Booking.deleteMany({ userId: this._id })
        
        next()
    } catch (error) {
        next(error)
    }
})

// Add a method to get user's bookings
UserSchema.methods.getBookings = async function() {
    return await Booking.find({ userId: this._id })
}

module.exports = mongoose.model("User", UserSchema)