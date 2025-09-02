import express from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Protected dashboard route
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    msg: "Welcome to KoalaRoute Dashboard 🚀",
    // userId: req.user.id,
    // this is a test
  });
});

export default router;
