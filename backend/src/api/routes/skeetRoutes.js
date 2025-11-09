const express = require('express');
const router = express.Router();
const skeetController = require('@api/controllers/skeetController');
const importExportController = require('@api/controllers/importExportController');
const mediaController = require('@api/controllers/mediaController');

// Skeet routes
router.get('/', skeetController.getSkeets);
router.post('/', skeetController.createSkeet);
router.patch('/:id', skeetController.updateSkeet);
router.delete('/:id', skeetController.deleteSkeet);
router.post('/:id/retract', skeetController.retractSkeet);
router.post('/:id/restore', skeetController.restoreSkeet);
router.post('/:id/publish-now', skeetController.publishNow);

// Skeet media
router.post('/:id/media', mediaController.addSkeetMedia);

// Import/Export
router.get('/export', importExportController.exportPlannedSkeets);
router.post('/import', importExportController.importPlannedSkeets);

module.exports = router;
