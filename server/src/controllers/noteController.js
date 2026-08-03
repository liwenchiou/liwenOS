const noteService = require('../services/noteService');
const { successResponse, errorResponse } = require('../utils/response');

class NoteController {
  async getTree(req, res, next) {
    try {
      const tree = await noteService.getTree();
      return successResponse(res, { tree }, 'File tree retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getFile(req, res, next) {
    try {
      const { relPath } = req.query;
      if (!relPath) return errorResponse(res, 'Missing relPath parameter', 400);

      const content = await noteService.getFile(relPath);
      return successResponse(res, { path: relPath, content }, 'File content retrieved');
    } catch (err) {
      next(err);
    }
  }

  async saveFile(req, res, next) {
    try {
      const { relPath, content } = req.body;
      if (!relPath) return errorResponse(res, 'Missing relPath', 400);

      await noteService.saveFile(relPath, content);
      return successResponse(res, { path: relPath }, 'File saved successfully');
    } catch (err) {
      next(err);
    }
  }

  async createItem(req, res, next) {
    try {
      const { relPath, isDirectory } = req.body;
      if (!relPath) return errorResponse(res, 'Missing relPath', 400);

      await noteService.createItem(relPath, isDirectory);
      return successResponse(res, { path: relPath }, 'Created successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const { relPath } = req.query;
      if (!relPath) return errorResponse(res, 'Missing relPath', 400);

      await noteService.deleteItem(relPath);
      return successResponse(res, { path: relPath }, 'Deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // Feature: Search API
  async searchNotes(req, res, next) {
    try {
      const { q } = req.query;
      const results = await noteService.searchNotes(q);
      return successResponse(res, { query: q || '', totalMatches: results.length, results }, 'Search completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NoteController();
