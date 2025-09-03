// import express from "express";
// import axios from "axios";

// const router = express.Router();

// const API_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
// const API_KEY = process.env.AVIASALES_API_KEY;
// const MARKER = process.env.AVIASALES_MARKER;

// // Helper to add days to a date
// function addDays(dateStr, days) {
//   const date = new Date(dateStr);
//   date.setDate(date.getDate() + days);
//   return date.toISOString().split("T")[0];
// }

// router.post("/search", async (req, res) => {
//   try {
//     const {
//       origin,
//       destination,
//       departure_at,
//       return_at,
//       currency = "usd",
//       days_range = 2,
//     } = req.body;

//     if (!origin || !destination || !departure_at) {
//       return res.status(400).json({
//         error: "Origin, destination, and departure date are required",
//       });
//     }

//     const allFlights = [];

//     // Call API for departure date and +/- days_range
//     for (let offset = -days_range; offset <= days_range; offset++) {
//       const depDate = addDays(departure_at, offset);

//       const response = await axios.get(API_URL, {
//         params: {
//           origin: origin.toUpperCase(),
//           destination: destination.toUpperCase(),
//           departure_at: depDate,
//           return_at,
//           currency,
//           unique: false,
//           sorting: "price",
//           limit: 10,
//           marker: MARKER,
//           token: API_KEY,
//         },
//       });

//       const flightsData = response.data?.data;
//       if (flightsData) {
//         allFlights.push(...flightsData);
//       }
//     }

//     if (allFlights.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "No flights found for the given dates" });
//     }

//     res.json({ data: allFlights });
//   } catch (err) {
//     console.error("Aviasales API error:", err.response?.data || err.message);
//     res.status(500).json({
//       error: "Flight search failed",
//       details: err.response?.data || err.message,
//     });
//   }
// });
// // test comit

// export default router;

import express from "express";
import axios from "axios";

const router = express.Router();

const API_URL = "https://api.travelpayouts.com/aviasales/v3";
const API_KEY = process.env.AVIASALES_API_KEY;
const MARKER = process.env.AVIASALES_MARKER;

// Start a new search
router.post("/search", async (req, res) => {
  try {
    const {
      origin,
      destination,
      departure_at,
      return_at,
      currency = "usd",
      passengers = 1,
      trip_class = "Y",
    } = req.body;

    if (!origin || !destination || !departure_at) {
      return res.status(400).json({
        error: "Origin, destination, and departure date are required",
      });
    }

    // Step 1: Create a search
    const initSearch = await axios.post(
      `${API_URL}/search`,
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_at,
        return_at,
        currency,
        passengers,
        trip_class,
        marker: MARKER,
        token: API_KEY,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const searchId = initSearch.data?.search_id;
    if (!searchId) {
      return res.status(500).json({ error: "Failed to start search" });
    }

    // Step 2: Poll for results
    let attempts = 0;
    const maxAttempts = 10;
    let flights = [];

    while (attempts < maxAttempts) {
      attempts++;
      const pollRes = await axios.get(`${API_URL}/searches/${searchId}`, {
        params: { token: API_KEY },
      });

      if (pollRes.data?.data?.length > 0) {
        flights = pollRes.data.data;
        break;
      }

      // wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (flights.length === 0) {
      return res.status(404).json({ error: "No flights found" });
    }

    res.json({ data: flights });
  } catch (err) {
    console.error(
      "Aviasales Search API error:",
      err.response?.data || err.message
    );
    res.status(500).json({
      error: "Flight search failed",
      details: err.response?.data || err.message,
    });
  }
});

export default router;
