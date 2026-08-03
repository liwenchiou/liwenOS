const todoService = require('../services/todoService');
const { successResponse } = require('../utils/response');

class TodoController {
  async getTodos(req, res, next) {
    try {
      const todos = await todoService.getTodos();
      return successResponse(res, todos, '成功取得 Google Sheet 待辦事項清單');
    } catch (err) {
      next(err);
    }
  }

  async addTodo(req, res, next) {
    try {
      const { text } = req.body;
      const result = await todoService.addTodo(text);
      return successResponse(res, result, '成功新增待辦事項至 Google Sheet', 201);
    } catch (err) {
      next(err);
    }
  }

  async toggleTodo(req, res, next) {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      const result = await todoService.toggleTodo(parseInt(id, 10), completed);
      return successResponse(res, result, '成功更新 Google Sheet 待辦事項狀態');
    } catch (err) {
      next(err);
    }
  }

  async deleteTodo(req, res, next) {
    try {
      const { id } = req.params;
      const result = await todoService.deleteTodo(parseInt(id, 10));
      return successResponse(res, result, '成功從 Google Sheet 刪除待辦事項');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TodoController();
