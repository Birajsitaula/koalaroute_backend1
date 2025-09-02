// import express from "express";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import cors from "cors";
// import authRoutes from "./routes/auth.js";
// import koalaRoute from "./routes/koalaroutes.js";
// import contactRoutes from "./routes/contact.js";
// import chatRouter from "./app/api/chat/route.js";

// dotenv.config();
// const app = express();

// // Middleware
// app.use(cors({ origin: "*", credentials: true }));
// app.use(express.json());

// // Routes
// app.use("/api/chat", chatRouter);
// app.use("/api/auth", authRoutes);
// app.use("/api/koalaroute", koalaRoute);
// app.use("/api/contact", contactRoutes);

// // MongoDB connection
// const mongoUri = process.env.MONGO_URI;
// if (!mongoUri) {
//   console.error("❌ MONGO_URI is not defined. Did you set it in Railway?");
//   process.exit(1);
// }

// mongoose
//   .connect(mongoUri)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import koalaRoute from "./routes/koalaroutes.js";
import contactRoutes from "./routes/contact.js";
import chatRouter from "./app/api/chat/route.js";

dotenv.config();
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://koalaroute-backend1.onrender.com",
    "https://koalaroute-frontend-izo1.vercel.app/", // Replace with your actual frontend domain
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRoutes);
app.use("/api/koalaroute", koalaRoute);
app.use("/api/contact", contactRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

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
