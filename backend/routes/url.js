import express from "express";
import { handleCreateShortUrl, handleGetAnalytics, handleGetUrls, handleDeleteUrl, handleToggleUrlStatus } from "../controller/url.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Protected routes - require authentication
router.post("/url", auth, handleCreateShortUrl);
router.get("/urls", auth, handleGetUrls);
router.get("/analytics/:shortId", auth, handleGetAnalytics);
router.delete("/url/:shortId", auth, handleDeleteUrl);
router.patch("/url/:shortId/toggle", auth, handleToggleUrlStatus);

export default router;
