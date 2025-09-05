import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Otp from "../models/Otp.js"; // New model
import "dotenv/config";

const router = express.Router();

// Configure nodemailer (use Gmail App Password or better: SendGrid/Mailgun)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL, // admin Gmail
    pass: process.env.ADMIN_PASSWORD, // Gmail App Password
  },
});

// ================== SEND OTP ==================
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "User already exists. Please login." });
    }

    // ✅ Limit OTP request frequency (1/minute)
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

    // ✅ Check if OTP exists
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

    // ✅ Check failed attempts
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

export default router;
