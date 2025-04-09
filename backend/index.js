import express from "express";
import urlRoute from "./routes/url.js";
import authRoute from "./routes/auth.js";
import connectToMongoDB from "./connect.js";
import URL from "./models/url.js";
import cors from "cors";
import { handleRedirect } from "./controller/url.js";
import { initializeDefaultUser } from "./controller/auth.js";

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectToMongoDB("mongodb://localhost:27017/shorturl")
  .then(async () => {
    console.log("Connected to MongoDB");
    // Initialize default user
    await initializeDefaultUser();
  })
  .catch((err) => console.log("MongoDB connection error:", err));

// Routes
app.use("/api", urlRoute);
app.use("/api/auth", authRoute);

// Direct analytics route
app.get("/api/analytics/:shortId", async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const result = await URL.findOne({ shortID: shortId });
    
    if (!result) {
      return res.status(404).json({ error: "URL not found" });
    }
    
    return res.json({
      totalClicks: result.visithistory.length,
      analytics: result.visithistory,
    });
  } catch (error) {
    console.error("Error getting analytics:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Use the controller's handleRedirect function
app.get("/:shortId", handleRedirect);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
