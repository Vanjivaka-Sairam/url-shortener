import shortid from "shortid";
import URL from "../models/url.js";


async function handleCreateShortUrl(req, res) {
    const shortId = shortid();
    const body = req.body;

    if(!body.url) return res.status(400).json({ error: "url is required" });
    await URL.create({
        shortID: shortId,
        redirectURL: req.body.url,
        visithistory: [],
    });
    return res.json({ id: shortId });
}


async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;
    const result = await URL.findOne({ shortID: shortId });
    return res.json({
        totalClicks: result.visithistory.length,
        analytics: result.visithistory,
    });
}


export { handleCreateShortUrl, handleGetAnalytics};
