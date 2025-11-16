const express = require('express');

const router = express.Router();

const skeetRoutes = require('./skeetRoutes');
const threadRoutes = require('./threadRoutes');
const bskyController = require("@api/controllers/bskyController");
const settingsController = require("@api/controllers/settingsController");
const engagementController = require("@api/controllers/engagementController");
const configController = require("@api/controllers/configController");
const tenorController = require("@api/controllers/tenorController");
const bskyActionsController = require("@api/controllers/bskyActionsController");
const maintenanceController = require("@api/controllers/maintenanceController");
const mediaController = require("@api/controllers/mediaController");
const uploadController = require("@api/controllers/uploadController");
const credentialsController = require("@api/controllers/credentialsController");
const heartbeatController = require("@api/controllers/heartbeatController");
const previewController = require("@api/controllers/previewController");
const { sseHandler } = require("@core/services/events");

router.use('/skeets', skeetRoutes);
router.use('/threads', threadRoutes);

// Tenor GIF proxy
router.get("/tenor/featured", tenorController.featured);
router.get("/tenor/search", tenorController.search);
router.post("/tenor/download", tenorController.download);

// Engagement
router.get("/reactions/:skeetId", engagementController.getReactions);
router.get("/replies/:skeetId", engagementController.getReplies);
router.post("/engagement/refresh-many", engagementController.refreshMany);

// Settings
router.get("/settings/scheduler", settingsController.getSchedulerSettings);
router.put("/settings/scheduler", settingsController.updateSchedulerSettings);
router.get("/settings/client-polling", settingsController.getClientPollingSettings);
router.put("/settings/client-polling", settingsController.updateClientPollingSettings);

// Client config
router.get("/client-config", configController.getClientConfig);

// Link preview
router.get("/preview", previewController.getExternalPreview);

// Bluesky interactions
router.post("/bsky/like", bskyActionsController.like);
router.delete("/bsky/like", bskyActionsController.unlike);
router.post("/bsky/repost", bskyActionsController.repost);
router.delete("/bsky/repost", bskyActionsController.unrepost);

// Bluesky utility
router.get("/bsky/timeline", bskyController.getTimeline);
router.get("/bsky/reactions", bskyController.getReactions);
router.get("/bsky/thread", bskyController.getThread);
router.get("/bsky/notifications", bskyController.getNotifications);
router.post("/bsky/notifications/register-push", bskyController.registerPushSubscription);
router.post("/bsky/notifications/unregister-push", bskyController.unregisterPushSubscription);
router.post("/bsky/reply", bskyController.postReply);
router.post("/bsky/post", bskyController.postNow);
router.get("/bsky/search", bskyController.search);
router.get("/bsky/profile", bskyController.getProfile);
router.get("/bsky/feeds", bskyController.getFeeds);
router.post("/bsky/feeds/pin", bskyController.pinFeed);
router.delete("/bsky/feeds/pin", bskyController.unpinFeed);
router.patch("/bsky/feeds/pin-order", bskyController.reorderPinnedFeeds);

// Maintenance
router.post("/maintenance/cleanup-mastodon", maintenanceController.cleanupMastodon);

// Credentials
router.get("/config/credentials", credentialsController.getCredentials);
router.put("/config/credentials", credentialsController.updateCredentials);

// Heartbeat
router.post("/heartbeat", heartbeatController.postHeartbeat);

// Server-Sent Events
router.get('/events', sseHandler);

// Media
router.patch("/media/:mediaId", mediaController.updateMedia);
router.delete("/media/:mediaId", mediaController.deleteMedia);
router.patch("/skeet-media/:mediaId", mediaController.updateSkeetMedia);
router.delete("/skeet-media/:mediaId", mediaController.deleteSkeetMedia);

// Temp uploads
router.post("/uploads/temp", uploadController.uploadTemp);

module.exports = router;
