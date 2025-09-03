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

const API_URL = "https://api.travelpayouts.com/v1";
const API_KEY = process.env.AVIASALES_API_KEY;

// POST /api/flights/search
router.post("/search", async (req, res) => {
  try {
    const {
      origin,
      destination,
      depart_date,
      return_date,
      adults = 1,
      children = 0,
      infants = 0,
      trip_class = 0, // 0=Economy, 1=Business, 2=First
      currency = "usd",
    } = req.body;

    if (!origin || !destination || !depart_date) {
      return res
        .status(400)
        .json({ error: "Origin, destination, and depart_date are required" });
    }

    // Step 1: Start a search
    const startRes = await axios.post(
      `${API_URL}/flight_search`,
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        depart_date,
        return_date,
        adults,
        children,
        infants,
        trip_class,
        currency,
        token: API_KEY,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const searchId = startRes.data?.search_id;
    if (!searchId) {
      return res.status(500).json({ error: "No search_id returned" });
    }

    console.log("Search started with ID:", searchId);

    // Step 2: Poll for results
    let attempts = 0;
    const maxAttempts = 10;
    let flights = [];

    while (attempts < maxAttempts) {
      attempts++;

      const pollRes = await axios.get(
        `${API_URL}/flight_search_results?uuid=${searchId}&token=${API_KEY}`
      );

      if (pollRes.data?.success && pollRes.data?.data?.length > 0) {
        flights = pollRes.data.data;
        break;
      }

      console.log(`Polling attempt ${attempts}, no results yet...`);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3 sec
    }

    if (flights.length === 0) {
      return res.status(404).json({ error: "No flights found after polling" });
    }

    res.json({ flights });
  } catch (err) {
    console.error("Aviasales API error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Flight search failed",
      details: err.response?.data || err.message,
    });
  }
});

export default router;
