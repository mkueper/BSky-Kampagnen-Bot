const express = require('express');
const authController = require('@api/controllers/authController');

const router = express.Router();

router.get('/session', authController.session);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/renew', authController.renew);

module.exports = router;
