// import { Router as ExpressRouter } from "express";

// const router = ExpressRouter();

// router.get("/", (req, res) => {
//   res.json({ msg: "KoalaRoute is working!" });
// });

// router.post("/query", (req, res) => {
//   const { user_query } = req.body;
//   res.json({ reply: `You asked: ${user_query}` });
// });

// router.get("/dashboard", (req, res) => {
//   res.json({
//     msg: "Welcome to KoalaRoute Dashboard 🚀",
//     // userId: req.user.id,
//   });
// });

// export default router;

import express from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Protected dashboard route
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    msg: "Welcome to KoalaRoute Dashboard 🚀",
    // userId: req.user.id,
  });
});

export default router;
