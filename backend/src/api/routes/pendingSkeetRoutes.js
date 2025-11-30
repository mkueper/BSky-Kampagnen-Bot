const express = require('express');
const router = express.Router();
const pendingSkeetController = require('@api/controllers/pendingSkeetController');

// Pending Skeets
router.get('/', pendingSkeetController.getPendingSkeets);
router.post('/:id/publish-once', pendingSkeetController.publishOnce);
router.post('/:id/discard', pendingSkeetController.discard);

module.exports = router;

