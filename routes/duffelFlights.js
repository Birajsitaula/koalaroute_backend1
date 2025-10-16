import express from "express";
import fetch from "node-fetch";
import "dotenv/config";

const router = express.Router();

// =========================
// 🔐 Amadeus credentials
// =========================
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

// Get access token from Amadeus
async function getAmadeusAccessToken() {
  const resp = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_CLIENT_ID,
        client_secret: AMADEUS_CLIENT_SECRET,
      }),
    }
  );

  const data = await resp.json();
  if (!data.access_token) throw new Error("Failed to get Amadeus access token");
  return data.access_token;
}

// =============================
// 🔎 Step 1: Search Flights
// =============================
router.post("/flights", async (req, res) => {
  try {
    const {
      origin,
      destination,
      departure_at,
      return_at,
      passengers = 1,
    } = req.body;

    if (!origin || !destination || !departure_at) {
      return res
        .status(400)
        .json({ msg: "Origin, destination, and departure date are required" });
    }

    const token = await getAmadeusAccessToken();

    const searchParams = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departure_at,
      adults: passengers.toString(),
      currencyCode: "USD",
    });

    if (return_at) searchParams.append("returnDate", return_at);

    const resp = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await resp.json();

    if (!data.data) {
      return res.status(400).json({ msg: "Amadeus API error", error: data });
    }

    const formattedOffers = data.data.map((offer) => ({
      offer_id: offer.id,
      price: {
        amount: offer.price.total,
        currency: offer.price.currency,
      },
      itineraries: offer.itineraries.map((itinerary) => ({
        duration: itinerary.duration,
        segments: itinerary.segments.map((seg) => ({
          flight_number: `${seg.carrierCode}${seg.number}`,
          origin: {
            iata: seg.departure.iataCode,
            at: seg.departure.at,
          },
          destination: {
            iata: seg.arrival.iataCode,
            at: seg.arrival.at,
          },
          carrier: seg.carrierCode,
          aircraft: seg.aircraft?.code,
        })),
      })),
    }));

    res.json({ status: "complete", offers: formattedOffers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// =============================
// 💳 Step 2: Book Flight
// =============================
router.post("/book", async (req, res) => {
  try {
    const { offer_id, passengers } = req.body;

    if (!offer_id || !passengers) {
      return res
        .status(400)
        .json({ msg: "Offer ID and passengers are required" });
    }

    const token = await getAmadeusAccessToken();

    // Step 1: Confirm the price (Flight Price endpoint)
    const priceConfirmResp = await fetch(
      "https://test.api.amadeus.com/v1/shopping/flight-offers/pricing",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            type: "flight-offers-pricing",
            flightOffers: [{ id: offer_id }],
          },
        }),
      }
    );

    const priceData = await priceConfirmResp.json();

    if (!priceData.data) {
      return res
        .status(400)
        .json({ msg: "Pricing confirmation failed", error: priceData });
    }

    // Step 2: Create the booking
    const bookingResp = await fetch(
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
            flightOffers: [priceData.data.flightOffers[0]],
            travelers: passengers.map((p, i) => ({
              id: `${i + 1}`,
              dateOfBirth: p.born_on,
              name: { firstName: p.given_name, lastName: p.family_name },
              gender: p.gender,
              contact: {
                emailAddress: p.email,
                phones: [
                  {
                    deviceType: "MOBILE",
                    countryCallingCode: "977",
                    number: p.phone_number,
                  },
                ],
              },
            })),
          },
        }),
      }
    );

    const bookingData = await bookingResp.json();
    res.json(bookingData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

export default router;
