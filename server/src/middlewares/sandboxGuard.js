const path = require('path');
const { errorResponse } = require('../utils/response');

// Resolve root notes directory (Fixed absolute path to project root/notes regardless of process.cwd)
const getNotesBaseDir = () => {
  return path.resolve(__dirname, '../../../notes');
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
