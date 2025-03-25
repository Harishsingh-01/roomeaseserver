const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const auth = require('../middleware/authMiddleware'); // Import auth middleware
const User = require('../models/User');
const adminAuth = require('../middleware/adminMiddleware'); // Import admin auth middleware

// Submit contact form - now requires authentication
router.post('/submit', auth, async (req, res) => {
  try {
    console.log('Received contact form data:', req.body);

    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'All fields are required',
        received: { name, email, subject, message }
      });
    }

    // Create new contact submission
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      userId: req.user.id // Add user ID reference
    });

    await contact.save();
    console.log('Contact saved:', contact);

    res.status(201).json({
      message: 'Thank you for your message. We will get back to you soon!',
      contact
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({ 
      message: 'Error submitting contact form',
      error: error.message 
    });
  }
});
// GET user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});



// GET all contact form submissions (Admin only)
router.get('/contacts', auth, adminAuth, async (req, res) => {
  try {
    const contacts = await Contact.find().populate('userId', 'name email'); // Fetch user details
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


module.exports = router; 