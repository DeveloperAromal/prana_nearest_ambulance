// Import required modules
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

const app = express();
dotenv.config();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.URL;
const supabaseKey = process.env.KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample route
app.get("/", (req, res) => {
  res.send("Welcome to the Express.js Server with Supabase!");
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};
app.post("/ambulance", async (req, res) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required." });
  }

  try {
    const { data, error } = await supabase
      .from("ambulance")
      .select("phoneNumber, location, status, uuid");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No ambulances found." });
    }

    let nearestAmbulance = null;
    let minDistance = Infinity;

    data.forEach((ambulance) => {
      // Skip ambulances with status === 'Available'
      if (ambulance.status !== "Available") {
        return;
      }

      const ambLat = ambulance.location.latitude;
      const ambLon = ambulance.location.longitude;

      const dist = haversineDistance(latitude, longitude, ambLat, ambLon);

      if (dist < minDistance) {
        minDistance = dist;
        nearestAmbulance = {
          uuid: ambulance.uuid,
          phone: ambulance.phoneNumber,
          location: ambulance.location,
          distance_km: dist,
        };
      }
    });

    if (!nearestAmbulance) {
      return res.status(404).json({ message: "No active ambulances found." });
    }

    res.json({ nearestAmbulance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
