const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const transporter = require("../middleware/sendOTP");
const otpGenerator = require("otp-generator");
const dotenv = require("dotenv");
const ResetToken = require('../models/ResetToken');
const crypto = require('crypto');

dotenv.config();

const router = express.Router();

router.post("/verify-otp", async (req, res) => {
  const { email, otp, name, password } = req.body;

  try {
    const otpEntry = await OTP.findOne({ email, otp });
    if (!otpEntry) return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (otpEntry.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired, request a new one" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    await OTP.deleteOne({ email });

    res.json({ success: true, message: "Registration successful. You can now log in." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error verifying OTP", error: error.message });
  }
});

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const otpCode = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });

    await OTP.deleteOne({ email });

    const otpEntry = new OTP({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
    
    await otpEntry.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otpCode}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; padding: 32px;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; overflow: hidden;">
            <div style="background: #10b981; padding: 24px 0; text-align: center;">
              <img src='https://pgify.vercel.app/mainlogo.png' alt='PGify Logo' style='height: 40px; margin-bottom: 8px;' />
              <h2 style="color: #fff; margin: 0; font-size: 1.5rem;">PGify Verification</h2>
            </div>
            <div style="padding: 32px 24px; text-align: center;">
              <h3 style="color: #10b981; margin-bottom: 16px;">Your OTP Code</h3>
              <div style="font-size: 2.5rem; font-weight: bold; letter-spacing: 8px; color: #18191A; margin-bottom: 16px;">${otpCode}</div>
              <p style="color: #555; font-size: 1rem; margin-bottom: 24px;">Enter this code to verify your email address. This code will expire in <b>5 minutes</b>.</p>
              <p style="color: #888; font-size: 0.95rem;">If you did not request this, you can safely ignore this email.</p>
            </div>
            <div style="background: #f4f8fb; padding: 16px; text-align: center; color: #aaa; font-size: 0.9rem;">&copy; ${new Date().getFullYear()} PGify</div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);    
    res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
});

router.post("/send-booking-email", async (req, res) => {
  const { email } = req.body;

  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found!" });
      }

      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Room Booking Successful!",
          text: `Dear ${user.name},\n\nYour room has been successfully booked!\n\nThank you for choosing us!`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; padding: 32px;">
              <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; overflow: hidden;">
                <div style="background: #10b981; padding: 24px 0; text-align: center;">
                  <img src='https://pgify.vercel.app/mainlogo.png' alt='PGify Logo' style='height: 40px; margin-bottom: 8px;' />
                  <h2 style="color: #fff; margin: 0; font-size: 1.5rem;">Booking Confirmed!</h2>
                </div>
                <div style="padding: 32px 24px; text-align: center;">
                  <h3 style="color: #10b981; margin-bottom: 16px;">Dear ${user.name},</h3>
                  <p style="color: #222; font-size: 1.1rem; margin-bottom: 16px;">Your room has been <b>successfully booked</b>!</p>
                  <p style="color: #555; font-size: 1rem; margin-bottom: 24px;">Thank you for choosing <b>PGify</b> for your stay. We look forward to hosting you!</p>
                  <a href="https://pgify.vercel.app/bookings" style="display: inline-block; background: #10b981; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold; font-size: 1rem; margin-top: 12px;">View My Bookings</a>
                </div>
                <div style="background: #f4f8fb; padding: 16px; text-align: center; color: #aaa; font-size: 0.9rem;">&copy; ${new Date().getFullYear()} PGify</div>
              </div>
            </div>
          `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully!" });

  } catch (error) {
      res.status(500).json({ success: false, message: "Error sending email", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Forgot Password - Request Reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with that email.' });
    }
    // Remove any existing reset tokens for this user
    await ResetToken.deleteMany({ user: user._id });
    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await new ResetToken({ user: user._id, token, expiresAt }).save();
    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; padding: 32px;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; overflow: hidden;">
            <div style="background: #10b981; padding: 24px 0; text-align: center;">
              <img src='https://pgify.vercel.app/mainlogo.png' alt='PGify Logo' style='height: 40px; margin-bottom: 8px;' />
              <h2 style="color: #fff; margin: 0; font-size: 1.5rem;">Password Reset</h2>
            </div>
            <div style="padding: 32px 24px; text-align: center;">
              <p style="color: #222; font-size: 1.1rem; margin-bottom: 16px;">You requested a password reset for your PGify account.</p>
              <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold; font-size: 1rem; margin-top: 12px;">Reset Password</a>
              <p style="color: #888; font-size: 0.95rem; margin-top: 24px;">If you did not request this, you can safely ignore this email.</p>
              <p style="color: #888; font-size: 0.95rem;">This link will expire in 15 minutes.</p>
            </div>
            <div style="background: #f4f8fb; padding: 16px; text-align: center; color: #aaa; font-size: 0.9rem;">&copy; ${new Date().getFullYear()} PGify</div>
          </div>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending reset email', error: error.message });
  }
});

// Reset Password - Set New Password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const resetToken = await ResetToken.findOne({ token });
    if (!resetToken || resetToken.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }
    const user = await User.findById(resetToken.user);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    await ResetToken.deleteOne({ _id: resetToken._id });
    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;
