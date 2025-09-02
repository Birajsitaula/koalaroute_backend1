import express from "express";
import axios from "axios";

const router = express.Router();

const API_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
const API_KEY = process.env.AVIASALES_API_KEY;
const MARKER = process.env.AVIASALES_MARKER;

router.get("/search", async (req, res) => {
  try {
    const {
      origin,
      destination,
      departure_at,
      return_at,
      currency = "usd",
      limit = 10,
    } = req.query;

    if (!origin || !destination || !departure_at) {
      return res
        .status(400)
        .json({
          error: "Origin, destination, and departure date are required",
        });
    }

    const response = await axios.get(API_URL, {
      params: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_at,
        return_at,
        currency,
        unique: false,
        sorting: "price",
        limit,
        marker: MARKER,
        token: API_KEY,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Aviasales API error:", err.response?.data || err.message);
    res
      .status(500)
      .json({
        error: "Flight search failed",
        details: err.response?.data || err.message,
      });
  }
});

export default router;
