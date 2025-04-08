import express from "express";
import { handleCreateShortUrl, handleGetAnalytics, handleGetUrls } from "../controller/url.js";

const router = express.Router();

router.post("/shorten", handleCreateShortUrl);
router.get("/urls", handleGetUrls);
router.get("/analytics/:shortId", handleGetAnalytics);

export default router;


