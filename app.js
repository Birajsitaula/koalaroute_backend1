import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import duffelFlights from "./routes/duffelFlights.js";
import hotelRoutes from "./routes/hotelRoutes.js";

import contactRoutes from "./routes/contact.js";
import chatRouter from "./app/api/chat/route.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/koalaroute", duffelFlights);
app.use("/api", duffelFlights);
app.use("/api/chat", chatRouter);
app.use("/api/contact", contactRoutes);
app.use("/api", hotelRoutes);

// ... other routes

// Simple health check route for debugging
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ FATAL ERROR: MONGO_URI is not defined.");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected."))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// **IMPORTANT**: Use Render's port or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is live and listening on port ${PORT}`);
});

// Export app for testing or further configuration
