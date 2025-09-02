// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
// import { config } from "dotenv";
// import AuthRouter from "./routes/auth.js";
// import ChatRouter from "./routes/chat.js";
// import koalaRouter from "./routes/koalaroutes.js";
// import contactRouter from "./routes/contact.js";

// config({
//   path: "./.env",
// });

// const app = express();
// app.use(cors({ origin: "*" }));
// app.use(express.json());

// const PORT = process.env.PORT;

// const mongoUri = process.env.MONGO_URI;
// if (!mongoUri) console.error("❌ MONGO_URI not defined");

// mongoose
//   .connect(mongoUri)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// app.use("/api/auth", AuthRouter);
// app.use("/api/chat", ChatRouter);
// app.use("/api/koalaroute", koalaRouter);
// app.use("/api/contact", contactRouter);

// app.listen(PORT, () =>
//   console.log(`App listening on http://localhost:${PORT}`)
// );

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import koalaRoute from "./routes/koalaroute.js";
import contactRoutes from "./routes/contact.js";
import chatRouter from "./app/api/chat/route.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRoutes);
app.use("/api/koalaroute", koalaRoute);
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
