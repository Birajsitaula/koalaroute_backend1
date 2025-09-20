import express from "express";
import fetch from "node-fetch";
import "dotenv/config";

const router = express.Router();

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;
const DUFFEL_API_URL = "https://api.duffel.com/air/offer_requests";

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

    const offerRequestBody = {
      data: {
        slices: [
          { origin, destination, departure_date: departure_at },
          ...(return_at
            ? [
                {
                  origin: destination,
                  destination: origin,
                  departure_date: return_at,
                },
              ]
            : []),
        ],
        passengers: Array(passengers).fill({ type: "adult" }),
        cabin_class: "economy",
      },
    };

    const offerRequestResp = await fetch(DUFFEL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(offerRequestBody),
    });

    const offerRequestData = await offerRequestResp.json();

    if (!offerRequestData.data?.id) {
      return res
        .status(400)
        .json({ msg: "Duffel API error", error: offerRequestData });
    }

    const offerRequestId = offerRequestData.data.id;

    const offersResp = await fetch(
      `https://api.duffel.com/air/offers?offer_request_id=${offerRequestId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${DUFFEL_API_KEY}`,
          "Duffel-Version": "v2",
        },
      }
    );

    const offersData = await offersResp.json();

    const formattedOffers = (offersData.data || []).map((offer) => ({
      offer_id: offer.id,
      airline: offer.slices[0]?.segments[0]?.marketing_carrier?.name,
      airline_logo:
        offer.slices[0]?.segments[0]?.marketing_carrier?.logo_symbol_url,
      price: { amount: offer.total_amount, currency: offer.total_currency },
      slices: offer.slices.map((slice) => ({
        origin: slice.origin?.iata_code,
        destination: slice.destination?.iata_code,
        segments: slice.segments.map((seg) => ({
          flight_number: `${seg.marketing_carrier?.iata_code}${seg.marketing_carrier_flight_number}`,
          origin: {
            airport: seg.origin?.name,
            city: seg.origin?.city_name,
            iata: seg.origin?.iata_code,
            departure_time: seg.departing_at,
          },
          destination: {
            airport: seg.destination?.name,
            city: seg.destination?.city_name,
            iata: seg.destination?.iata_code,
            arrival_time: seg.arriving_at,
          },
          duration: seg.duration,
        })),
      })),
      payment_requirements: offer.payment_requirements,
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
    const { offer_id, passengers, payment } = req.body;

    if (!offer_id || !passengers) {
      return res
        .status(400)
        .json({ msg: "Offer ID and passengers are required" });
    }

    const bookingBody = {
      data: {
        selected_offers: [offer_id],
        passengers: passengers.map((p, i) => ({
          id: p.id || `passenger_${i + 1}`,
          title: p.title,
          given_name: p.given_name,
          family_name: p.family_name,
          gender: p.gender,
          born_on: p.born_on,
          email: p.email,
          phone_number: p.phone_number,
        })),
        payments: [
          {
            type: "balance", // only in test mode
            amount: payment.amount,
            currency: payment.currency,
          },
        ],
      },
    };

    const resp = await fetch("https://api.duffel.com/air/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingBody),
    });

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// =============================
// 📦 Step 3: Get Booking Details by ID
// =============================
router.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resp = await fetch(`https://api.duffel.com/air/orders/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": "v2",
      },
    });

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// =============================
// 📋 Step 4: List All Orders
// =============================
router.get("/orders", async (req, res) => {
  try {
    const resp = await fetch("https://api.duffel.com/air/orders", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": "v2",
      },
    });

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

export default router;
