// import express from "express";
// import fetch from "node-fetch";
// import crypto from "crypto";
// import { authMiddleware } from "../middleware/auth.js";
// import "dotenv/config";

// const router = express.Router();

// const SEARCH_API = "https://api.travelpayouts.com/v1/flight_search";
// const RESULTS_API = "https://api.travelpayouts.com/v1/flight_search_results";
// const TOKEN = process.env.AVIASALES_API_KEY;
// const MARKER = process.env.AVIASALES_MARKER;

// // Correct signature generation function
// function generateSignature(params, token) {
//   const flattenValues = [];

//   // Order matters: marker, host, user_ip, locale, trip_class, passengers, segments
//   flattenValues.push(params.marker);
//   flattenValues.push(params.host);
//   flattenValues.push(params.user_ip);
//   flattenValues.push(params.locale);
//   flattenValues.push(params.trip_class);

//   flattenValues.push(params.passengers.adults);
//   flattenValues.push(params.passengers.children);
//   flattenValues.push(params.passengers.infants);

//   params.segments.forEach((seg) => {
//     flattenValues.push(seg.origin);
//     flattenValues.push(seg.destination);
//     flattenValues.push(seg.date);
//   });

//   const stringToHash = `${token}:${flattenValues.join(":")}`;
//   return crypto.createHash("md5").update(stringToHash).digest("hex");
// }

// // Helper to safely parse API JSON
// async function safeJsonParse(response) {
//   const text = await response.text();
//   if (text.includes("Unauthorized")) {
//     throw new Error("API authentication failed: Unauthorized");
//   }
//   try {
//     return JSON.parse(text);
//   } catch {
//     throw new Error(`Invalid API response: ${text.substring(0, 100)}...`);
//   }
// }

// // Root endpoint
// router.get("/", (req, res) => {
//   res.json({ msg: "Welcome to KoalaRoute API!" });
// });

// // Dashboard endpoint (protected)
// router.get("/dashboard", authMiddleware, (req, res) => {
//   res.json({ msg: "Welcome back!", userId: req.user.id });
// });

// // Flight search endpoint
// router.post("/flights", authMiddleware, async (req, res) => {
//   try {
//     if (!TOKEN || !MARKER) {
//       return res.status(500).json({
//         error: "Server configuration error: API key or marker missing",
//       });
//     }

//     const {
//       origin,
//       destination,
//       departure_at,
//       return_at,
//       currency = "usd",
//       passengers = 1,
//       trip_class = "Y",
//     } = req.body;

//     if (!origin || !destination || !departure_at) {
//       return res.status(400).json({
//         error: "Origin, destination, and departure date are required",
//       });
//     }

//     // Prepare segments
//     const segments = [
//       {
//         origin: origin.toUpperCase(),
//         destination: destination.toUpperCase(),
//         date: departure_at,
//       },
//     ];
//     if (return_at) {
//       segments.push({
//         origin: destination.toUpperCase(),
//         destination: origin.toUpperCase(),
//         date: return_at,
//       });
//     }

//     const requestParams = {
//       marker: MARKER,
//       host: req.headers.host || "localhost",
//       user_ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
//       locale: "en",
//       trip_class: trip_class.toUpperCase(),
//       passengers: { adults: parseInt(passengers), children: 0, infants: 0 },
//       segments: segments,
//     };

//     requestParams.signature = generateSignature(requestParams, TOKEN);

//     const searchResponse = await fetch(SEARCH_API, {
//       method: "POST",
//       headers: { "Content-Type": "application/json", "X-Access-Token": TOKEN },
//       body: JSON.stringify(requestParams),
//     });

//     if (searchResponse.status === 401) {
//       return res.status(401).json({ error: "API authentication failed" });
//     }

//     const searchData = await safeJsonParse(searchResponse);
//     if (!searchData.search_id) {
//       return res.status(500).json({ error: "No search ID returned from API" });
//     }

//     const searchId = searchData.search_id;

//     // Polling for results
//     let attempts = 0;
//     const maxAttempts = 12; // 5s interval × 12 = 60s
//     let results = null;

//     while (attempts < maxAttempts && !results) {
//       attempts++;
//       await new Promise((r) => setTimeout(r, 5000));

//       const resultsResponse = await fetch(`${RESULTS_API}?uuid=${searchId}`, {
//         headers: {
//           "Accept-Encoding": "gzip, deflate",
//           "X-Access-Token": TOKEN,
//         },
//       });

