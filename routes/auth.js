import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import "dotenv/config";

const router = express.Router();

// Signup
// router.post("/signup", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser)
//       return res.status(400).json({ msg: "User already exists" });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = new User({ email, password: hashedPassword });
//     await newUser.save();

//     res.json({ msg: "User registered successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Temporary store for OTPs (in production use DB/Redis)
const otpStore = {};

// Step 1: Send OTP to email
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ msg: "User already exists" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP with expiry (5 minutes)
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL, // your Gmail
        pass: process.env.ADMIN_PASSWORD, // App password
      },
    });

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: "Your Verification Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ msg: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify OTP and create account
router.post("/signup", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const record = otpStore[email];
    if (!record)
      return res
        .status(400)
        .json({ msg: "No OTP found. Please request again." });
    if (record.expires < Date.now())
      return res
        .status(400)
        .json({ msg: "OTP expired. Please request again." });
    if (record.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });

    // OTP is valid -> create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    // Delete OTP after success
    delete otpStore[email];

    res.json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
