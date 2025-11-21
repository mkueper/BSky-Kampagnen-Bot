const express = require('express');
const router = express.Router();
const threadController = require('@api/controllers/threadController');
const importExportController = require('@api/controllers/importExportController');
const { addMedia, uploadMiddleware } = require('@api/controllers/mediaController');

router.get('/export', importExportController.exportThreads);
router.get('/', threadController.listThreads);
router.get('/:id', threadController.getThread);
router.post('/', threadController.createThread);
router.patch('/:id', threadController.updateThread);
router.delete('/:id', threadController.deleteThread);
router.post('/:id/retract', threadController.retractThread);
router.post('/:id/restore', threadController.restoreThread);
router.post('/:id/publish-now', threadController.publishNow);
router.post('/:id/engagement/refresh', threadController.refreshEngagement);
router.post('/engagement/refresh-all', threadController.refreshAllEngagement);
router.post('/import', importExportController.importThreads);

// Media for thread segments
router.post('/:id/segments/:sequence/media', uploadMiddleware, addMedia);

module.exports = router;
