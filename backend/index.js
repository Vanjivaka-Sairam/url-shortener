import express from "express";
import urlRoute from "./routes/url.js";
import authRoute from "./routes/auth.js";
import connectToMongoDB from "./connect.js";
import URL from "./models/url.js";
import cors from "cors";
import { handleRedirect } from "./controller/url.js";
import { initializeDefaultUser } from "./controller/auth.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',  // Allow all origins for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));
app.use(express.json());

// Root route for API health check
app.get('/', (req, res) => {
  res.json({
    message: 'URL Shortener API is running',
    status: 'ok',
    endpoints: {
      auth: '/api/auth',
      urls: '/api',
      redirect: '/:shortId'
    }
  });
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/shorturl";
connectToMongoDB(mongoURI)
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
