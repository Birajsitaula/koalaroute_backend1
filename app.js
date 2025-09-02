import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { config } from "dotenv";
import AuthRouter from "./routes/auth.js";
import ChatRouter from "./routes/chat.js";
import koalaRouter from "./routes/koala.js";
import contactRouter from "./routes/contact.js";

config({
  path: "./.env",
});

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT;

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) console.error("❌ MONGO_URI not defined");

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use("/api/auth", AuthRouter);
app.use("/api/chat", ChatRouter);
app.use("/api/koalaroute", koalaRouter);
app.use("/api/contact", contactRouter);

app.listen(PORT, () =>
  console.log(`App listening on http://localhost:${PORT}`)
);
