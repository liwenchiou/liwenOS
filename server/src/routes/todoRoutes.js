const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');

router.get('/', (req, res, next) => todoController.getTodos(req, res, next));
router.post('/', (req, res, next) => todoController.addTodo(req, res, next));
router.patch('/:id', (req, res, next) => todoController.toggleTodo(req, res, next));
router.delete('/:id', (req, res, next) => todoController.deleteTodo(req, res, next));

module.exports = router;
