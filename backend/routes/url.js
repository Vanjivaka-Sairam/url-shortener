import express from "express";
import { handleCreateShortUrl, handleGetAnalytics, handleGetUrls, handleDeleteUrl, handleToggleUrlStatus } from "../controller/url.js";

const router = express.Router();

router.post("/url", handleCreateShortUrl);
router.get("/urls", handleGetUrls);
router.get("/analytics/:shortId", handleGetAnalytics);
router.delete("/url/:shortId", handleDeleteUrl);
router.patch("/url/:shortId/toggle", handleToggleUrlStatus);

export default router;


