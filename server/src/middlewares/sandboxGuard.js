const path = require('path');
const { errorResponse } = require('../utils/response');

// Resolve root notes directory
const getNotesBaseDir = () => {
  const dir = process.env.NOTES_DIR || path.join(__dirname, '../../../notes');
  return path.resolve(dir);
};

/**
 * Middleware: CWE-22 Path Traversal Sandbox Guard
 */
function sandboxGuard(req, res, next) {
  const relPath = req.query.relPath || req.body.relPath;
  
  if (relPath) {
    const baseDir = getNotesBaseDir();
    const targetPath = path.resolve(baseDir, relPath);

    if (!targetPath.startsWith(baseDir)) {
      return errorResponse(res, 'Access denied: Target path outside notes directory', 403);
    }
  }

  next();
}

module.exports = {
  sandboxGuard,
  getNotesBaseDir
};
