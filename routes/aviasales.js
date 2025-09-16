// import express from "express";
// import axios from "axios";
// import dotenv from "dotenv";

// // Load environment variables from the .env file
// dotenv.config();

// const router = express.Router();
// const TOKEN = process.env.AVIASALES_API_KEY;
// const API_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

// // GET /api/aviasales/prices?origin=MAD&destination=BCN&departure_at=2025-09&return_at=2025-10&limit=10
// router.get("/prices", async (req, res) => {
//   try {
//     // Check if the API key is set
//     if (!TOKEN) {
//       return res.status(500).json({
//         error: "Server configuration error: API key is not set.",
//       });
//     }

//     const {
//       origin,
//       destination,
//       departure_at,
//       return_at,
//       currency = "usd",
//       limit = 30,
//     } = req.query;

//     // Validate required input
//     if (!origin || !destination || !departure_at) {
//       return res.status(400).json({
//         error:
//           "Missing required query parameters: origin, destination, departure_at",
//       });
//     }

//     // Prepare the parameters for the API call
//     const params = {
//       origin: origin.toUpperCase(),
//       destination: destination.toUpperCase(),
//       departure_at,
//       token: TOKEN,
//       currency,
//       limit,
//       unique: false,
//       sorting: "price",
//       direct: false,
//     };

//     if (return_at) {
//       params.return_at = return_at;
//     }

//     const response = await axios.get(API_URL, {
//       params,
//     });

//     if (!response.data.success) {
//       return res.status(500).json({
//         error: "API request failed",
//         details: response.data.error || "Unknown error",
//       });
//     }

//     // The API returned multiple results, so we can send the whole array
//     res.json({ data: response.data.data });
//   } catch (error) {
//     console.error(
//       "Aviasales API error:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({
//       error: "Failed to fetch flight prices",
//       details: error.response?.data || error.message,
//     });
//   }
// });

// export default router;

import express from "express";
import fetch from "node-fetch";
import "dotenv/config";

const router = express.Router();

const SEARCH_API = "https://api.travelpayouts.com/v1/flight_search";
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN;

// POST /api/aviasales/search
router.post("/search", async (req, res) => {
  try {
    const {
      origin,
      destination,
      departure_at,
      return_at,
      currency,
      passengers,
      trip_class,
    } = req.body;

    console.log("REQ BODY:", req.body); // 👀 Debug

    // validate
    if (!origin || !destination || !departure_at) {
      return res
        .status(400)
        .json({ error: "Origin, destination and departure_at are required." });
    }

    const response = await fetch(SEARCH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": TOKEN,
      },
      body: JSON.stringify({
        origin,
        destination,
        departure_at,
        return_at,
        currency: currency || "usd",
        adults: passengers || 1,
        trip_class: trip_class || "Y",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
