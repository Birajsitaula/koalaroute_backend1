// routes/flights.js
import express from "express";
import axios from "axios";
import { generateSignature } from "../utils/signature.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const { origin, destination, currency } = req.query;

    // Load API Key and Secret from .env
    const apiToken = process.env.TRAVELPAYOUTS_API_KEY;
    const secret = process.env.TRAVELPAYOUTS_SECRET;

    // Generate Signature
    const signature = generateSignature(apiToken, secret);

    const response = await axios.get(
      `https://api.travelpayouts.com/v1/prices/cheap`,
      {
        params: {
          origin,
          destination,
          currency: currency || "usd",
          signature,
        },
        headers: {
          "X-Access-Token": apiToken,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("API call failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Flight search failed" });
  }
});

export default router;