//       const resultsData = await safeJsonParse(resultsResponse);

//       if (
//         resultsResponse.ok &&
//         Array.isArray(resultsData) &&
//         resultsData.length > 0 &&
//         !resultsData[0].search_id
//       ) {
//         results = resultsData;
//         break;
//       }
//     }

//     if (!results) {
//       return res
//         .status(408)
//         .json({ error: "Flight search timeout. Please try again later." });
//     }

//     // Currency conversion (example rates)
//     const conversionRates = { usd: 0.011, eur: 0.01, gbp: 0.009 };
//     const processedResults = results.map((flight) => {
//       const rate = conversionRates[currency.toLowerCase()] || 1;
//       return {
//         ...flight,
//         price: (flight.price * rate * parseInt(passengers)).toFixed(2),
//         currency: currency.toUpperCase(),
//         passengers: parseInt(passengers),
//       };
//     });

//     res.json({ search_id: searchId, data: processedResults });
//   } catch (err) {
//     console.error("Flight API Error:", err.message);
//     res
//       .status(err.message.includes("authentication") ? 401 : 500)
//       .json({ error: err.message });
//   }
// });

// // Poll flight results by search ID
// router.get("/flights/:searchId", authMiddleware, async (req, res) => {
//   try {
//     const { searchId } = req.params;

//     const resultsResponse = await fetch(`${RESULTS_API}?uuid=${searchId}`, {
//       headers: { "Accept-Encoding": "gzip, deflate", "X-Access-Token": TOKEN },
//     });

//     if (resultsResponse.status === 401) {
//       return res.status(401).json({ error: "API authentication failed" });
//     }

//     const resultsData = await safeJsonParse(resultsResponse);
//     if (!resultsResponse.ok) {
//       return res.status(resultsResponse.status).json({
//         error:
//           "Failed to fetch flight results: " +
//           (resultsData.error || "Unknown error"),
//       });
//     }

//     res.json({ data: resultsData });
//   } catch (err) {
//     console.error("Flight Results API Error:", err.message);
//     res
//       .status(err.message.includes("authentication") ? 401 : 500)
//       .json({ error: err.message });
//   }
// });

// // Health check endpoint
// router.get("/health", async (req, res) => {
//   try {
//     if (!TOKEN || !MARKER) {
//       return res
//         .status(500)
//         .json({ status: "error", message: "API credentials not configured" });
//     }

//     const testResponse = await fetch(
//       "https://api.travelpayouts.com/v1/latest_currencies",
//       {
//         headers: { "X-Access-Token": TOKEN },
//       }
//     );

//     if (testResponse.status === 200) {
//       res.json({ status: "success", message: "API connectivity verified" });
//     } else if (testResponse.status === 401) {
//       res
//         .status(401)
//         .json({ status: "error", message: "API authentication failed" });
//     } else {
//       const text = await testResponse.text();
//       res
//         .status(testResponse.status)
//         .json({
//           status: "error",
//           message: `API returned status ${testResponse.status}`,
//           response: text.substring(0, 200),
//         });
//     }
//   } catch (err) {
//     res
//       .status(500)
//       .json({
//         status: "error",
//         message: "Failed to connect to API: " + err.message,
//       });
//   }
// });

// // Debug endpoint to check environment variables
// router.get("/debug", (req, res) => {
//   res.json({
//     tokenPresent: !!TOKEN,
//     markerPresent: !!MARKER,
//     tokenPrefix: TOKEN ? TOKEN.substring(0, 10) + "..." : "undefined",
//     marker: MARKER,
//   });
// });

// export default router;

import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth.js";
import "dotenv/config";

const router = express.Router();

const SEARCH_API = "https://api.travelpayouts.com/v1/flight_search";
const RESULTS_API = "https://api.travelpayouts.com/v1/flight_search_results";
const TOKEN = process.env.AVIASALES_API_KEY;
const MARKER = process.env.AVIASALES_MARKER;

// Generate Travelpayouts signature
function generateSignature(params, token) {
  const values = [];
  const processObject = (obj) => {
    const sortedKeys = Object.keys(obj).sort();
    for (const key of sortedKeys) {
      const value = obj[key];
      if (Array.isArray(value)) value.forEach((item) => processObject(item));
      else if (typeof value === "object" && value !== null)
        processObject(value);
      else values.push(value.toString());
    }
  };
  processObject(params);
  const valuesString = values.join(":");
  const stringToHash = `${token}:${valuesString}`;
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// Safe JSON parse helper
async function safeJsonParse(response) {
  const text = await response.text();
  if (text.includes("Unauthorized"))
    throw new Error("API authentication failed: Unauthorized");
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON. Raw Response:", text);
    throw new Error(`Invalid API response: ${text.substring(0, 150)}...`);
  }
}

