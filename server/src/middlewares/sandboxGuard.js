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
  const pathsToCheck = [
    req.query.relPath || req.body.relPath,
    req.body.oldPath,
    req.body.newPath
  ].filter(Boolean);

  if (pathsToCheck.length > 0) {
    const baseDir = getNotesBaseDir();
    for (const p of pathsToCheck) {
      const targetPath = path.resolve(baseDir, p);
      if (!targetPath.startsWith(baseDir)) {
        return errorResponse(res, 'Access denied: Target path outside notes directory', 403);
      }
    }
  }

  next();
}

module.exports = {
  sandboxGuard,
  getNotesBaseDir
};
