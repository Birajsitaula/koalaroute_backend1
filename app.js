import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import duffelFlights from "./routes/duffelFlights.js";

import contactRoutes from "./routes/contact.js";
import chatRouter from "./app/api/chat/route.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));

// some chages here
app.use(express.json());

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRoutes);

app.use("/api/duffel", duffelFlights);

app.use("/api/contact", contactRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ MONGO_URI is not defined. Did you set it in Railway?");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
