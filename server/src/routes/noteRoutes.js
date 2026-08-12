const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { sandboxGuard } = require('../middlewares/sandboxGuard');

// Routes mapping
router.get('/tree', noteController.getTree);
router.get('/file', sandboxGuard, noteController.getFile);
router.post('/file', sandboxGuard, noteController.saveFile);
router.post('/create', sandboxGuard, noteController.createItem);
router.put('/rename', sandboxGuard, noteController.renameItem);
router.delete('/file', sandboxGuard, noteController.deleteItem);

// New Feature: Full-text & Tag Search API
router.get('/search', noteController.searchNotes);

module.exports = router;
