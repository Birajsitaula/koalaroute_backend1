// import express from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import nodemailer from "nodemailer";
// import rateLimit from "express-rate-limit";
// import User from "../models/User.js";
// import Otp from "../models/Otp.js"; // New model
// import "dotenv/config";

// const router = express.Router();

// // ================== RATE LIMIT (prevent OTP spam) ==================
// const otpLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // max 5 OTP requests per IP
//   message: {
//     msg: "Too many OTP requests from this IP. Please try again later.",
//   },
// });

// // ================== NODEMAILER CONFIG ==================
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.ADMIN_EMAIL,
//     pass: process.env.ADMIN_PASSWORD, // Gmail App Password
//   },
// });

// // ================== PASSWORD VALIDATION ==================
// function validatePassword(password) {
//   // At least 8 chars, one uppercase, one lowercase, one digit, one special char
//   const passwordRegex =
//     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//   return passwordRegex.test(password);
// }

// // ================== SEND OTP ==================
// router.post("/send-otp", otpLimiter, async (req, res) => {
//   try {
//     const { email } = req.body;

//     // ✅ Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ msg: "User already exists. Please login." });
//     }

//     // ✅ Limit OTP request frequency (1/minute per email)
//     const recentOtp = await Otp.findOne({ email });
//     if (recentOtp && Date.now() - recentOtp.createdAt < 60 * 1000) {
//       return res
//         .status(429)
//         .json({ msg: "Please wait before requesting another OTP." });
//     }

//     // ✅ Generate OTP
//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     const hashedOtp = await bcrypt.hash(otpCode, 10);

//     await Otp.findOneAndUpdate(
//       { email },
//       {
//         email,
//         otp: hashedOtp,
//         attempts: 0,
//         createdAt: Date.now(),
//       },
//       { upsert: true, new: true }
//     );

//     // ✅ Send OTP via email
//     await transporter.sendMail({
//       from: process.env.ADMIN_EMAIL,
//       to: email,
//       subject: "Your OTP Code",
//       text: `Your OTP code is: ${otpCode}. It expires in 5 minutes.`,
//     });

//     res.json({ msg: "OTP sent successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to send OTP" });
//   }
// });

// // ================== SIGNUP ==================
// router.post("/signup", async (req, res) => {
//   try {
//     const { email, password, otp } = req.body;

//     // ✅ Password strength validation
//     if (!validatePassword(password)) {
//       return res.status(400).json({
//         msg: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.",
//       });
//     }

//     // ✅ Check OTP
//     const otpRecord = await Otp.findOne({ email });
//     if (!otpRecord) {
//       return res
//         .status(400)
//         .json({ msg: "OTP not found. Please request again." });
//     }

//     // ✅ Check OTP expiry (5 min)
//     if (Date.now() - otpRecord.createdAt > 5 * 60 * 1000) {
//       await Otp.deleteOne({ email });
//       return res
//         .status(400)
//         .json({ msg: "OTP expired. Please request again." });
//     }

//     // ✅ Check OTP attempts
//     if (otpRecord.attempts >= 3) {
//       await Otp.deleteOne({ email });
//       return res
//         .status(400)
//         .json({ msg: "Too many failed attempts. Please request new OTP." });
//     }

//     // ✅ Verify OTP
//     const isMatch = await bcrypt.compare(otp, otpRecord.otp);
//     if (!isMatch) {
//       otpRecord.attempts += 1;
//       await otpRecord.save();
//       return res.status(400).json({ msg: "Invalid OTP" });
//     }

//     // ✅ Delete OTP after success
//     await Otp.deleteOne({ email });

//     // ✅ Check if user exists before creating
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ msg: "User already exists. Please login." });
//     }

//     // ✅ Hash password and create user
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = new User({ email, password: hashedPassword });
//     await newUser.save();

//     res.json({ msg: "✅ Account created successfully!" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Signup failed" });
//   }
// });

// // Login
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ msg: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1h",
//     });

//     res.json({ token, user: { id: user._id, email: user.email } });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;

import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";

const router = express.Router();

// ================== ENV CONFIG ==================
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"; // replace with env secret
const JWT_EXPIRES_IN = "1h"; // access token expiry

// ================== RATE LIMIT ==================
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    msg: "Too many OTP requests from this IP. Please try again later.",
  },
});

// ================== NODEMAILER CONFIG ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASSWORD,
  },
});

// ================== PASSWORD VALIDATION ==================
function validatePassword(password) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// ================== SEND OTP ==================
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ msg: "User already exists. Please login." });

    const recentOtp = await Otp.findOne({ email });
    if (recentOtp && Date.now() - recentOtp.createdAt < 60 * 1000) {
      return res
        .status(429)
        .json({ msg: "Please wait before requesting another OTP." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await Otp.findOneAndUpdate(
      { email },
      { email, otp: hashedOtp, attempts: 0, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otpCode}. It expires in 5 minutes.`,
    });

    res.json({ msg: "OTP sent successfully ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ================== SIGNUP ==================
router.post("/signup", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({
        msg: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.",
      });
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord)
      return res
        .status(400)
        .json({ msg: "OTP not found. Please request again." });
    if (Date.now() - otpRecord.createdAt > 5 * 60 * 1000) {
      await Otp.deleteOne({ email });
      return res
        .status(400)
        .json({ msg: "OTP expired. Please request again." });
    }
    if (otpRecord.attempts >= 3) {
      await Otp.deleteOne({ email });
      return res
        .status(400)
        .json({ msg: "Too many failed attempts. Please request new OTP." });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    await Otp.deleteOne({ email });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ msg: "User already exists. Please login." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.json({ msg: "✅ Account created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ================== LOGIN ==================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "User not found. Please signup." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect password." });

    // ✅ Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({ msg: "Login successful ✅", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================== PROTECTED ROUTE EXAMPLE ==================
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token provided." });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found." });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid or expired token." });
  }
});

export default router;
