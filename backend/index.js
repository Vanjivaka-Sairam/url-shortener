import express from "express";
import urlRoute from "./routes/url.js";
import connectToMongoDB from "./connect.js";
import URL from "./models/url.js";
import cors from "cors";

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectToMongoDB("mongodb://localhost:27017/shorturl")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Routes
app.use("/api", urlRoute);

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

app.get("/:shortId", async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const url = await URL.findOneAndUpdate(
      { shortID: shortId }, 
      { $push: { visithistory: { timestamp: Date.now() } } },
      { new: true }
    );
    
    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }
    
    res.redirect(url.redirectURL);
  } catch (error) {
    console.error("Error redirecting:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
