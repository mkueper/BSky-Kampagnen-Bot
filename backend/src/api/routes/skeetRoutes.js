const express = require('express');
const router = express.Router();
const skeetController = require('@api/controllers/skeetController');
const importExportController = require('@api/controllers/importExportController');
const { addSkeetMedia, uploadMiddleware } = require('@api/controllers/mediaController');
const skeetHistoryController = require('@api/controllers/skeetHistoryController');

// Skeet routes
router.get('/', skeetController.getSkeets);
router.post('/', skeetController.createSkeet);
router.patch('/:id', skeetController.updateSkeet);
router.delete('/:id', skeetController.deleteSkeet);
router.post('/:id/retract', skeetController.retractSkeet);
router.post('/:id/restore', skeetController.restoreSkeet);
router.post('/:id/publish-now', skeetController.publishNow);
router.get('/:id/history', skeetHistoryController.getSkeetHistory);

// Skeet media
router.post('/:id/media', uploadMiddleware, addSkeetMedia);

// Import/Export
router.get('/export', importExportController.exportPlannedSkeets);
router.post('/import', importExportController.importPlannedSkeets);

module.exports = router;
