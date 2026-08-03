const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

router.get('/auth-url', calendarController.getAuthUrl);
router.get('/auth/callback', calendarController.handleOAuthCallback);
router.get('/events', calendarController.getEvents);
router.post('/events', calendarController.createEvent);

module.exports = router;
