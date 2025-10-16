import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import cors from "cors";
const router = express.Router();

// Add CORS middleware
router.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ========== Helper: Get Amadeus Token ==========
async function getAccessToken() {
  const res = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error_description || "Failed to get Amadeus token");
  return data.access_token;
}

// ========== STEP 1: Search Flights ==========
router.post("/flights", async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, adults } = req.body;
    const token = await getAccessToken();

    const url = new URL(
      "https://test.api.amadeus.com/v2/shopping/flight-offers"
    );
    url.search = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      ...(returnDate && { returnDate }),
      adults: adults || 1,
      currencyCode: "USD",
      max: 5,
    });

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Amadeus flight search error:", data);
      return res.status(400).json({ error: data });
    }

    res.json({ flights: data.data });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ========== STEP 2: Flight Booking ==========
router.post("/book", async (req, res) => {
  try {
    const { flightOffer, travelerInfo } = req.body;
    const token = await getAccessToken();

    // Create flight order (booking)
    const response = await fetch(
      "https://test.api.amadeus.com/v1/booking/flight-orders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            type: "flight-order",
            flightOffers: [flightOffer],
            travelers: [
              {
                id: "1",
                dateOfBirth: travelerInfo.dateOfBirth,
                name: {
                  firstName: travelerInfo.firstName,
                  lastName: travelerInfo.lastName,
                },
                gender: travelerInfo.gender,
                contact: {
                  emailAddress: travelerInfo.email,
                  phones: [
                    {
                      deviceType: "MOBILE",
                      countryCallingCode: "1",
                      number: travelerInfo.phone,
                    },
                  ],
                },
                documents: [
                  {
                    documentType: "PASSPORT",
                    number: travelerInfo.passportNumber,
                    expiryDate: travelerInfo.passportExpiry,
                    issuanceCountry: travelerInfo.passportCountry,
                    nationality: travelerInfo.passportCountry,
                    holder: true,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Amadeus booking error:", data);
      return res.status(400).json({ error: data });
    }

    res.json({ booking: data.data });
  } catch (err) {
    console.error("Booking error:", err.message);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

export default router;
