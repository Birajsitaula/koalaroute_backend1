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

// import express from "express";
// import axios from "axios";
// import crypto from "crypto";

// const router = express.Router();

// const API_URL = "https://api.travelpayouts.com/v1/flight_search";
// const RESULTS_URL = "https://api.travelpayouts.com/v1/flight_search_results";

// const MARKER = process.env.AVIASALES_MARKER; // e.g., 662691
// const API_KEY = process.env.AVIASALES_API_KEY; // your API key (used as token and secret)
// const LOCALE = "en";

// // Generate MD5 signature dynamically using API_KEY as secret
// function generateSignature(marker, secret, host, userIp) {
//   const stringToHash = marker + secret + host + userIp;
//   return crypto.createHash("md5").update(stringToHash).digest("hex");
// }

// // Get user IP safely
// function getUserIp(req) {
//   return (
//     req.headers["x-forwarded-for"] || req.connection.remoteAddress || "0.0.0.0"
//   );
// }

// // POST /api/aviasales/search
// router.post("/search", async (req, res) => {
//   try {
//     const {
//       origin,
//       destination,
//       departure,
//       returnDate,
//       passengers = 1,
//       children = 0,
//       infants = 0,
//       tripClass = "Y",
//     } = req.body;

//     if (!origin || !destination || !departure) {
//       return res
//         .status(400)
//         .json({
//           error: "Origin, destination, and departure date are required",
//         });
//     }

//     // Passengers object
//     const passengersObj = { adults: passengers, children, infants };

//     // Build segments array
//     const segments = [
//       {
//         origin: origin.toUpperCase(),
//         destination: destination.toUpperCase(),
//         date: departure,
//       },
//     ];
//     if (returnDate) {
//       segments.push({
//         origin: destination.toUpperCase(),
//         destination: origin.toUpperCase(),
//         date: returnDate,
//       });
//     }

//     // Host & user IP
//     const host = req.headers.host || "localhost";
//     const userIp = getUserIp(req);

//     // Dynamic signature
//     const signature = generateSignature(MARKER, API_KEY, host, userIp);

//     // Build payload
//     const payload = {
//       signature,
//       marker: MARKER,
//       token: API_KEY,
//       host,
//       user_ip: userIp,
//       locale: LOCALE,
//       trip_class: tripClass,
//       passengers: passengersObj,
//       segments,
//     };

//     console.log("Aviasales search payload:", JSON.stringify(payload, null, 2));

//     // Step 1: Initialize search
//     const searchResponse = await axios.post(API_URL, payload, {
//       headers: { "Content-Type": "application/json" },
//     });

//     const searchId =
//       searchResponse.data?.search_id || searchResponse.data?.uuid;
//     if (!searchId) {
//       return res
//         .status(500)
//         .json({ error: "Failed to get search_id from Aviasales" });
//     }

//     console.log("Search initialized. search_id:", searchId);

//     // Step 2: Poll results
//     let attempts = 0;
//     const maxAttempts = 10;
//     let flights = [];

//     while (attempts < maxAttempts && flights.length === 0) {
//       attempts++;
//       try {
//         const resultsResponse = await axios.get(RESULTS_URL, {
//           params: { uuid: searchId },
//         });
//         flights = resultsResponse.data?.proposals || [];
//         if (flights.length === 0) {
//           console.log(`Polling attempt ${attempts}, no flights yet...`);
//           await new Promise((resolve) => setTimeout(resolve, 3000));
//         }
//       } catch (pollErr) {
//         console.log(`Polling attempt ${attempts} failed:`, pollErr.message);
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//       }
//     }

//     if (flights.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "No flights found after polling. Try again later." });
//     }

//     res.json({ data: flights });
//   } catch (err) {
//     console.error(
//       "Aviasales Search API error:",
//       err.response?.data || err.message
//     );
//     res.status(500).json({
//       error: "Flight search failed",
//       details: err.response?.data || err.message,
//     });
//   }
// });

