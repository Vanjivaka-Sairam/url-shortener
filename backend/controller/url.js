import shortid from "shortid";
import URL from "../models/url.js";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

async function handleCreateShortUrl(req, res) {
    try {
        const shortId = shortid();
        const body = req.body;

        if(!body.url) {
            return res.status(400).json({ error: "URL is required" });
        }

        // Calculate expiration date (30 days from now by default)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const url = await URL.create({
            shortID: shortId,
            redirectURL: body.url,
            visithistory: [],
            expiresAt,
            isActive: true
        });

        return res.json({ 
            shortUrl: `http://localhost:3000/${shortId}`,
            originalUrl: body.url,
            expiresAt: url.expiresAt
        });
    } catch (error) {
        console.error("Error creating short URL:", error);
        return res.status(500).json({ error: "Failed to create short URL" });
    }
}

async function handleGetUrls(req, res) {
    try {
        const urls = await URL.find({}, { 
            shortID: 1, 
            redirectURL: 1, 
            visithistory: 1,
            createdAt: 1,
            expiresAt: 1,
            isActive: 1,
            totalClicks: 1
        }).sort({ createdAt: -1 });

        const formattedUrls = urls.map(url => ({
            id: url.shortID,
            shortUrl: `http://localhost:3000/${url.shortID}`,
            originalUrl: url.redirectURL,
            clicks: url.totalClicks,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
            isActive: url.isActive,
            deviceStats: getDeviceStats(url.visithistory),
            browserStats: getBrowserStats(url.visithistory),
            clicksOverTime: getClicksOverTime(url.visithistory)
        }));

        return res.json(formattedUrls);
    } catch (error) {
        console.error("Error fetching URLs:", error);
        return res.status(500).json({ error: "Failed to fetch URLs" });
    }
}

async function handleGetAnalytics(req, res) {
    try {
        const shortId = req.params.shortId;
        const result = await URL.findOne({ shortID: shortId });
        
        if (!result) {
            return res.status(404).json({ error: "URL not found" });
        }

        return res.json({
            totalClicks: result.totalClicks,
            deviceStats: getDeviceStats(result.visithistory),
            browserStats: getBrowserStats(result.visithistory),
            clicksOverTime: getClicksOverTime(result.visithistory),
            locationStats: getLocationStats(result.visithistory)
        });
    } catch (error) {
        console.error("Error getting analytics:", error);
        return res.status(500).json({ error: "Failed to get analytics" });
    }
}

async function handleRedirect(req, res) {
    try {
        const shortId = req.params.shortId;
        const url = await URL.findOne({ shortID: shortId, isActive: true });
        
        if (!url) {
            return res.status(404).json({ error: "URL not found or expired" });
        }

        // Check if URL is expired
        if (url.expiresAt && url.expiresAt < new Date()) {
            url.isActive = false;
            await url.save();
            return res.status(410).json({ error: "URL has expired" });
        }

        // Get visitor information
        const userAgent = new UAParser(req.headers['user-agent']);
        const ip = req.ip || req.connection.remoteAddress;
        const geo = geoip.lookup(ip);

        // Create visit record
        const visit = {
            timestamp: new Date(),
            deviceType: userAgent.getDevice().type || 'desktop',
            browser: userAgent.getBrowser().name,
            ip: ip,
            userAgent: req.headers['user-agent'],
            country: geo?.country,
            city: geo?.city
        };

        // Update URL document asynchronously
        URL.findByIdAndUpdate(
            url._id,
            { 
                $push: { visithistory: visit },
                $inc: { totalClicks: 1 }
            }
        ).exec();

        // Redirect immediately
        res.redirect(url.redirectURL);
    } catch (error) {
        console.error("Error redirecting:", error);
        res.status(500).json({ error: "Server error" });
    }
}

// Helper functions for analytics
function getDeviceStats(visits) {
    const stats = {};
    visits.forEach(visit => {
        const device = visit.deviceType || 'desktop';
        stats[device] = (stats[device] || 0) + 1;
    });
    return stats;
}

function getBrowserStats(visits) {
    const stats = {};
    visits.forEach(visit => {
        const browser = visit.browser || 'unknown';
        stats[browser] = (stats[browser] || 0) + 1;
    });
    return stats;
}

function getLocationStats(visits) {
    const stats = {};
    visits.forEach(visit => {
        const location = visit.country || 'unknown';
        stats[location] = (stats[location] || 0) + 1;
    });
    return stats;
}

function getClicksOverTime(visits) {
    const stats = {};
    visits.forEach(visit => {
        const date = visit.timestamp.toISOString().split('T')[0];
        stats[date] = (stats[date] || 0) + 1;
    });
    return stats;
}

export { 
    handleCreateShortUrl, 
    handleGetAnalytics, 
    handleGetUrls,
    handleRedirect 
};