// ✅ Root test
router.get("/", (req, res) => res.json({ msg: "Welcome to KoalaRoute API!" }));

// ✅ Dashboard (protected)
router.get("/dashboard", authMiddleware, (req, res) =>
  res.json({ msg: "Welcome back!", userId: req.user.id })
);

// ✅ Start flight search
router.post("/flights", authMiddleware, async (req, res) => {
  try {
    if (!TOKEN || !MARKER)
      return res.status(500).json({ error: "API key or marker missing" });

    const {
      origin,
      destination,
      departure_at,
      return_at,
      passengers = 1,
      trip_class = "Y",
    } = req.body;

    if (!origin || !destination || !departure_at) {
      return res
        .status(400)
        .json({
          error: "Origin, destination, and departure date are required",
        });
    }

    const segments = [
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        date: departure_at,
      },
    ];
    if (return_at) {
      segments.push({
        origin: destination.toUpperCase(),
        destination: origin.toUpperCase(),
        date: return_at,
      });
    }

    const paramsForSignature = {
      marker: MARKER,
      host: process.env.AVIASALES_HOST || req.headers.host || "localhost",
      user_ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
      locale: "en",
      trip_class: trip_class.toUpperCase(),
      passengers: {
        adults: parseInt(passengers) || 1,
        children: 0,
        infants: 0,
      },
      segments,
    };

    const requestPayload = {
      ...paramsForSignature,
      signature: generateSignature(paramsForSignature, TOKEN),
    };

    const searchResponse = await fetch(SEARCH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": TOKEN,
      },
      body: JSON.stringify(requestPayload),
    });

    const searchData = await safeJsonParse(searchResponse);

    if (!searchData.search_id)
      throw new Error("API did not return a search_id");

    // ✅ Send search_id back to frontend
    res.json({ search_id: searchData.search_id });
  } catch (err) {
    console.error("Flight Init Error:", err.message);
    res
      .status(err.message.includes("authentication") ? 401 : 500)
      .json({ error: err.message });
  }
});

// ✅ Poll results
router.get("/flights/:searchId", authMiddleware, async (req, res) => {
  try {
    const { searchId } = req.params;
    const { currency = "USD", passengers = 1 } = req.query;

    const resultsResponse = await fetch(`${RESULTS_API}?uuid=${searchId}`, {
      headers: {
        "Accept-Encoding": "gzip, deflate",
        "X-Access-Token": TOKEN,
      },
    });

    const resultsData = await safeJsonParse(resultsResponse);
    console.log(
      "Raw Travelpayouts Results:",
      JSON.stringify(resultsData, null, 2)
    );

    const flightsArray = Array.isArray(resultsData.proposals)
      ? resultsData.proposals
      : [];

    if (!flightsArray.length) {
      return res.json({
        status: "pending",
        proposals: [],
        message: "Results not ready yet, please keep polling.",
      });
    }

    // ✅ Normalize data so frontend can read proposals
    const conversionRates = { USD: 1, EUR: 0.9, GBP: 0.8 };
    const proposals = flightsArray.map((flight) => ({
      airline: flight.airline || "N/A",
      departure_at: flight.departure_at || "N/A",
      return_at: flight.return_at || "N/A",
      origin: flight.origin || "N/A",
      destination: flight.destination || "N/A",
      price: flight.unified_price
        ? (
            flight.unified_price *
            (conversionRates[currency.toUpperCase()] || 1) *
            parseInt(passengers)
          ).toFixed(2)
        : "N/A",
      currency: currency.toUpperCase(),
      passengers: parseInt(passengers),
    }));

    return res.json({ status: "complete", proposals });
  } catch (err) {
    console.error("Flight Poll Error:", err.message);
    res
      .status(err.message.includes("authentication") ? 401 : 500)
      .json({ error: err.message });
  }
});

// ✅ Health/debug
router.get("/health", (req, res) => res.json({ status: "ok" }));
router.get("/debug", (req, res) =>
  res.json({ tokenPresent: !!TOKEN, markerPresent: !!MARKER })
);

export default router;