// export default router;

import express from "express";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables from the .env file
dotenv.config();

const router = express.Router();

const API_URL = "https://api.travelpayouts.com/v1/flight_search";
const RESULTS_URL = "https://api.travelpayouts.com/v1/flight_search_results";

const MARKER = process.env.AVIASALES_MARKER;
const TOKEN = process.env.AVIASALES_TOKEN;
const LOCALE = "en";

// Logging to confirm environment variables are loaded
console.log("--- Debugging Environment Variables ---");
console.log("MARKER:", MARKER);
console.log("TOKEN:", TOKEN);
console.log("-------------------------------------");

/**
 * Generates the MD5 signature for the Aviasales API as per documentation.
 * This is a hash of the marker, your API token, and the payload's JSON string.
 * @param {object} payload - The request body object.
 * @param {string} token - Your personal access token.
 * @returns {string} The MD5 signature.
 */
function generateSignature(payload, token) {
  // Aviasales documentation is sometimes unclear. A common method is hashing the payload JSON string + the token.
  // The support message suggests hashing "all your request parameters and your API token".
  // Let's use the most common method for their signature-based APIs: hashing the entire payload as a string plus the token.
  const payloadString = JSON.stringify(payload);
  const stringToHash = `${payloadString}${token}`;
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// POST /api/aviasales/search
router.post("/search", async (req, res) => {
  try {
    if (!MARKER || !TOKEN) {
      console.error(
        "Missing AVIASALES_MARKER or AVIASALES_TOKEN environment variables."
      );
      return res.status(500).json({
        error: "Server configuration error: API keys are not set.",
      });
    }

    const {
      origin,
      destination,
      departure,
      returnDate,
      passengers,
      tripClass,
    } = req.body;

    if (!origin || !destination || !departure) {
      return res.status(400).json({
        error: "Origin, destination, and departure date are required",
      });
    }

    const payload = {
      marker: MARKER,
      locale: LOCALE,
      trip_class: tripClass,
      passengers: {
        adults: passengers.adults,
        children: passengers.children,
        infants: passengers.infants,
      },
      segments: [
        {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          date: departure,
        },
      ],
    };

    if (returnDate) {
      payload.segments.push({
        origin: destination.toUpperCase(),
        destination: origin.toUpperCase(),
        date: returnDate,
      });
    }

    // Generate the signature
    const signature = generateSignature(payload, TOKEN);
    
    // Add the signature to the final payload
    payload.signature = signature;

    console.log(
      "Initializing Aviasales search with payload:",
      JSON.stringify(payload, null, 2)
    );
    const searchResponse = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const searchId =
      searchResponse.data?.search_id || searchResponse.data?.uuid;

    if (!searchId) {
      return res.status(500).json({
        error: "Failed to get search_id from Aviasales",
        details: searchResponse.data || "No search ID received.",
      });
    }

    console.log("Search initialized. search_id:", searchId);

    let attempts = 0;
    const maxAttempts = 15;
    let flights = [];

    while (attempts < maxAttempts && flights.length === 0) {
      attempts++;
      try {
        const resultsResponse = await axios.get(RESULTS_URL, {
          params: { uuid: searchId },
        });

        const proposals = resultsResponse.data?.proposals;

        if (proposals) {
          flights = Object.values(proposals).flat();
          if (flights.length > 0) {
            console.log(`Flights found after ${attempts} attempts.`);
            break;
          }
        }

        console.log(`Polling attempt ${attempts}, no flights yet. Waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (pollErr) {
        console.error(`Polling attempt ${attempts} failed:`, pollErr.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    if (flights.length === 0) {
      return res.status(404).json({
        error: "No flights found after polling. Try again later.",
      });
    }

    const sortedFlights = flights.sort((a, b) => a.price - b.price);

    res.json({ data: sortedFlights });
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