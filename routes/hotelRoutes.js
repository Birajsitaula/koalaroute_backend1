import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import cors from "cors";

const router = express.Router();

router.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 🔹 Get Amadeus Access Token
async function getAccessToken() {
  const response = await fetch(
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
  const data = await response.json();
  return data.access_token;
}

// 🔹 1. Get list of hotels by city code
router.get("/hotels/list", async (req, res) => {
  const { cityCode } = req.query;
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 2. Search hotel offers
router.get("/hotels", async (req, res) => {
  const { cityCode, adults, checkInDate, checkOutDate } = req.query;
  try {
    const token = await getAccessToken();
    const url = `https://test.api.amadeus.com/v3/shopping/hotel-offers?cityCode=${cityCode}&adults=${adults}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
