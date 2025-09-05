import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Otp from "../models/Otp.js"; // New model
import "dotenv/config";

const router = express.Router();

// ================== RATE LIMIT (prevent OTP spam) ==================
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 OTP requests per IP
  message: {
    msg: "Too many OTP requests from this IP. Please try again later.",
  },
});

// ================== NODEMAILER CONFIG ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASSWORD, // Gmail App Password
  },
});

// ================== PASSWORD VALIDATION ==================
function validatePassword(password) {
  // At least 8 chars, one uppercase, one lowercase, one digit, one special char
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// ================== SEND OTP ==================
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "User already exists. Please login." });
    }

    // ✅ Limit OTP request frequency (1/minute per email)
    const recentOtp = await Otp.findOne({ email });
    if (recentOtp && Date.now() - recentOtp.createdAt < 60 * 1000) {
      return res
        .status(429)
        .json({ msg: "Please wait before requesting another OTP." });
    }

    // ✅ Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await Otp.findOneAndUpdate(
      { email },
      {
        email,
        otp: hashedOtp,
        attempts: 0,
        createdAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    // ✅ Send OTP via email
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otpCode}. It expires in 5 minutes.`,
    });

    res.json({ msg: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ================== SIGNUP ==================
router.post("/signup", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // ✅ Password strength validation
    if (!validatePassword(password)) {
      return res.status(400).json({
        msg: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.",
      });
    }

    // ✅ Check OTP
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ msg: "OTP not found. Please request again." });
    }

    // ✅ Check OTP expiry (5 min)
    if (Date.now() - otpRecord.createdAt > 5 * 60 * 1000) {
      await Otp.deleteOne({ email });
      return res
        .status(400)
        .json({ msg: "OTP expired. Please request again." });
    }

    // ✅ Check OTP attempts
    if (otpRecord.attempts >= 3) {
      await Otp.deleteOne({ email });
      return res
        .status(400)
        .json({ msg: "Too many failed attempts. Please request new OTP." });
    }

    // ✅ Verify OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // ✅ Delete OTP after success
    await Otp.deleteOne({ email });

    // ✅ Check if user exists before creating
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "User already exists. Please login." });
    }

    // ✅ Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.json({ msg: "✅ Account created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== FORGOT PASSWORD ==================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Still return 200 to prevent email enumeration attacks
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Generate reset token (JWT, expires in 15 minutes)
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send reset email
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: "Reset Your Password - KoalaRoute AI",
      text: `Click the link to reset your password: ${resetLink} \nThis link expires in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6fa5;">Password Reset Request</h2>
          <p>You requested to reset your password for your KoalaRoute AI account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4a6fa5; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from KoalaRoute AI.</p>
        </div>
      `,
    });

    res.json({ message: "Password reset link sent to your email ✅" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Failed to send reset link" });
  }
});
// ================== RESET PASSWORD ==================
// Reset password endpoint
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user by ID from token
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ msg: "User not found." });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Reset token has expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Invalid reset token" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
